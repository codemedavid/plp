// Aggregation helpers for the admin "Pending Approvals" queue.
//
// Referral payouts land in points_ledger with status='pending'. Admins approve
// them (fast-track the wait) via the admin_approve_pending_points RPC. These pure
// helpers turn the raw pending rows + profile lookups into a per-user queue the
// admin UI can render and act on.

export interface PendingLedgerRow {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  period_month: string | null;
  notes: string | null;
  created_at: string;
}

export interface PendingProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  referral_code: string | null;
  email: string | null;
  frozen: boolean;
}

export interface PendingUserGroup {
  userId: string;
  name: string;
  referralCode: string | null;
  email: string | null;
  frozen: boolean;
  totalPending: number;
  entryCount: number;
  entries: PendingLedgerRow[];
}

function resolveName(profile: PendingProfile | undefined, userId: string): string {
  const label = profile?.nickname || profile?.full_name || profile?.email;
  return label ?? `User ${userId.slice(0, 8)}`;
}

/**
 * Group pending ledger rows by user, summing positive deltas into a peso total.
 * Rows for a user with only non-positive deltas still appear (total 0). Groups
 * are sorted by pending total descending, then name ascending.
 */
export function groupPendingByUser(
  rows: PendingLedgerRow[],
  profiles: PendingProfile[]
): PendingUserGroup[] {
  const profileById = new Map(profiles.map(p => [p.id, p]));
  const byUser = new Map<string, PendingLedgerRow[]>();

  for (const row of rows) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row);
    else byUser.set(row.user_id, [row]);
  }

  const groups: PendingUserGroup[] = [];
  for (const [userId, entries] of byUser) {
    const profile = profileById.get(userId);
    const totalPending = entries.reduce((sum, r) => (r.delta > 0 ? sum + r.delta : sum), 0);
    groups.push({
      userId,
      name: resolveName(profile, userId),
      referralCode: profile?.referral_code ?? null,
      email: profile?.email ?? null,
      frozen: profile?.frozen ?? false,
      totalPending,
      entryCount: entries.length,
      entries,
    });
  }

  return groups.sort((a, b) =>
    b.totalPending - a.totalPending || a.name.localeCompare(b.name)
  );
}
