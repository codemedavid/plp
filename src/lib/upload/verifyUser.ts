/**
 * Server-side Supabase session check for api/upload.ts.
 *
 * 1. auth.getUser(token) asks Supabase Auth to validate the JWT (signature,
 *    expiry, revoked session) — a forged or expired token yields no user.
 * 2. rpc('is_admin') runs with the caller's JWT, so auth.uid() inside the
 *    SECURITY DEFINER function is the caller — the same check RLS uses.
 */
import { createClient } from '@supabase/supabase-js';
import type { VerifiedUser } from './handler.js';

interface MinimalSupabaseClient {
  auth: {
    getUser: (jwt: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
  rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }>;
}

type ClientFactory = (url: string, key: string, options: Record<string, unknown>) => MinimalSupabaseClient;

export interface VerifyUserConfig {
  supabaseUrl: string;
  anonKey: string;
  createClientImpl?: ClientFactory;
}

const defaultFactory = createClient as unknown as ClientFactory;

export async function verifySupabaseUser(
  token: string,
  { supabaseUrl, anonKey, createClientImpl = defaultFactory }: VerifyUserConfig,
): Promise<VerifiedUser | null> {
  const client = createClientImpl(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: isAdmin, error: rpcError } = await client.rpc('is_admin');
  if (rpcError) {
    const message =
      rpcError && typeof rpcError === 'object' && 'message' in rpcError ? String(rpcError.message) : 'unknown';
    throw new Error(`is_admin() check failed: ${message}`);
  }

  return { userId: data.user.id, isAdmin: isAdmin === true };
}
