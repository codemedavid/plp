import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface DateRange {
  from: string; // ISO date, inclusive
  to: string;   // ISO date, inclusive
}

export interface SalesDay {
  day: string;
  orders_count: number;
  gross_revenue: number;
  total_cost: number;
  points_redeemed: number;
  net_revenue: number;
  aov: number;
}

export interface NetProfitMonth {
  month: string;
  gross_revenue: number;
  net_revenue: number;
  total_cost: number;
  points_redeemed: number;
  orders_count: number;
  referral_payout: number;
  net_profit: number;
}

export interface PointsLiability {
  points_issued: number;
  points_redeemed: number;
  outstanding: number;
  burn_ratio: number;
}

export interface ProductProfit {
  product_id: string;
  product_name: string;
  units_sold: number;
  gross_revenue: number;
  total_cost: number;
  referral_payout: number;
  real_profit: number;
}

export interface ReferrerStat {
  inviter_id: string;
  referral_code: string;
  full_name: string | null;
  direct_invitees: number;
  total_network: number;
  network_orders: number;
  network_revenue: number;
  points_earned: number;
  roi: number;
}

export interface NetworkLevel {
  inviter_id: string;
  level: 1 | 2 | 3;
  invitees: number;
  orders: number;
  revenue: number;
  points_paid: number;
}

export interface Funnel {
  signups: number;
  referred_signups: number;
  signups_with_order: number;
  referred_with_order: number;
  repeat_buyers: number;
}

export interface CustomerLTV {
  user_id: string;
  referral_code: string;
  full_name: string | null;
  phone: string | null;
  is_referred: boolean;
  orders: number;
  gross_spent: number;
  points_redeemed: number;
  points_earned: number;
  first_order_at: string | null;
  last_order_at: string | null;
  signed_up_at: string;
}

export interface PayoutDetail {
  inviter_id: string;
  invitee_id: string | null;
  reason: 'referral_l1' | 'referral_l2' | 'referral_l3';
  level: 1 | 2 | 3;
  month: string | null;
  points: number;
}

export interface ReferralConfig {
  l1_points: number;
  l2_points: number;
  l3_points: number;
  enabled: boolean;
}

export function useAnalytics(range: DateRange) {
  const [sales, setSales] = useState<SalesDay[]>([]);
  const [profitMonthly, setProfitMonthly] = useState<NetProfitMonth[]>([]);
  const [liability, setLiability] = useState<PointsLiability | null>(null);
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
  const [networkLevels, setNetworkLevels] = useState<NetworkLevel[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [customers, setCustomers] = useState<CustomerLTV[]>([]);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetail[]>([]);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        salesRes,
        profitRes,
        liabRes,
        prodRes,
        refRes,
        netRes,
        funnelRes,
        custRes,
        payRes,
        cfgRes,
      ] = await Promise.all([
        supabase
          .from('v_sales_daily')
          .select('*')
          .gte('day', range.from)
          .lte('day', range.to)
          .order('day', { ascending: true }),
        supabase
          .from('v_net_profit_monthly')
          .select('*')
          .gte('month', firstOfMonth(range.from))
          .lte('month', firstOfMonth(range.to))
          .order('month', { ascending: true }),
        supabase.from('v_points_liability').select('*').maybeSingle(),
        supabase
          .from('v_product_profit')
          .select('*')
          .order('real_profit', { ascending: false }),
        supabase
          .from('v_referrer_stats')
          .select('*')
          .order('network_revenue', { ascending: false })
          .limit(100),
        supabase.from('v_network_levels').select('*'),
        supabase.from('v_funnel').select('*').maybeSingle(),
        supabase
          .from('v_customer_ltv')
          .select('*')
          .order('gross_spent', { ascending: false })
          .limit(500),
        supabase.from('v_referral_payout_detail').select('*'),
        supabase.from('referral_config').select('*').maybeSingle(),
      ]);
      if (salesRes.error) throw salesRes.error;
      if (profitRes.error) throw profitRes.error;
      if (liabRes.error) throw liabRes.error;
      if (prodRes.error) throw prodRes.error;
      if (refRes.error) throw refRes.error;
      if (netRes.error) throw netRes.error;
      if (funnelRes.error) throw funnelRes.error;
      if (custRes.error) throw custRes.error;
      if (payRes.error) throw payRes.error;
      if (cfgRes.error) throw cfgRes.error;
      setSales((salesRes.data ?? []) as SalesDay[]);
      setProfitMonthly((profitRes.data ?? []) as NetProfitMonth[]);
      setLiability((liabRes.data ?? null) as PointsLiability | null);
      setProducts((prodRes.data ?? []) as ProductProfit[]);
      setReferrers((refRes.data ?? []) as ReferrerStat[]);
      setNetworkLevels((netRes.data ?? []) as NetworkLevel[]);
      setFunnel((funnelRes.data ?? null) as Funnel | null);
      setCustomers((custRes.data ?? []) as CustomerLTV[]);
      setPayoutDetails((payRes.data ?? []) as PayoutDetail[]);
      setConfig((cfgRes.data ?? null) as ReferralConfig | null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    sales,
    profitMonthly,
    liability,
    products,
    referrers,
    networkLevels,
    funnel,
    customers,
    payoutDetails,
    config,
    loading,
    error,
    refresh: load,
  };
}

function firstOfMonth(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function defaultRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function formatPeso(n: number): string {
  return '₱' + (n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

export function formatPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}
