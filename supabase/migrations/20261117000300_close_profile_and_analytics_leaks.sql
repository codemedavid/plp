-- ============================================================================
-- Close anonymous PII / write leaks found during the Phase 0 inventory.
-- All changes are compatible with the code at git HEAD (verified by grep of
-- every user_profiles / protocols / view access in src/ and api/).
--
-- 1. user_profiles.up_select_by_code was USING (true): anyone with the anon
--    key could list every customer's email, phone, address and role
--    (21 rows readable at time of writing). Own-row and admin reads remain via
--    up_select_own / user_profiles_self_select. The only code that read other
--    users' rows by referral code (lookupReferralCode in useReferral.ts) has no
--    callers; signup referral attribution runs inside handle_new_user()
--    (SECURITY DEFINER) and is unaffected.
--
-- 2. protocols."Admins can manage protocols" was FOR ALL USING (true) for
--    role public, i.e. anyone could insert/update/delete protocols. Replaced by
--    an is_admin() policy. "Public can read active protocols" is kept.
--
-- 3. The analytics views (SECURITY DEFINER, bypass RLS) and user_point_balance
--    were selectable by anon, exposing order revenue, customer LTV (names /
--    emails) and every user's point balance. They are only read by admin
--    screens and by signed-in customers (own balance), so revoke anon only.
--    (Phase 2 switches them to security_invoker once orders has RLS.)
--
-- Rollback: supabase/migrations/rollback/20261117000300_close_profile_and_analytics_leaks.rollback.sql
-- ============================================================================

DROP POLICY IF EXISTS up_select_by_code ON public.user_profiles;

DROP POLICY IF EXISTS "Admins can manage protocols" ON public.protocols;
DROP POLICY IF EXISTS protocols_admin_all ON public.protocols;
CREATE POLICY protocols_admin_all ON public.protocols
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

REVOKE SELECT ON public.user_point_balance,
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
  FROM anon;
