-- ============================================================================
-- PHASE 2a -- APPLIED to the live DB on 2026-11-17 (migration name
-- "phase2a_order_rpcs"). Server-side order creation, promo validation and
-- guest order tracking. Purely ADDITIVE: two NOT NULL DEFAULT 0 columns on
-- orders and five new functions; nothing dropped and no existing grant
-- revoked. Verified after applying that the git-HEAD checkout flow (anon
-- orders insert+select, promo_codes select, increment_promo_usage,
-- get_order_details, client-side orders delete) still works.
--
-- Remaining deploy order:
--   1. (done) apply THIS file
--   2. deploy the new client code  (Checkout/OrderTracking call these RPCs)
--   3. apply pending/20261118000100_phase2b_lock_orders_promo.sql
--
-- Rollback: supabase/migrations/rollback/20261118000000_phase2a_order_rpcs.rollback.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Payment surcharge persisted per order (e.g. QRPh 3%). payment_fee is the
-- peso amount already INCLUDED in total_price; payment_fee_pct is the rate in
-- force when the order was placed (the method's rate may change later).
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_fee     numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee_pct numeric(5,2)  NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Discount for a promo against an items subtotal. Mirrors
-- src/lib/orderTotals.ts computePromoDiscount(): percentage capped by
-- max_discount_amount (NULL/0 = no cap), never more than the subtotal,
-- rounded to the centavo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_promo_discount(
  p_discount_type text, p_discount_value numeric, p_max_discount numeric, p_subtotal numeric
) RETURNS numeric
  LANGUAGE plpgsql IMMUTABLE
  SET search_path TO 'public'
AS $$
DECLARE
  v_subtotal numeric := GREATEST(COALESCE(p_subtotal, 0), 0);
  v_discount numeric;
BEGIN
  IF v_subtotal = 0 THEN RETURN 0; END IF;
  IF p_discount_type = 'percentage' THEN
    v_discount := v_subtotal * GREATEST(COALESCE(p_discount_value, 0), 0) / 100;
    IF p_max_discount IS NOT NULL AND p_max_discount > 0 THEN
      v_discount := LEAST(v_discount, p_max_discount);
    END IF;
  ELSE
    v_discount := GREATEST(COALESCE(p_discount_value, 0), 0);
  END IF;
  RETURN round(LEAST(v_discount, v_subtotal), 2);
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal: look up + validate a promo code. Not callable by clients.
-- Returns {valid:false,error} or {valid:true, id, code, discount_type, ...,
-- discount}. usage_limit NULL or 0 = unlimited (matches PromoCodeManager,
-- which displays 0 as "∞").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_promo_code(p_code text, p_subtotal numeric)
  RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_code text := upper(btrim(COALESCE(p_code, '')));
  v_promo public.promo_codes%ROWTYPE;
BEGIN
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Please enter a promo code');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes
   WHERE code = v_code AND active IS TRUE
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or inactive promo code');
  END IF;
  IF v_promo.start_date IS NOT NULL AND v_promo.start_date > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code is not yet valid');
  END IF;
  IF v_promo.end_date IS NOT NULL AND v_promo.end_date < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code has expired');
  END IF;
  IF COALESCE(v_promo.usage_limit, 0) > 0
     AND COALESCE(v_promo.usage_count, 0) >= v_promo.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code usage limit reached');
  END IF;
  IF COALESCE(p_subtotal, 0) < COALESCE(v_promo.min_purchase_amount, 0) THEN
    RETURN jsonb_build_object('valid', false, 'error',
      format('Minimum purchase of ₱%s required', v_promo.min_purchase_amount));
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'max_discount_amount', v_promo.max_discount_amount,
    'min_purchase_amount', v_promo.min_purchase_amount,
    'discount', public.compute_promo_discount(
      v_promo.discount_type, v_promo.discount_value, v_promo.max_discount_amount, p_subtotal)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_promo_code(text, numeric) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public: check one promo code for the checkout UI. Exposes only the terms of
-- the code the shopper typed -- the promo_codes table itself becomes
-- unreadable in Phase 2b.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text, p_subtotal numeric)
  RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT public.resolve_promo_code(p_code, p_subtotal);
$$;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public: create an order atomically.
--
-- Server-authoritative: user_id (= auth.uid(), never the client's), status
-- fields, promo validation + discount + usage increment, points redemption
-- rules (mirrors src/lib/pointsRedemption.ts: signed-in only, post-discount
-- items subtotal >= 3999, <= balance, <= order value), payment method
-- (must be active) and its surcharge, order_number, total_price.
--
-- Still client-supplied (unchanged from today, see report): order_items line
-- prices/totals and shipping_fee. Repricing server-side would mean porting
-- bundlePricing.ts to SQL and is out of scope for this change.
--
-- Totals:  subtotal = sum(order_items[].total)
--          payable  = max(subtotal + shipping_fee - discount - points, 0)
--          fee      = round(payable * surcharge_pct / 100, 2)
--          total    = payable + fee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(p_order jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  c_points_min_order CONSTANT numeric := 3999;
  c_max_items        CONSTANT int := 100;
  v_uid        uuid := auth.uid();
  v_items      jsonb := p_order->'order_items';
  v_item       jsonb;
  v_subtotal   numeric := 0;
  v_shipping   numeric := GREATEST(COALESCE(NULLIF(p_order->>'shipping_fee', '')::numeric, 0), 0);
  v_points     int := GREATEST(COALESCE(NULLIF(p_order->>'points_redeemed', '')::numeric, 0), 0)::int;
  v_promo_code text := NULLIF(upper(btrim(COALESCE(p_order->>'promo_code', ''))), '');
  v_promo      jsonb;
  v_promo_id   uuid;
  v_discount   numeric := 0;
  v_balance    numeric;
  v_pm         record;
  v_payable    numeric;
  v_fee        numeric;
  v_number     text;
  v_try        int := 0;
  v_row        public.orders%ROWTYPE;
BEGIN
  -- Required customer / shipping fields (same set Checkout validates).
  IF COALESCE(btrim(p_order->>'customer_name'), '') = ''
     OR COALESCE(btrim(p_order->>'customer_email'), '') = ''
     OR COALESCE(btrim(p_order->>'customer_phone'), '') = ''
     OR COALESCE(btrim(p_order->>'shipping_address'), '') = '' THEN
    RAISE EXCEPTION 'Missing required customer or shipping details' USING ERRCODE = '22023';
  END IF;

  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(v_items) > c_max_items THEN
    RAISE EXCEPTION 'Too many line items' USING ERRCODE = '22023';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    IF COALESCE((v_item->>'quantity')::numeric, 0) <= 0
       OR COALESCE((v_item->>'total')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Invalid line item' USING ERRCODE = '22023';
    END IF;
    v_subtotal := v_subtotal + (v_item->>'total')::numeric;
  END LOOP;

  -- Payment method: must exist and be active; its surcharge is authoritative.
  SELECT id, name, COALESCE(surcharge_pct, 0) AS surcharge_pct
    INTO v_pm
    FROM public.payment_methods
   WHERE id::text = p_order->>'payment_method_id' AND active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Please choose an available payment method' USING ERRCODE = '22023';
  END IF;

  -- Promo: validate, compute discount, then claim one use atomically.
  IF v_promo_code IS NOT NULL THEN
    v_promo := public.resolve_promo_code(v_promo_code, v_subtotal);
    IF NOT (v_promo->>'valid')::boolean THEN
      RAISE EXCEPTION '%', v_promo->>'error' USING ERRCODE = 'P0001';
    END IF;
    v_promo_id := (v_promo->>'id')::uuid;
    v_discount := (v_promo->>'discount')::numeric;
    UPDATE public.promo_codes
       SET usage_count = COALESCE(usage_count, 0) + 1, updated_at = now()
     WHERE id = v_promo_id
       AND (COALESCE(usage_limit, 0) <= 0 OR COALESCE(usage_count, 0) < usage_limit);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promo code usage limit reached' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Points (1 pt = ₱1).
  IF v_points > 0 THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Points can only be redeemed by a signed-in customer' USING ERRCODE = 'P0001';
    END IF;
    IF v_subtotal - v_discount < c_points_min_order THEN
      RAISE EXCEPTION 'Points require an order of at least ₱% after discounts', c_points_min_order USING ERRCODE = 'P0001';
    END IF;
    SELECT COALESCE(SUM(delta), 0) INTO v_balance
      FROM public.points_ledger
     WHERE user_id = v_uid AND status = 'available';
    IF v_points > v_balance THEN
      RAISE EXCEPTION 'Cannot redeem % points, available balance is %', v_points, v_balance USING ERRCODE = 'P0001';
    END IF;
    IF v_points > v_subtotal - v_discount THEN
      RAISE EXCEPTION 'Cannot redeem more points than the order value' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_payable := GREATEST(v_subtotal + v_shipping - v_discount - v_points, 0);
  v_fee := round(v_payable * v_pm.surcharge_pct / 100, 2);

  -- Human-friendly order number, unique among existing orders.
  LOOP
    v_try := v_try + 1;
    v_number := CASE WHEN v_try <= 25
                     THEN 'PLP-' || (1000 + floor(random() * 9000))::int
                     ELSE 'PLP-' || (100000 + floor(random() * 900000))::int END;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_number);
    IF v_try > 50 THEN
      RAISE EXCEPTION 'Could not allocate an order number, please retry';
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    customer_name, customer_email, customer_phone,
    shipping_address, shipping_barangay, shipping_city, shipping_state, shipping_zip_code,
    order_items, subtotal, total_price, shipping_fee, courier_id, shipping_location,
    payment_method_id, payment_method_name, payment_proof_url, contact_method, notes,
    order_status, payment_status, promo_code_id, promo_code, discount_applied,
    order_number, user_id, points_redeemed, payment_fee, payment_fee_pct
  ) VALUES (
    left(btrim(p_order->>'customer_name'), 200),
    left(btrim(p_order->>'customer_email'), 320),
    left(btrim(p_order->>'customer_phone'), 50),
    left(btrim(p_order->>'shipping_address'), 1000),
    left(NULLIF(btrim(p_order->>'shipping_barangay'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_city'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_state'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_zip_code'), ''), 20),
    v_items,
    v_subtotal,
    v_payable + v_fee,
    v_shipping,
    NULLIF(p_order->>'courier_id', '')::uuid,
    left(NULLIF(p_order->>'shipping_location', ''), 200),
    v_pm.id::text,
    v_pm.name,
    left(NULLIF(p_order->>'payment_proof_url', ''), 2000),
    left(COALESCE(NULLIF(p_order->>'contact_method', ''), 'email'), 20),
    left(NULLIF(btrim(p_order->>'notes'), ''), 2000),
    'new', 'pending',
    v_promo_id,
    CASE WHEN v_promo_id IS NULL THEN NULL ELSE v_promo->>'code' END,
    v_discount,
    v_number,
    v_uid,
    v_points,
    v_fee,
    v_pm.surcharge_pct
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'order_number', v_row.order_number,
    'order_items', v_row.order_items,
    'subtotal', v_row.subtotal,
    'shipping_fee', v_row.shipping_fee,
    'discount_applied', v_row.discount_applied,
    'points_redeemed', v_row.points_redeemed,
    'payment_fee', v_row.payment_fee,
    'payment_fee_pct', v_row.payment_fee_pct,
    'total_price', v_row.total_price,
    'payment_method_name', v_row.payment_method_name,
    'contact_method', v_row.contact_method,
    'promo_code', v_row.promo_code,
    'created_at', v_row.created_at
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public: guest order tracking. The caller must know the order reference
-- (order number like PLP-1234, or the leading 8+ hex chars of the order id)
-- AND the email or phone used at checkout. No wildcards: the old
-- get_order_details(text) accepted ILIKE patterns, so '%' returned an order.
-- Returns no address / email / phone.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_order(p_order_ref text, p_contact text)
  RETURNS TABLE (
    id uuid, order_number text, order_status text, payment_status text,
    tracking_number text, shipping_provider text, shipping_note text,
    total_price numeric, shipping_fee numeric, order_items jsonb,
    created_at timestamptz, promo_code text, discount_applied numeric,
    points_redeemed integer, payment_fee numeric, payment_fee_pct numeric,
    payment_method_name text, customer_name text
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_ref     text := upper(btrim(COALESCE(p_order_ref, '')));
  v_contact text := lower(btrim(COALESCE(p_contact, '')));
  v_digits  text := regexp_replace(COALESCE(p_contact, ''), '\D', '', 'g');
  v_is_hex  boolean;
BEGIN
  IF v_ref = '' OR v_contact = '' THEN
    RETURN;
  END IF;
  v_is_hex := v_ref ~ '^[0-9A-F-]{8,36}$';

  RETURN QUERY
  SELECT o.id, o.order_number, o.order_status, o.payment_status,
         o.tracking_number, o.shipping_provider, o.shipping_note,
         o.total_price, o.shipping_fee, o.order_items,
         o.created_at, o.promo_code, o.discount_applied,
         o.points_redeemed, o.payment_fee, o.payment_fee_pct,
         o.payment_method_name, o.customer_name
    FROM public.orders o
   WHERE (upper(o.order_number) = v_ref
          OR (v_is_hex AND upper(o.id::text) LIKE v_ref || '%'))
     AND (lower(btrim(o.customer_email)) = v_contact
          OR (length(v_digits) >= 7
              AND right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10) = right(v_digits, 10)))
   ORDER BY o.created_at DESC
   LIMIT 1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;
