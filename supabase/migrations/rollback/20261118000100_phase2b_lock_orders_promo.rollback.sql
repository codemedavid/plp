-- ROLLBACK for pending/20261118000100_phase2b_lock_orders_promo.sql
-- WARNING: re-opens orders (customer PII) and promo_codes to anonymous users.
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_select_own   ON public.orders;
DROP POLICY IF EXISTS orders_admin_select ON public.orders;
DROP POLICY IF EXISTS orders_admin_insert ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
DROP POLICY IF EXISTS orders_admin_delete ON public.orders;

ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promo_codes_admin_select ON public.promo_codes;
DROP POLICY IF EXISTS promo_codes_admin_insert ON public.promo_codes;
DROP POLICY IF EXISTS promo_codes_admin_update ON public.promo_codes;
DROP POLICY IF EXISTS promo_codes_admin_delete ON public.promo_codes;

GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details(text)     TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details(uuid)     TO PUBLIC, anon, authenticated;

ALTER VIEW public.user_point_balance         RESET (security_invoker);
ALTER VIEW public.v_customer_ltv             RESET (security_invoker);
ALTER VIEW public.v_funnel                   RESET (security_invoker);
ALTER VIEW public.v_net_profit_monthly       RESET (security_invoker);
ALTER VIEW public.v_network_levels           RESET (security_invoker);
ALTER VIEW public.v_points_liability         RESET (security_invoker);
ALTER VIEW public.v_product_profit           RESET (security_invoker);
ALTER VIEW public.v_referral_payout_detail   RESET (security_invoker);
ALTER VIEW public.v_referral_payouts_monthly RESET (security_invoker);
ALTER VIEW public.v_referrer_stats           RESET (security_invoker);
ALTER VIEW public.v_sales_daily              RESET (security_invoker);
