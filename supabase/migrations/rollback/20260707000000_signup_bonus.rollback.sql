-- ROLLBACK for 20260707000000_signup_bonus.sql (APPLIED 2026-11-17, remote
-- version 20261116175059 "signup_bonus"). To just pause awards, prefer
-- UPDATE public.referral_config SET signup_bonus_enabled = false WHERE id = 1;
-- Stops new awards. Bonuses already credited stay in points_ledger
-- (reason = 'signup_bonus').
DROP TRIGGER IF EXISTS on_auth_user_signup_bonus ON auth.users;
DROP FUNCTION IF EXISTS public.trg_award_signup_bonus();
DROP FUNCTION IF EXISTS public.award_signup_bonus(uuid);
DROP INDEX IF EXISTS public.idx_points_ledger_signup_uniq;
ALTER TABLE public.referral_config
  DROP COLUMN IF EXISTS signup_bonus_enabled,
  DROP COLUMN IF EXISTS signup_bonus_points;
