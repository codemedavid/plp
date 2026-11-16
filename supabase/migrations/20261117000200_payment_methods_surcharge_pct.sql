-- ============================================================================
-- Per-payment-method surcharge (e.g. QRPh 3%), editable from the admin
-- Payment Methods screen without a code deploy. 0 = no fee.
--
-- Purely additive: the code at git HEAD reads payment_methods with select('*')
-- (extra field ignored), inserts an explicit column list (new column takes its
-- default 0) and updates explicit fields only. No SQL function or view
-- references payment_methods.
--
-- The checkout fee is computed as round(payable * surcharge_pct / 100, 2) where
-- payable = subtotal + shipping - promo discount - points. The Phase 2
-- place_order() RPC re-reads surcharge_pct from this table server-side.
--
-- Rollback: supabase/migrations/rollback/20261117000200_payment_methods_surcharge_pct.rollback.sql
-- ============================================================================

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS surcharge_pct numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_surcharge_pct_range;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_surcharge_pct_range
  CHECK (surcharge_pct >= 0 AND surcharge_pct <= 10);

COMMENT ON COLUMN public.payment_methods.surcharge_pct IS
  'Percent fee added to the amount payable when this method is chosen (0-10). 0 = no fee.';

-- QRPh carries a 3% processor fee. Matched by name only for this one-time
-- seed; the app itself never keys on the name.
UPDATE public.payment_methods SET surcharge_pct = 3 WHERE name = 'QRPh';
