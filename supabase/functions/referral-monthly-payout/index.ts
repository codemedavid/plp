// Monthly referral payout job.
//
// Run on the 1st of each month (e.g. via Supabase Scheduled Functions / pg_cron / external cron).
//
// For each completed, non-refunded, referral-qualifying order in the previous calendar month:
//   - find the placing user's profile
//   - walk up the referral tree (referred_by) up to 3 levels
//   - credit L1=cfg.l1_points, L2=cfg.l2_points, L3=cfg.l3_points * 1 (per order) to each ancestor
//
// Idempotent: points_ledger has a unique index on (user_id, source_referral_invitee_id, reason, period_month).
// We use period_month = first-of-prior-month. Re-running the same period is safe but emits ledger
// entries per-invitee, not per-order — so to handle multiple orders/month we use one ledger row
// per (inviter, invitee, level, month) with delta = order_count * tier_points.
//
// Manual trigger:  POST /referral-monthly-payout            -> processes prior calendar month
//                  POST /referral-monthly-payout?month=YYYY-MM-01 -> processes given month
// Auth: requires SERVICE_ROLE key in Authorization: Bearer <key>.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function firstOfPrevMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}
function firstOfThisMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface PayoutReport {
  period_month: string;
  inviters_credited: number;
  ledger_entries_written: number;
  qualifying_orders: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");
    const start = monthParam ? new Date(`${monthParam}T00:00:00Z`) : firstOfPrevMonthUTC();
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const periodMonth = isoDate(start);

    // 1. Load config
    const { data: cfg, error: cfgErr } = await supabase
      .from("referral_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (cfgErr || !cfg) throw new Error(`config load failed: ${cfgErr?.message}`);
    if (!cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "program disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Pull qualifying orders for the period
    // Qualifying: completed/delivered + not refunded + referral_qualifying=true + user_id present
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, user_id, created_at, order_status, payment_status, referral_qualifying")
      .eq("referral_qualifying", true)
      .in("order_status", ["delivered", "completed"])
      .not("user_id", "is", null)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if (oErr) throw new Error(`orders fetch failed: ${oErr.message}`);

    const report: PayoutReport = {
      period_month: periodMonth,
      inviters_credited: 0,
      ledger_entries_written: 0,
      qualifying_orders: orders?.length ?? 0,
      errors: [],
    };

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Count qualifying orders per invitee
    const orderCountByInvitee = new Map<string, number>();
    for (const o of orders) {
      orderCountByInvitee.set(o.user_id, (orderCountByInvitee.get(o.user_id) ?? 0) + 1);
    }

    // 4. For each invitee, walk up the referral tree (max 3 levels) and credit
    const inviterIds = new Set<string>();
    const ledgerRows: Record<string, unknown>[] = [];

    for (const [inviteeId, orderCount] of orderCountByInvitee) {
      // Walk up to 3 ancestors
      let current = inviteeId;
      const tierPoints = [cfg.l1_points, cfg.l2_points, cfg.l3_points];
      for (let level = 1; level <= 3; level++) {
        const { data: row, error } = await supabase
          .from("user_profiles")
          .select("referred_by, frozen")
          .eq("id", current)
          .maybeSingle();
        if (error || !row || !row.referred_by) break;
        if (row.frozen) {
          current = row.referred_by;
          continue;
        }
        const ancestorId = row.referred_by as string;
        // Self-referral guard
        if (ancestorId === inviteeId) break;

        const delta = orderCount * tierPoints[level - 1];
        if (delta > 0) {
          ledgerRows.push({
            user_id: ancestorId,
            delta,
            reason: `referral_l${level}`,
            source_referral_invitee_id: inviteeId,
            period_month: periodMonth,
            notes: `${orderCount} qualifying order(s)`,
          });
          inviterIds.add(ancestorId);
        }
        current = ancestorId;
      }
    }

    // 5. Bulk insert (idempotent via unique index)
    if (ledgerRows.length > 0) {
      const { error: insErr, count } = await supabase
        .from("points_ledger")
        .upsert(ledgerRows, {
          onConflict: "user_id,source_referral_invitee_id,reason,period_month",
          ignoreDuplicates: true,
          count: "exact",
        });
      if (insErr) report.errors.push(`ledger insert: ${insErr.message}`);
      report.ledger_entries_written = count ?? ledgerRows.length;
    }
    report.inviters_credited = inviterIds.size;

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
