-- ============================================================================
-- Revoke client EXECUTE on two SECURITY DEFINER functions that have no
-- authorization check of their own:
--
--   reverse_referral_points_for_order(uuid)
--     Reverses (claws back) every pending/available referral point row for an
--     order. Callable by anon via /rest/v1/rpc, so anyone could wipe any
--     customer's earned points. Its only legitimate caller is refund_order(),
--     which is itself SECURITY DEFINER (runs as the owner), so it is
--     unaffected by this revoke.
--
--   decrement_promo_usage(uuid)
--     Lets anyone decrement any promo code's usage_count, defeating usage
--     limits. Not called anywhere in src/ or api/ (HEAD or working tree).
--
-- service_role and the owner keep EXECUTE.
-- Rollback: supabase/migrations/rollback/20261117000100_revoke_unguarded_definer_rpcs.rollback.sql
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.reverse_referral_points_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_promo_usage(uuid) FROM PUBLIC, anon, authenticated;
