-- ============================================================================
-- Points redemption: server-side minimum-order gate + balance validation
--
-- Two problems this closes:
--
-- 1. The 3,999 minimum-order gate added in lib/pointsRedemption.ts is a client
--    cap. Anything enforced only in the browser is bypassable from the console,
--    so the rule is restated here as the authority.
--
-- 2. Pre-existing hole: debit_points_for_order() writes a points_ledger debit
--    straight from orders.points_redeemed without ever checking the customer
--    actually holds those points. A crafted insert could drive a balance
--    negative. This validates BEFORE INSERT, so it runs ahead of that trigger.
--
-- The threshold is duplicated from POINTS_MIN_ORDER_TOTAL in
-- src/lib/pointsRedemption.ts. Keep the two in step.
--
-- The gate basis is recomputed from order_items rather than trusting
-- total_price, which the client supplies. Basis = sum(order_items.total)
-- minus discount_applied, excluding shipping -- matching the client rule.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_points_redemption()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_min_order  CONSTANT numeric := 3999;
  v_subtotal   numeric;
  v_basis      numeric;
  v_balance    int;
BEGIN
  -- Nothing to police on orders that do not spend points.
  IF COALESCE(NEW.points_redeemed, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Points can only be redeemed by a signed-in customer';
  END IF;

  SELECT COALESCE(SUM((item->>'total')::numeric), 0)
    INTO v_subtotal
    FROM jsonb_array_elements(COALESCE(NEW.order_items, '[]'::jsonb)) AS item;

  v_basis := v_subtotal - COALESCE(NEW.discount_applied, 0);

  IF v_basis < v_min_order THEN
    RAISE EXCEPTION
      'Points require an order of at least %, this order is % after discounts',
      v_min_order, v_basis;
  END IF;

  SELECT COALESCE(balance, 0)
    INTO v_balance
    FROM user_point_balance
    WHERE user_id = NEW.user_id;

  v_balance := COALESCE(v_balance, 0);

  IF NEW.points_redeemed > v_balance THEN
    RAISE EXCEPTION
      'Cannot redeem % points, available balance is %',
      NEW.points_redeemed, v_balance;
  END IF;

  -- Points are worth 1 pt = P1, so they can never exceed the order value.
  IF NEW.points_redeemed > v_basis THEN
    RAISE EXCEPTION
      'Cannot redeem % points against an order worth %',
      NEW.points_redeemed, v_basis;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_points_redemption ON public.orders;
CREATE TRIGGER trg_validate_points_redemption
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_points_redemption();
