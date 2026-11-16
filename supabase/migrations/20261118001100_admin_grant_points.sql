-- ============================================================================
-- APPLIED to the live DB on 2026-11-17 (migration "admin_grant_points").
-- Originally written as 20260722000000_admin_grant_points.sql but never applied;
-- the admin "Grant points" form (UserLookupManager -> lib/adminPoints.ts) was
-- calling a function that did not exist. Renamed here so it is not applied twice.
--
-- Changes vs the original repo file:
--   * EXECUTE revoked from PUBLIC and anon (default PUBLIC grant made it
--     reachable by anon; is_admin() still blocked it).
--   * search_path pinned to 'public, pg_temp' and all objects schema-qualified.
--   * Label capped at 120 chars server-side (mirrors MAX_GRANT_LABEL_LENGTH in
--     src/lib/adminPoints.ts; the original only checked non-empty).
--   * Not changed: there is no audit column, so which admin made a grant is
--     not recorded (notes holds only the label the UI displays).
--
-- Rollback: supabase/migrations/rollback/20261118001100_admin_grant_points.rollback.sql
-- ============================================================================
--
-- Admin manual points grant.
--
-- Lets an admin credit a customer's points balance and name what the points are
-- for. points_ledger has no client INSERT policy (only service role / SECURITY
-- DEFINER writes), so the grant goes through this function:
--   * caller must be an admin (public.is_admin())
--   * amount must be a positive integer within a sane ceiling
--   * label (the "what for") must be non-empty; it is stored in notes
--   * credited as immediately-available (status='available', available_at=now())
--     with reason='admin_adjust' -- the reason the admin UI already labels as
--     "Admin adjustment" and the balance view counts right away
--
-- Returns the ledger row id of the grant.

CREATE OR REPLACE FUNCTION public.admin_grant_points(
  p_user_id uuid,
  p_amount integer,
  p_label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_max_amount CONSTANT int := 1000000;
  c_max_label  CONSTANT int := 120;
  v_label text := btrim(coalesce(p_label, ''));
  v_id    uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'customer not found' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero' USING ERRCODE = '22023';
  END IF;
  IF p_amount > c_max_amount THEN
    RAISE EXCEPTION 'amount exceeds the maximum grant' USING ERRCODE = '22023';
  END IF;

  IF v_label = '' THEN
    RAISE EXCEPTION 'a reason is required' USING ERRCODE = '22023';
  END IF;
  IF length(v_label) > c_max_label THEN
    RAISE EXCEPTION 'reason must be % characters or fewer', c_max_label USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.points_ledger
    (user_id, delta, reason, status, available_at, notes)
  VALUES
    (p_user_id, p_amount, 'admin_adjust', 'available', now(), v_label)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_points(uuid, integer, text) TO authenticated;
