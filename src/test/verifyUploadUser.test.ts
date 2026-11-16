import { describe, it, expect, vi } from 'vitest';
import { verifySupabaseUser } from '../lib/upload/verifyUser';

const USER_ID = '3f1c2b7a-9d4e-4a6b-8c2d-1e2f3a4b5c6d';

function fakeClientFactory(opts: {
  user?: { id: string } | null;
  userError?: unknown;
  isAdmin?: unknown;
  rpcError?: unknown;
}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.user ?? null },
    error: opts.userError ?? null,
  });
  const rpc = vi.fn().mockResolvedValue({ data: opts.isAdmin ?? null, error: opts.rpcError ?? null });
  const factory = vi.fn().mockReturnValue({ auth: { getUser }, rpc });
  return { factory, getUser, rpc };
}

const config = { supabaseUrl: 'https://proj.supabase.co', anonKey: 'anon' };

describe('verifySupabaseUser', () => {
  it('validates the JWT with Supabase and checks is_admin() as that user', async () => {
    const { factory, getUser, rpc } = fakeClientFactory({ user: { id: USER_ID }, isAdmin: true });
    const result = await verifySupabaseUser('jwt-token', { ...config, createClientImpl: factory });
    expect(result).toEqual({ userId: USER_ID, isAdmin: true });
    expect(getUser).toHaveBeenCalledWith('jwt-token');
    expect(rpc).toHaveBeenCalledWith('is_admin');
    // The RPC must run with the caller's JWT so auth.uid() is the caller.
    const [, , options] = factory.mock.calls[0];
    expect(options.global.headers.Authorization).toBe('Bearer jwt-token');
    expect(options.auth.persistSession).toBe(false);
  });

  it('returns null for an invalid/expired token', async () => {
    const { factory, rpc } = fakeClientFactory({ user: null, userError: { message: 'invalid JWT' } });
    expect(await verifySupabaseUser('bad', { ...config, createClientImpl: factory })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('treats anything but a literal true from is_admin() as not admin', async () => {
    for (const isAdmin of [false, null, 'true', 1]) {
      const { factory } = fakeClientFactory({ user: { id: USER_ID }, isAdmin });
      const result = await verifySupabaseUser('t', { ...config, createClientImpl: factory });
      expect(result).toEqual({ userId: USER_ID, isAdmin: false });
    }
  });

  it('throws (fails closed) when the is_admin() call errors', async () => {
    const { factory } = fakeClientFactory({ user: { id: USER_ID }, rpcError: { message: 'boom' } });
    await expect(verifySupabaseUser('t', { ...config, createClientImpl: factory })).rejects.toThrow(/is_admin/);
  });
});
