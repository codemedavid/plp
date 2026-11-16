-- ROLLBACK for 20261118000000_phase2a_order_rpcs.sql
-- Roll back phase 2b first if it was applied, and redeploy client code that
-- does not call these RPCs. Dropping the columns discards stored fees.
DROP FUNCTION IF EXISTS public.track_order(text, text);
DROP FUNCTION IF EXISTS public.place_order(jsonb);
DROP FUNCTION IF EXISTS public.validate_promo_code(text, numeric);
DROP FUNCTION IF EXISTS public.resolve_promo_code(text, numeric);
DROP FUNCTION IF EXISTS public.compute_promo_discount(text, numeric, numeric, numeric);
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_fee_pct;
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_fee;
