import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Chainable query builder mock. Each terminal method (the awaited result) is
// configured per-call via the `responses` array; intermediate methods return
// `this`. The hook code awaits these chains directly (no .then on .eq calls
// where there's an order/limit). Our builder is both chainable and thenable.

type Response = { data?: unknown; error?: unknown; count?: number };

let responsesByTable: Map<string, Response[]>;

function buildChain(table: string) {
  const respList = responsesByTable.get(table) ?? [];
  const resp: Response = respList.shift() ?? { data: null, error: null };

  const promise: Promise<Response> = Promise.resolve(resp);
  // Build a Proxy that:
  // - if the property is a known terminal/thenable accessor, behaves as a promise
  // - otherwise returns itself (chainable)
  const handler: ProxyHandler<object> = {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return promise.then.bind(promise);
      if (prop === 'catch') return promise.catch.bind(promise);
      if (prop === 'finally') return promise.finally.bind(promise);
      // Any other method call -> return same proxy (chainable)
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
  },
}));

// Mock useAuth
const userRef: { current: { id: string } | null } = { current: { id: 'user-1' } };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: userRef.current }),
}));

import { useAddresses, type UserAddress } from '../hooks/useAddresses';

const sampleAddress: UserAddress = {
  id: 'addr-1',
  user_id: 'user-1',
  label: 'Home',
  recipient_name: 'Jane Doe',
  phone: '09171234567',
  address: '1 Main St',
  barangay: 'Bgy 1',
  city: 'Manila',
  state: 'NCR',
  zip_code: '1000',
  is_primary: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

beforeEach(() => {
  responsesByTable = new Map();
  fromMock.mockClear();
  userRef.current = { id: 'user-1' };
});

function queue(table: string, ...responses: Response[]) {
  if (!responsesByTable.has(table)) responsesByTable.set(table, []);
  responsesByTable.get(table)!.push(...responses);
}

describe('useAddresses', () => {
  it('returns empty addresses when no user', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.addresses).toEqual([]);
    expect(result.current.primary).toBeNull();
  });

  it('loads addresses on mount', async () => {
    queue('user_addresses', { data: [sampleAddress], error: null });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].id).toBe('addr-1');
    expect(result.current.primary?.id).toBe('addr-1');
  });

  it('captures error from supabase', async () => {
    queue('user_addresses', { data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('falls back to first address when no primary set', async () => {
    const a = { ...sampleAddress, id: 'a1', is_primary: false };
    const b = { ...sampleAddress, id: 'a2', is_primary: false };
    queue('user_addresses', { data: [a, b], error: null });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.primary?.id).toBe('a1');
  });

  it('addAddress returns error when not signed in', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.addAddress({
        recipient_name: 'X', phone: '', address: '', barangay: '', city: '', state: '', zip_code: '',
      })
    );
    expect(res.error).toBe('Not signed in');
  });

  it('addAddress inserts and refreshes', async () => {
    queue('user_addresses', { data: [], error: null }); // initial refresh
    queue('user_addresses', { data: sampleAddress, error: null }); // insert .select().single()
    queue('user_addresses', { data: [sampleAddress], error: null }); // refresh after insert
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.addAddress({
        recipient_name: 'Jane', phone: '0917', address: '1 Main', barangay: 'b', city: 'M', state: 'NCR', zip_code: '1000',
      })
    );
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe('addr-1');
    await waitFor(() => expect(result.current.addresses).toHaveLength(1));
  });

  it('addAddress returns error string on insert failure', async () => {
    queue('user_addresses', { data: [], error: null });
    queue('user_addresses', { data: null, error: { message: 'insert failed' } });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () =>
      result.current.addAddress({
        recipient_name: 'X', phone: '', address: '', barangay: '', city: '', state: '', zip_code: '',
      })
    );
    expect(res.error).toBe('insert failed');
    expect(res.data).toBeNull();
  });

  it('updateAddress returns error when not signed in', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.updateAddress('id', { label: 'x' }));
    expect(res.error).toBe('Not signed in');
  });

  it('updateAddress returns error string on failure', async () => {
    queue('user_addresses', { data: [], error: null });
    queue('user_addresses', { error: { message: 'nope' } });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.updateAddress('id', { label: 'x' }));
    expect(res.error).toBe('nope');
  });

  it('deleteAddress returns error when not signed in', async () => {
    userRef.current = null;
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.deleteAddress('id'));
    expect(res.error).toBe('Not signed in');
  });

  it('deleteAddress promotes new primary when primary is deleted', async () => {
    const primary = { ...sampleAddress, id: 'p1', is_primary: true };
    const other = { ...sampleAddress, id: 'p2', is_primary: false };
    queue('user_addresses',
      { data: [primary, other], error: null }, // initial refresh
      { error: null },                         // delete
      { error: null },                         // promote update
      { data: [other], error: null }           // refresh after delete
    );
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.deleteAddress('p1'));
    expect(res.error).toBeNull();
    // 4 calls: initial select, delete, update (promote), refresh select
    expect(fromMock).toHaveBeenCalledTimes(4);
  });

  it('setPrimary returns error string on failure', async () => {
    queue('user_addresses', { data: [sampleAddress], error: null });
    queue('user_addresses', { error: { message: 'cannot' } });
    const { result } = renderHook(() => useAddresses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await act(async () => result.current.setPrimary('addr-1'));
    expect(res.error).toBe('cannot');
  });
});
