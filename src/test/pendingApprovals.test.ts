import { describe, it, expect } from 'vitest';
import { groupPendingByUser, type PendingLedgerRow, type PendingProfile } from '../utils/pendingApprovals';

const profiles: PendingProfile[] = [
  { id: 'u-1', full_name: 'Jane Doe', nickname: 'Janey', referral_code: 'ALPHA', email: 'jane@example.com', frozen: false },
  { id: 'u-2', full_name: 'Bob Smith', nickname: null, referral_code: 'BETA', email: 'bob@example.com', frozen: true },
];

function row(over: Partial<PendingLedgerRow>): PendingLedgerRow {
  return {
    id: 'l-x',
    user_id: 'u-1',
    delta: 500,
    reason: 'referral_l1',
    period_month: '2026-06-01',
    notes: null,
    created_at: '2026-06-15T00:00:00Z',
    ...over,
  };
}

describe('groupPendingByUser', () => {
  it('returns an empty array when there are no pending rows', () => {
    expect(groupPendingByUser([], profiles)).toEqual([]);
  });

  it('groups pending rows by user and sums positive deltas', () => {
    const rows = [
      row({ id: 'l-1', user_id: 'u-1', delta: 500 }),
      row({ id: 'l-2', user_id: 'u-1', delta: 150 }),
      row({ id: 'l-3', user_id: 'u-2', delta: 300 }),
    ];
    const groups = groupPendingByUser(rows, profiles);
    expect(groups).toHaveLength(2);
    const jane = groups.find(g => g.userId === 'u-1')!;
    expect(jane.totalPending).toBe(650);
    expect(jane.entryCount).toBe(2);
  });

  it('ignores non-positive deltas in the total but still lists the user', () => {
    const rows = [
      row({ id: 'l-1', user_id: 'u-1', delta: 500 }),
      row({ id: 'l-2', user_id: 'u-1', delta: -100 }),
    ];
    const jane = groupPendingByUser(rows, profiles).find(g => g.userId === 'u-1')!;
    expect(jane.totalPending).toBe(500);
  });

  it('resolves display name as nickname, then full name, then email, then short id', () => {
    const rows = [
      row({ id: 'l-1', user_id: 'u-1' }),
      row({ id: 'l-2', user_id: 'u-2' }),
      row({ id: 'l-3', user_id: 'u-3' }),
    ];
    const groups = groupPendingByUser(rows, profiles);
    expect(groups.find(g => g.userId === 'u-1')!.name).toBe('Janey');
    expect(groups.find(g => g.userId === 'u-2')!.name).toBe('Bob Smith');
    // Unknown user falls back to a short id label
    expect(groups.find(g => g.userId === 'u-3')!.name).toContain('u-3');
  });

  it('carries the frozen flag from the profile', () => {
    const rows = [row({ id: 'l-1', user_id: 'u-2', delta: 300 })];
    const bob = groupPendingByUser(rows, profiles).find(g => g.userId === 'u-2')!;
    expect(bob.frozen).toBe(true);
  });

  it('sorts groups by total pending descending', () => {
    const rows = [
      row({ id: 'l-1', user_id: 'u-1', delta: 100 }),
      row({ id: 'l-2', user_id: 'u-2', delta: 900 }),
    ];
    const groups = groupPendingByUser(rows, profiles);
    expect(groups.map(g => g.userId)).toEqual(['u-2', 'u-1']);
  });
});
