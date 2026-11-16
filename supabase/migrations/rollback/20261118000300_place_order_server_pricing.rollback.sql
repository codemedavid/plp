-- ROLLBACK for 20261118000300_place_order_server_pricing.sql
--
-- Restores place_order() exactly as shipped in 20261118000000_phase2a_order_rpcs.sql
-- (client-supplied line prices and shipping_fee -- i.e. re-opens the price
-- tampering hole; only use this if the server pricing is itself broken).
-- Same signature and response, so no client deploy is needed either way.
--
-- orders.pricing_mismatch is kept by default so recorded mismatches survive a
-- rollback; uncomment the last statement to drop it as well.

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

DROP FUNCTION IF EXISTS public.compute_unit_price(numeric, numeric, boolean, jsonb, text, int, timestamptz);
DROP FUNCTION IF EXISTS public.parse_client_amount(text);

-- ALTER TABLE public.orders DROP COLUMN IF EXISTS pricing_mismatch;
