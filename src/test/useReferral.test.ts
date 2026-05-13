import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

type Response = { data?: unknown; error?: unknown; count?: number };

// Per-table FIFO response queue. Each `.from(table)` call shifts one response
// for the chain produced by that call.
let responsesByTable: Map<string, Response[]>;

function buildChain(table: string) {
  const respList = responsesByTable.get(table) ?? [];
  const resp: Response = respList.shift() ?? { data: null, error: null };
  const promise: Promise<Response> = Promise.resolve(resp);
  const handler: ProxyHandler<object> = {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return promise.then.bind(promise);
      if (prop === 'catch') return promise.catch.bind(promise);
      if (prop === 'finally') return promise.finally.bind(promise);
      return () => chain;
    },
  };
  const chain: unknown = new Proxy({}, handler);
  return chain;
}

const fromMock = vi.fn((table: string) => buildChain(table));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

const userRef: { current: { id: string } | null } = { current: { id: 'user-1' } };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: userRef.current }),
}));

import { useReferral, lookupReferralCode } from '../hooks/useReferral';

function queueAll(profile: Response, balance: Response, ledger: Response, withdrawals: Response, orders: Response) {
  // refresh() awaits Promise.all over: user_profiles, user_point_balance, points_ledger, withdrawals, orders
  responsesByTable.set('user_profiles', [profile]);
  responsesByTable.set('user_point_balance', [balance]);
  responsesByTable.set('points_ledger', [ledger]);
  responsesByTable.set('withdrawals', [withdrawals]);
  responsesByTable.set('orders', [orders]);
}

beforeEach(() => {
  responsesByTable = new Map();
  fromMock.mockClear();
  userRef.current = { id: 'user-1' };
});

describe('useReferral', () => {
  it('clears state when no user', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.balance).toBe(0);
    expect(result.current.ledger).toEqual([]);
    expect(result.current.withdrawals).toEqual([]);
  });

  it('loads profile, balance, ledger, withdrawals and hasOrderThisMonth', async () => {
    queueAll(
      { data: { id: 'user-1', referral_code: 'ABC' }, error: null },
      { data: { balance: 1500 }, error: null },
      { data: [{ id: 'l1' }], error: null },
      { data: [{ id: 'w1' }], error: null },
      { data: null, error: null, count: 2 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.referral_code).toBe('ABC');
    expect(result.current.balance).toBe(1500);
    expect(result.current.ledger).toHaveLength(1);
    expect(result.current.withdrawals).toHaveLength(1);
    expect(result.current.hasOrderThisMonth).toBe(true);
  });

  it('hasOrderThisMonth false when count is 0', async () => {
    queueAll(
      { data: { id: 'user-1', referral_code: 'X' }, error: null },
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 0 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasOrderThisMonth).toBe(false);
    expect(result.current.balance).toBe(0);
  });

  it('sets error when a query fails', async () => {
    queueAll(
      { data: null, error: new Error('profile broke') },
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 0 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('profile broke');
  });

  it('requestWithdrawal: not signed in', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 100, method: 'gcash', payout_details: {} })
    );
    expect(res.error).toBe('Not signed in');
  });

  it('requestWithdrawal: rejects amount <= 0', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: { balance: 1000 }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 1 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 0, method: 'gcash', payout_details: {} })
    );
    expect(res.error).toBe('Amount must be greater than 0');
  });

  it('requestWithdrawal: rejects when amount exceeds balance', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: { balance: 50 }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 1 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 1000, method: 'gcash', payout_details: {} })
    );
    expect(res.error).toBe('Amount exceeds your balance');
  });

  it('requestWithdrawal: requires an order this month', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: { balance: 1000 }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 0 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 100, method: 'gcash', payout_details: {} })
    );
    expect(res.error).toMatch(/at least one order/);
  });

  it('requestWithdrawal: success inserts and refreshes', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: { balance: 1000 }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 1 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Queue the insert response on withdrawals, then second refresh responses.
    responsesByTable.set('withdrawals', [{ error: null }]);
    responsesByTable.set('user_profiles', [{ data: { id: 'u', referral_code: 'X' }, error: null }]);
    responsesByTable.set('user_point_balance', [{ data: { balance: 900 }, error: null }]);
    responsesByTable.set('points_ledger', [{ data: [], error: null }]);
    // After insert, refresh() does Promise.all again — need a second withdrawals response
    responsesByTable.get('withdrawals')!.push({ data: [{ id: 'w-new' }], error: null });
    responsesByTable.set('orders', [{ data: null, error: null, count: 1 }]);

    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 100, method: 'gcash', payout_details: { phone: '0917' } })
    );
    expect(res.error).toBeNull();
  });

  it('requestWithdrawal: returns error from supabase insert', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: { balance: 1000 }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 1 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    responsesByTable.set('withdrawals', [{ error: { message: 'db error' } }]);
    const res = await act(async () =>
      result.current.requestWithdrawal({ amount: 100, method: 'gcash', payout_details: {} })
    );
    expect(res.error).toBe('db error');
  });

  it('updateProfile: not signed in', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.updateProfile({ nickname: 'x' }));
    expect(res.error).toBe('Not signed in');
  });

  it('updateProfile: returns error from supabase', async () => {
    queueAll(
      { data: { id: 'u', referral_code: 'X' }, error: null },
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null, count: 0 }
    );
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    responsesByTable.set('user_profiles', [{ error: { message: 'nope' } }]);
    const res = await act(async () => result.current.updateProfile({ nickname: 'x' }));
    expect(res.error).toBe('nope');
  });
});

describe('lookupReferralCode', () => {
  beforeEach(() => {
    responsesByTable = new Map();
    fromMock.mockClear();
  });

  it('returns null for empty/whitespace code', async () => {
    expect(await lookupReferralCode('')).toBeNull();
    expect(await lookupReferralCode('   ')).toBeNull();
  });

  it('returns null when supabase returns error', async () => {
    responsesByTable.set('user_profiles', [{ data: null, error: { message: 'x' } }]);
    expect(await lookupReferralCode('ABC')).toBeNull();
  });

  it('returns null when not found', async () => {
    responsesByTable.set('user_profiles', [{ data: null, error: null }]);
    expect(await lookupReferralCode('ABC')).toBeNull();
  });

  it('returns row data when found', async () => {
    responsesByTable.set('user_profiles', [
      { data: { id: 'u-1', full_name: 'Jane' }, error: null },
    ]);
    const r = await lookupReferralCode('abc ');
    expect(r).toEqual({ id: 'u-1', full_name: 'Jane' });
  });
});
