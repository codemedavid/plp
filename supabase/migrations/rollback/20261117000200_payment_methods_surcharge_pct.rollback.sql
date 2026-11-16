-- ROLLBACK for 20261117000200_payment_methods_surcharge_pct.sql
-- NOTE: the Phase 2 place_order() RPC and the new checkout code read this
-- column; roll those back first if they have been deployed.
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_surcharge_pct_range;
ALTER TABLE public.payment_methods DROP COLUMN IF EXISTS surcharge_pct;
