-- ============================================================================
-- Check in the drifted points-debit trigger.
--
-- debit_points_for_order() / trg_debit_points_for_order exist in the live
-- database but appear in NO migration -- they were applied straight to the
-- remote project. src/components/Checkout.tsx references the trigger by name
-- while relying on behaviour the repo could not rebuild.
--
-- This file reproduces the live definition verbatim (read back from
-- pg_get_functiondef on 2026-08-07). It is deliberately behaviour-neutral:
-- CREATE OR REPLACE over an identical body is a no-op on production, and it
-- lets a fresh environment come up matching prod.
--
-- Validation of the redeemed amount lives in the companion migration
-- 20260807000000_points_min_order.sql, which runs BEFORE INSERT and so
-- executes ahead of this trigger.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debit_points_for_order()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND COALESCE(NEW.points_redeemed, 0) > 0 THEN
    INSERT INTO public.points_ledger (
      user_id, delta, reason, source_order_id, status, notes
    )
    VALUES (
      NEW.user_id,
      -NEW.points_redeemed,
      'redemption',
      NEW.id,
      'available',
      CONCAT('Order ', COALESCE(NEW.order_number, NEW.id::text))
    )
    ON CONFLICT (source_order_id) WHERE reason = 'redemption' DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
