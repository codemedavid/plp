-- ROLLBACK for 20261117000100_revoke_unguarded_definer_rpcs.sql
-- Restores the previous (unsafe) grants exactly as they were.
GRANT EXECUTE ON FUNCTION public.reverse_referral_points_for_order(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_promo_usage(uuid) TO PUBLIC, anon, authenticated;
