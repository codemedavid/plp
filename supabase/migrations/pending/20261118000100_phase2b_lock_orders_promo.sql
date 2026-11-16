-- ============================================================================
-- PHASE 2b (NOT YET APPLIED) -- lock down orders and promo_codes.
--
-- !! Apply ONLY after phase 2a is applied AND the new client code (which
-- !! creates orders via place_order(), validates promos via
-- !! validate_promo_code() and tracks guest orders via track_order()) is live.
-- !! The git-HEAD client does orders.insert(...).select(), a client-side
-- !! orders.delete() and promo_codes.select(): all three stop working here.
--
-- After this migration:
--   orders       anon: no direct access at all (create via place_order RPC,
--                track via track_order RPC).
--                signed-in customer: SELECT own rows (OrderTracking "My
--                orders", useReferral monthly count). No insert/update/delete.
--                admin (is_admin()): full access (OrdersManager, analytics,
--                inventory, user lookup).
--   promo_codes  admin only. Checkout uses validate_promo_code().
--   RPCs         increment_promo_usage / get_order_details(*) revoked from
--                clients (replaced by place_order / track_order).
--   Views        analytics views + user_point_balance switch to
--                security_invoker so they obey the caller's RLS (admin sees
--                all; a customer sees only their own balance).
--
-- Rollback: supabase/migrations/rollback/20261118000100_phase2b_lock_orders_promo.rollback.sql
-- ============================================================================

-- ---------------------------------------------------------------- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS orders_admin_insert ON public.orders;
CREATE POLICY orders_admin_insert ON public.orders
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS orders_admin_delete ON public.orders;
CREATE POLICY orders_admin_delete ON public.orders
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_codes_admin_select ON public.promo_codes;
CREATE POLICY promo_codes_admin_select ON public.promo_codes
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS promo_codes_admin_insert ON public.promo_codes;
CREATE POLICY promo_codes_admin_insert ON public.promo_codes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS promo_codes_admin_update ON public.promo_codes;
CREATE POLICY promo_codes_admin_update ON public.promo_codes
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS promo_codes_admin_delete ON public.promo_codes;
CREATE POLICY promo_codes_admin_delete ON public.promo_codes
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- legacy RPCs
REVOKE EXECUTE ON FUNCTION public.increment_promo_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_details(text)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_details(uuid)     FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- views
ALTER VIEW public.user_point_balance         SET (security_invoker = true);
ALTER VIEW public.v_customer_ltv             SET (security_invoker = true);
ALTER VIEW public.v_funnel                   SET (security_invoker = true);
ALTER VIEW public.v_net_profit_monthly       SET (security_invoker = true);
ALTER VIEW public.v_network_levels           SET (security_invoker = true);
ALTER VIEW public.v_points_liability         SET (security_invoker = true);
ALTER VIEW public.v_product_profit           SET (security_invoker = true);
ALTER VIEW public.v_referral_payout_detail   SET (security_invoker = true);
ALTER VIEW public.v_referral_payouts_monthly SET (security_invoker = true);
ALTER VIEW public.v_referrer_stats           SET (security_invoker = true);
ALTER VIEW public.v_sales_daily              SET (security_invoker = true);
