import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  referral_code: string;
  referred_by: string | null;
  full_name: string | null;
  phone: string | null;
  nickname: string | null;
  address: string | null;
  avatar_url: string | null;
  email: string | null;
  facebook: string | null;
  frozen: boolean;
}

export interface UpdateProfileInput {
  nickname?: string | null;
  address?: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  facebook?: string | null;
}

export interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  source_order_id: string | null;
  period_month: string | null;
  notes: string | null;
  created_at: string;
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  method: 'gcash' | 'bank' | 'store_credit';
  payout_details: Record<string, string>;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  admin_note: string | null;
  payout_reference: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface WithdrawRequest {
  amount: number;
  method: WithdrawalRow['method'];
  payout_details: Record<string, string>;
}

export function useReferral() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [hasOrderThisMonth, setHasOrderThisMonth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setBalance(0);
      setLedger([]);
      setWithdrawals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profileRes, balanceRes, ledgerRes, withdrawalsRes, orderRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_point_balance').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('points_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', firstOfMonthIso()),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data as UserProfile | null);
      setBalance(((balanceRes.data as { balance: number } | null)?.balance) ?? 0);
      setLedger((ledgerRes.data as LedgerEntry[]) ?? []);
      setWithdrawals((withdrawalsRes.data as WithdrawalRow[]) ?? []);
      setHasOrderThisMonth((orderRes.count ?? 0) > 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestWithdrawal = useCallback(
    async (req: WithdrawRequest): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' };
      if (req.amount <= 0) return { error: 'Amount must be greater than 0' };
      if (req.amount > balance) return { error: 'Amount exceeds your balance' };
      if (!hasOrderThisMonth) {
        return { error: 'You must place at least one order this month to withdraw' };
      }
      const { error } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount: req.amount,
        method: req.method,
        payout_details: req.payout_details,
      });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [user, balance, hasOrderThisMonth, refresh]
  );

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  return {
    profile,
    balance,
    ledger,
    withdrawals,
    hasOrderThisMonth,
    loading,
    error,
    refresh,
    requestWithdrawal,
    updateProfile,
  };
}

function firstOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// Look up a referral code (for inviter signup form preview)
export async function lookupReferralCode(code: string): Promise<{ id: string; full_name: string | null } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('referral_code', normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
