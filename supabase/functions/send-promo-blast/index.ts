import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chunk, RESEND_BATCH_LIMIT, selectRecipients } from "./lib.ts";

// ─────────────────────────────────────────────────────
// Promo broadcast.
//
// Sends one marketing email to every CONFIRMED signup. Unlike
// send-promo-welcome (single recipient, hardcoded HTML) this takes the HTML in
// the request body, so email-templates/*.html stays the single source of truth
// in the repo instead of being duplicated into the function.
//
// Guards, in order:
//   1. Shared secret — the anon key is public, so JWT alone is not authorisation.
//   2. dryRun — returns the recipient list without sending. Use it first.
//   3. email_broadcast_log — already-sent addresses are skipped, so a retry
//      after a partial failure cannot double-send.
//
// Deploy:  supabase functions deploy send-promo-blast
// Secrets: supabase secrets set BROADCAST_SECRET=<random>
//          (RESEND_API_KEY already exists for send-promo-welcome)
// ─────────────────────────────────────────────────────

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BROADCAST_SECRET = Deno.env.get("BROADCAST_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FROM = "Peptide Lifestyle Program <hello@peptidelifestyleprogram.com>";
const SITE = "https://peptidelifestyleprogram.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Function is not configured" }, 500);
  }

  // The anon key is shipped to every browser, so it proves nothing. Require a
  // secret that only an operator holds before touching the customer list.
  if (!BROADCAST_SECRET || req.headers.get("x-broadcast-secret") !== BROADCAST_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { campaignId?: string; subject?: string; html?: string; dryRun?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const { campaignId, subject, html, dryRun = false } = payload;
  if (!campaignId || !subject || !html) {
    return json({ error: "campaignId, subject and html are all required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // auth.users is only reachable with the service-role key, and only via the
  // admin API — there is no public table mirroring the email column.
  const { data: userPage, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) {
    return json({ error: `Could not list users: ${usersError.message}` }, 500);
  }

  const { data: sentRows, error: logError } = await admin
    .from("email_broadcast_log")
    .select("email")
    .eq("campaign_id", campaignId);
  if (logError) {
    return json({ error: `Could not read send log: ${logError.message}` }, 500);
  }

  const alreadySent = (sentRows ?? []).map((row: { email: string }) => row.email);
  const recipients = selectRecipients(userPage.users, alreadySent);

  if (dryRun) {
    return json({
      dryRun: true,
      campaignId,
      totalUsers: userPage.users.length,
      alreadySent: alreadySent.length,
      wouldSend: recipients.length,
      recipients,
    });
  }

  if (recipients.length === 0) {
    return json({ sent: 0, skipped: alreadySent.length, message: "Nothing left to send" });
  }

  const sent: string[] = [];
  const failures: Array<{ batch: number; error: string }> = [];

  const batches = chunk(recipients, RESEND_BATCH_LIMIT);
  for (const [index, batch] of batches.entries()) {
    // One message per recipient — never a shared To/BCC, which would leak the
    // customer list to everyone on it.
    const body = batch.map((email) => ({
      from: FROM,
      to: [email],
      subject,
      html,
      headers: {
        // Gives Gmail a native one-click unsubscribe. The in-template link is
        // not wired to anything yet, so without this there is no working
        // opt-out at all.
        "List-Unsubscribe": `<${SITE}/unsubscribe?email=${encodeURIComponent(email)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }));

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      failures.push({ batch: index, error: await res.text() });
      continue;
    }

    // Log before moving on, so a later batch failing cannot cause the earlier
    // successes to be resent on retry.
    const { error: insertError } = await admin
      .from("email_broadcast_log")
      .insert(batch.map((email) => ({ campaign_id: campaignId, email })));
    if (insertError) {
      failures.push({ batch: index, error: `Sent but not logged: ${insertError.message}` });
      continue;
    }

    sent.push(...batch);
  }

  return json(
    {
      campaignId,
      sent: sent.length,
      skipped: alreadySent.length,
      failures,
    },
    failures.length > 0 ? 207 : 200
  );
});
