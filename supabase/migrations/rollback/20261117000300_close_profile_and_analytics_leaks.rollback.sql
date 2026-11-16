-- ROLLBACK for 20261117000300_close_profile_and_analytics_leaks.sql
-- WARNING: re-opens customer PII and protocol writes to anonymous users.
CREATE POLICY up_select_by_code ON public.user_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS protocols_admin_all ON public.protocols;
CREATE POLICY "Admins can manage protocols" ON public.protocols FOR ALL TO public USING (true);

GRANT SELECT ON public.user_point_balance,
                public.v_customer_ltv,
                public.v_funnel,
                public.v_net_profit_monthly,
                public.v_network_levels,
                public.v_points_liability,
                public.v_product_profit,
                public.v_referral_payout_detail,
                public.v_referral_payouts_monthly,
                public.v_referrer_stats,
                public.v_sales_daily
  TO anon;
