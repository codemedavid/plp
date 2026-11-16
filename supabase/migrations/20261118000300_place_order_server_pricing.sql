-- ============================================================================
-- place_order(): server-authoritative item prices and shipping.
-- APPLIED to the live DB on 2026-11-17 as two live migration records:
--   "place_order_server_pricing"  -- everything below except the points lock
--   "place_order_points_lock"     -- same place_order() + pg_advisory_xact_lock
--                                    before the points-balance read
-- (repo file renumbered from 20261118000200 to 20261118000300 to avoid a
-- prefix clash with 20261118000200_lock_down_storage_policies.sql; the live
-- record names above are unchanged).
-- Safe before any client deploy: the deployed client already sends
-- product_id / variation_id / quantity / kit_type / shipping_location and
-- renders the totals and order_items returned by this RPC.
--
-- Before this migration place_order() trusted the client's order_items[].price
-- / .total and shipping_fee, so an edited request could buy anything for ₱1.
-- It now reprices every line from products / product_variations and derives
-- shipping from shipping_locations, using the same rules as the storefront:
--
--   src/lib/bundlePricing.ts   getRegularUnitPrice / getEffectiveUnitPrice /
--                              qualifiesForFreeShipping (+ 8.8 promo window)
--   src/components/Checkout.tsx  shipping = 0 when the cart holds 3+ bottles,
--                              else the selected shipping_locations.fee
--   src/hooks/useShippingLocations.ts  built-in fallback locations when the
--                              table has no active rows
--
-- Promo -> points -> payment fee are applied exactly as before, on the SERVER
-- subtotal. Client-sent prices, totals, shipping fee and product/variation
-- names are ignored (names come from the DB too).
--
-- Additive + compatible: same signature, same response keys, same grants.
-- The only schema change is a nullable orders.pricing_mismatch jsonb that is
-- filled when the client's claimed subtotal or shipping differ from the
-- server's by more than ₱0.01 (stale cart, tampering). The order is still
-- placed at server prices.
--
-- Parity with the TS pricing is locked by src/test/serverPricingParity.test.ts
-- (vectors verified against this SQL in rolled-back transactions).
--
-- Rollback: supabase/migrations/rollback/20261118000300_place_order_server_pricing.rollback.sql
-- ============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pricing_mismatch jsonb;

COMMENT ON COLUMN public.orders.pricing_mismatch IS
  'Set by place_order() when the client''s claimed subtotal/shipping differed from the server price by more than 0.01. NULL = client and server agreed. The order is always stored at server prices.';

-- ---------------------------------------------------------------------------
-- Lenient numeric parse for client-claimed amounts (only used for the
-- mismatch record, never for pricing). NULL when absent or not a number.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parse_client_amount(p_value text)
  RETURNS numeric
  LANGUAGE plpgsql IMMUTABLE
  SET search_path TO 'public'
AS $$
BEGIN
  IF p_value IS NULL OR p_value !~ '^\s*-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]{1,3})?\s*$' THEN
    RETURN NULL;
  END IF;
  RETURN p_value::numeric;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.parse_client_amount(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-unit selling price (unrounded). Port of getEffectiveUnitPrice():
--
--   p_list_price / p_sale_price / p_sale_active are the chosen VARIATION's
--   price / discount_price / discount_active when there is one, otherwise the
--   product's base_price / discount_price / discount_active. Bundle tiers are
--   always the product's.
--
--   regular  = sale price when active and set, else list price
--   8.8 promo (2026-08-07 00:00 .. 2026-08-10 00:00 PHT, half-open), only for
--            SKUs WITHOUT a live sale price: list * 0.5 (replaces tiers and
--            the quantity discount)
--   else     = first bundle tier with qty = quantity and a numeric price > 0:
--              tier.price / quantity; otherwise regular * (1 - rate) where
--              rate = 10% at qty 2, 15% at qty 3+
--   + 150 per unit for kit 'complete_kit' (never discounted)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_unit_price(
  p_list_price numeric, p_sale_price numeric, p_sale_active boolean,
  p_bundle_tiers jsonb, p_kit_type text, p_quantity int, p_now timestamptz
) RETURNS numeric
  LANGUAGE plpgsql IMMUTABLE
  SET search_path TO 'public'
AS $$
DECLARE
  c_kit_upgrade CONSTANT numeric     := 150;     -- KIT_UPGRADE_PRICE
  c_promo_start CONSTANT timestamptz := '2026-08-07 00:00:00+08';
  c_promo_end   CONSTANT timestamptz := '2026-08-10 00:00:00+08';
  c_promo_rate  CONSTANT numeric     := 0.5;
  v_kit      numeric := CASE WHEN p_kit_type = 'complete_kit' THEN c_kit_upgrade ELSE 0 END;
  v_has_sale boolean := COALESCE(p_sale_active, false) AND p_sale_price IS NOT NULL;
  v_regular  numeric := CASE WHEN v_has_sale THEN p_sale_price ELSE p_list_price END;
  v_tier_price numeric;
BEGIN
  IF p_now >= c_promo_start AND p_now < c_promo_end AND NOT v_has_sale THEN
    RETURN p_list_price * c_promo_rate + v_kit;
  END IF;

  SELECT (t.tier->>'price')::numeric INTO v_tier_price
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(p_bundle_tiers) = 'array' THEN p_bundle_tiers ELSE '[]'::jsonb END
         ) WITH ORDINALITY AS t(tier, ord)
   WHERE jsonb_typeof(t.tier) = 'object'
     AND jsonb_typeof(t.tier->'qty') = 'number'
     AND (t.tier->>'qty')::numeric = p_quantity
     AND jsonb_typeof(t.tier->'price') = 'number'
     AND (t.tier->>'price')::numeric > 0
   ORDER BY t.ord
   LIMIT 1;

  IF v_tier_price IS NOT NULL THEN
    RETURN v_tier_price / p_quantity + v_kit;
  END IF;

  RETURN v_regular * (1 - CASE WHEN p_quantity >= 3 THEN 0.15
                               WHEN p_quantity = 2 THEN 0.10
                               ELSE 0 END) + v_kit;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.compute_unit_price(numeric, numeric, boolean, jsonb, text, int, timestamptz)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public: create an order atomically, priced entirely server-side.
--
--   line total = round(unit * qty, 2)    subtotal = round(sum(unit * qty), 2)
--   shipping   = 0 if sum(qty) >= 3 else shipping_locations.fee
--   payable    = max(subtotal + shipping - promo discount - points, 0)
--   fee        = round(payable * surcharge_pct / 100, 2)
--   total      = payable + fee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(p_order jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  c_points_min_order  CONSTANT numeric := 3999;
  c_max_items         CONSTANT int := 100;
  c_max_line_qty      CONSTANT int := 100;
  c_free_shipping_qty CONSTANT int := 3;     -- FREE_SHIPPING_MIN_QTY
  c_tolerance         CONSTANT numeric := 0.01;
  c_uuid_re           CONSTANT text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_uid        uuid := auth.uid();
  v_now        timestamptz := now();
  v_items      jsonb := p_order->'order_items';
  v_item       jsonb;
  v_qty_text   text;
  v_qty        int;
  v_kit_type   text;
  v_ref_text   text;
  v_product    public.products%ROWTYPE;
  v_variation  public.product_variations%ROWTYPE;
  v_has_var    boolean;
  v_list       numeric;
  v_unit       numeric;
  v_line_total numeric;
  v_server_items jsonb := '[]'::jsonb;
  v_lines_audit  jsonb := '[]'::jsonb;
  v_total_qty  int := 0;
  v_subtotal_exact numeric := 0;
  v_subtotal   numeric;
  v_client_line     numeric;
  v_client_subtotal numeric := 0;
  v_client_shipping numeric := public.parse_client_amount(p_order->>'shipping_fee');
  v_location_id  text := NULLIF(btrim(COALESCE(p_order->>'shipping_location', '')), '');
  v_location_fee numeric;
  v_shipping   numeric;
  v_mismatch   jsonb;
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

  -- Reprice every line from the catalog.
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Invalid line item' USING ERRCODE = '22023';
    END IF;

    v_qty_text := btrim(COALESCE(v_item->>'quantity', ''));
    IF v_qty_text !~ '^[0-9]{1,6}(\.0+)?$' THEN
      RAISE EXCEPTION 'Invalid quantity in your cart' USING ERRCODE = '22023';
    END IF;
    v_qty := v_qty_text::numeric::int;
    IF v_qty < 1 OR v_qty > c_max_line_qty THEN
      RAISE EXCEPTION 'Quantity must be between 1 and %', c_max_line_qty USING ERRCODE = '22023';
    END IF;

    v_kit_type := COALESCE(NULLIF(btrim(COALESCE(v_item->>'kit_type', '')), ''), 'vial_only');
    IF v_kit_type NOT IN ('vial_only', 'complete_kit') THEN
      RAISE EXCEPTION 'Invalid kit option in your cart' USING ERRCODE = '22023';
    END IF;

    v_ref_text := btrim(COALESCE(v_item->>'product_id', ''));
    IF v_ref_text !~ c_uuid_re THEN
      RAISE EXCEPTION 'Invalid product in your cart' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_product FROM public.products
     WHERE id = v_ref_text::uuid AND available IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in your cart is no longer available. Please refresh your cart.' USING ERRCODE = 'P0001';
    END IF;

    v_ref_text := NULLIF(btrim(COALESCE(v_item->>'variation_id', '')), '');
    v_has_var := v_ref_text IS NOT NULL;
    IF v_has_var THEN
      IF v_ref_text !~ c_uuid_re THEN
        RAISE EXCEPTION 'Invalid product option in your cart' USING ERRCODE = '22023';
      END IF;
      SELECT * INTO v_variation FROM public.product_variations
       WHERE id = v_ref_text::uuid AND product_id = v_product.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'A product option in your cart is no longer available. Please refresh your cart.' USING ERRCODE = 'P0001';
      END IF;
      v_list := v_variation.price;
      v_unit := public.compute_unit_price(v_variation.price, v_variation.discount_price, v_variation.discount_active,
                                          v_product.bundle_tiers, v_kit_type, v_qty, v_now);
    ELSE
      v_list := v_product.base_price;
      v_unit := public.compute_unit_price(v_product.base_price, v_product.discount_price, v_product.discount_active,
                                          v_product.bundle_tiers, v_kit_type, v_qty, v_now);
    END IF;
    IF v_list IS NULL OR v_unit IS NULL OR v_unit < 0 THEN
      RAISE EXCEPTION 'A product in your cart has no price. Please contact support.' USING ERRCODE = 'P0001';
    END IF;

    -- Lines are shown rounded; the subtotal is rounded once from the exact
    -- sum, like the client (float sum, rounded at payable / promo time).
    v_line_total := round(v_unit * v_qty, 2);
    v_subtotal_exact := v_subtotal_exact + v_unit * v_qty;
    v_total_qty  := v_total_qty + v_qty;

    v_server_items := v_server_items || jsonb_build_array(jsonb_build_object(
      'product_id',         v_product.id,
      'product_name',       v_product.name,
      'variation_id',       CASE WHEN v_has_var THEN v_variation.id END,
      'variation_name',     CASE WHEN v_has_var THEN v_variation.name END,
      'quantity',           v_qty,
      'price',              round(v_unit, 2),
      'total',              v_line_total,
      'kit_type',           v_kit_type,
      'purity_percentage',  v_product.purity_percentage
    ));

    -- What the client claimed, for the mismatch audit only.
    v_client_line := public.parse_client_amount(v_item->>'total');
    v_client_subtotal := v_client_subtotal + v_client_line;   -- NULL if any line is unparseable
    v_lines_audit := v_lines_audit || jsonb_build_array(jsonb_build_object(
      'product_id',   v_product.id,
      'variation_id', CASE WHEN v_has_var THEN v_variation.id END,
      'kit_type',     v_kit_type,
      'quantity',     v_qty,
      'client_price', public.parse_client_amount(v_item->>'price'),
      'client_total', v_client_line,
      'server_price', round(v_unit, 2),
      'server_total', v_line_total
    ));
  END LOOP;
  v_subtotal := round(v_subtotal_exact, 2);

  -- Shipping: the selected region's fee, waived for 3+ bottles cart-wide.
  -- With no active regions the storefront falls back to built-in defaults
  -- (useShippingLocations.ts); mirror them so checkout keeps working.
  IF EXISTS (SELECT 1 FROM public.shipping_locations WHERE is_active IS TRUE) THEN
    SELECT COALESCE(fee, 0) INTO v_location_fee
      FROM public.shipping_locations
     WHERE id = v_location_id AND is_active IS TRUE;
  ELSE
    SELECT d.fee INTO v_location_fee
      FROM (VALUES ('LBC_METRO', 150::numeric), ('LBC_PROVINCIAL', 200::numeric), ('LALAMOVE', 0::numeric)) AS d(id, fee)
     WHERE d.id = v_location_id;
  END IF;
  IF v_location_fee IS NULL THEN
    RAISE EXCEPTION 'Please choose an available shipping region' USING ERRCODE = '22023';
  END IF;
  v_shipping := CASE WHEN v_total_qty >= c_free_shipping_qty THEN 0 ELSE v_location_fee END;

  IF v_client_subtotal IS NULL OR v_client_shipping IS NULL
     OR abs(v_client_subtotal - v_subtotal) > c_tolerance
     OR abs(v_client_shipping - v_shipping) > c_tolerance THEN
    v_mismatch := jsonb_build_object(
      'client_subtotal',     v_client_subtotal,
      'server_subtotal',     v_subtotal,
      'client_shipping_fee', v_client_shipping,
      'server_shipping_fee', v_shipping,
      'lines',               v_lines_audit,
      'detected_at',         v_now
    );
  END IF;

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
    -- Serialize redemptions per user until commit, so two simultaneous
    -- orders cannot both pass the balance check and spend the same points.
    -- The balance below is read after the lock, so it sees the other
    -- order's committed debit (trg_debit_points_for_order).
    PERFORM pg_advisory_xact_lock(hashtext('points:' || v_uid::text));
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
    order_number, user_id, points_redeemed, payment_fee, payment_fee_pct, pricing_mismatch
  ) VALUES (
    left(btrim(p_order->>'customer_name'), 200),
    left(btrim(p_order->>'customer_email'), 320),
    left(btrim(p_order->>'customer_phone'), 50),
    left(btrim(p_order->>'shipping_address'), 1000),
    left(NULLIF(btrim(p_order->>'shipping_barangay'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_city'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_state'), ''), 200),
    left(NULLIF(btrim(p_order->>'shipping_zip_code'), ''), 20),
    v_server_items,
    v_subtotal,
    v_payable + v_fee,
    v_shipping,
    NULLIF(p_order->>'courier_id', '')::uuid,
    left(v_location_id, 200),
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
    v_pm.surcharge_pct,
    v_mismatch
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
