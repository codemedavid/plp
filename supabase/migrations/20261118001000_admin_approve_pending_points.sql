-- ============================================================================
-- APPLIED to the live DB on 2026-11-17 (migration "admin_approve_pending_points").
-- Originally written as 20260707000000_admin_approve_pending_points.sql but never
-- applied; the admin UI (PendingApprovalsTab, UserLookupManager) was calling a
-- function that did not exist. Renamed here so it is not applied twice.
--
-- Changes vs the original repo file:
--   * EXECUTE revoked from PUBLIC and anon (Postgres grants EXECUTE to PUBLIC by
--     default, so the original was callable by anon; is_admin() still blocked it,
--     but anon should not reach a SECURITY DEFINER body at all).
--   * search_path pinned to 'public, pg_temp' and all objects schema-qualified.
--   * p_user_id NULL is rejected explicitly.
--
-- Rollback: supabase/migrations/rollback/20261118001000_admin_approve_pending_points.rollback.sql
-- ============================================================================
--
-- Admin fast-approval of pending referral points.
--
-- Referral payouts land in points_ledger with status='pending'. Normally they
-- wait before becoming spendable. This RPC lets an admin approve them
-- immediately so the referrer doesn't have to wait.
--
-- Security model mirrors award_review_points: a SECURITY DEFINER function that
-- bypasses the points_ledger RLS (which has no UPDATE policy) but is fully gated
-- server-side:
--   * caller must be an admin (public.is_admin())
--   * only 'pending' rows are touched
--   * p_ledger_id (optional) approves a single entry; otherwise every pending
--     entry for p_user_id is approved
--   * available_at is stamped to now() so the balance view counts it right away
--   * returns the number of ledger rows flipped
--
-- Idempotent: re-running approves nothing new (no pending rows left).

CREATE OR REPLACE FUNCTION public.admin_approve_pending_points(
  p_user_id uuid,
  p_ledger_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'customer is required' USING ERRCODE = '22023';
  END IF;

  WITH approved AS (
    UPDATE public.points_ledger
       SET status = 'available',
           available_at = now()
     WHERE user_id = p_user_id
       AND status = 'pending'
       AND (p_ledger_id IS NULL OR id = p_ledger_id)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM approved;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_pending_points(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_pending_points(uuid, uuid) TO authenticated;
