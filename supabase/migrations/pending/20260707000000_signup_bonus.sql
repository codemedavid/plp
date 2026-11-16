-- ============================================================================
-- NOT APPLIED -- parked in pending/ on 2026-11-17 pending an owner decision.
--
-- The storefront already advertises this bonus (WelcomePopup / AuthModal:
-- "Sign Up & Claim 100 Points", src/lib/rewards.ts SIGNUP_BONUS_POINTS = 100)
-- but nothing on the live DB awards it. Applying this file starts crediting
-- 100 points (= P100) to every account at the moment its email is confirmed.
-- It is NOT retroactive: users who confirmed before it is applied get nothing
-- unless back-filled separately.
--
-- Security-adapted vs the original repo file (verified in a rolled-back
-- transaction on 2026-11-17, see report):
--   * award_signup_bonus() and trg_award_signup_bonus(): EXECUTE revoked from
--     PUBLIC, anon, authenticated. The original left award_signup_bonus(uuid)
--     callable by anyone via /rest/v1/rpc (it would credit any confirmed user
--     once). Only the auth.users trigger needs it.
--   * search_path pinned to 'public, pg_temp'; objects schema-qualified.
--
-- Rollback: supabase/migrations/rollback/20260707000000_signup_bonus.rollback.sql
-- ============================================================================
--
-- Signup welcome bonus
--
-- New members earn a one-time welcome bonus (default 100 points = P100) once
-- their email is confirmed:
--   * credited through a SECURITY DEFINER path so it bypasses points_ledger RLS
--   * gated on a confirmed email (abuse guard against throwaway signups)
--   * credited at most once per user (idempotent via partial unique index)
--   * status = 'available' so it counts toward the redeemable balance
--     immediately (still subject to place_order's P3,999 points minimum)
--   * amount + on/off switch live in referral_config (single row, id = 1)

-- 1. Config: amount + toggle
ALTER TABLE public.referral_config
  ADD COLUMN IF NOT EXISTS signup_bonus_points  int     NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS signup_bonus_enabled boolean NOT NULL DEFAULT true;

-- 2. One welcome bonus per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_signup_uniq
  ON public.points_ledger(user_id)
  WHERE reason = 'signup_bonus';

-- 3. Award function -- validated, idempotent credit
CREATE OR REPLACE FUNCTION public.award_signup_bonus(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_confirmed boolean;
  v_points    int;
  v_enabled   boolean;
  v_awarded   int;
BEGIN
  IF p_user IS NULL THEN
    RETURN 0;
  END IF;

  SELECT (email_confirmed_at IS NOT NULL) INTO v_confirmed
    FROM auth.users WHERE id = p_user;
  IF NOT coalesce(v_confirmed, false) THEN
    RETURN 0;
  END IF;

  SELECT signup_bonus_points, signup_bonus_enabled
    INTO v_points, v_enabled
    FROM public.referral_config WHERE id = 1;

  IF NOT coalesce(v_enabled, false) OR coalesce(v_points, 0) <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.points_ledger
    (user_id, delta, reason, status, available_at, notes)
  VALUES
    (p_user, v_points, 'signup_bonus', 'available', now(), 'Signup welcome bonus')
  ON CONFLICT (user_id) WHERE reason = 'signup_bonus'
  DO NOTHING
  RETURNING delta INTO v_awarded;

  RETURN coalesce(v_awarded, 0);
END;
$$;

-- 4. Trigger -- award when the email becomes confirmed. Non-fatal, so it can
--    never block account creation or confirmation.
CREATE OR REPLACE FUNCTION public.trg_award_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL
     AND (tg_op = 'INSERT' OR old.email_confirmed_at IS NULL) THEN
    PERFORM public.award_signup_bonus(new.id);
  END IF;
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE WARNING 'award_signup_bonus trigger failed for %: %', new.id, sqlerrm;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.award_signup_bonus(uuid)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_award_signup_bonus()   FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_signup_bonus ON auth.users;
CREATE TRIGGER on_auth_user_signup_bonus
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_signup_bonus();
