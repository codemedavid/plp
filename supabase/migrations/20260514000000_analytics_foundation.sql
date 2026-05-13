-- Analytics foundation: product cost, order cost snapshot, signup→purchase signal,
-- and SQL views powering the Sales/Profit, Payout/Liability, and Product-Profit dashboards.

-- ============================================================================
-- 1. Cost columns
-- ============================================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0;

ALTER TABLE product_variations
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2);

-- ============================================================================
-- 2. Order cost snapshot — recompute on insert/update of order_items
--    Looks up variation.cost first, falls back to products.cost.
-- ============================================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION compute_order_total_cost() RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost := COALESCE((
    SELECT SUM(
      COALESCE((item->>'quantity')::numeric, 1) *
      COALESCE(pv.cost, p.cost, 0)
    )
    FROM jsonb_array_elements(NEW.order_items) AS item
    LEFT JOIN product_variations pv ON pv.id = NULLIF(item->>'variation_id', '')::uuid
    LEFT JOIN products p ON p.id = NULLIF(item->>'product_id', '')::uuid
  ), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_order_total_cost ON orders;
CREATE TRIGGER trg_compute_order_total_cost
  BEFORE INSERT OR UPDATE OF order_items ON orders
  FOR EACH ROW EXECUTE FUNCTION compute_order_total_cost();

-- Backfill existing rows
UPDATE orders SET order_items = order_items WHERE total_cost IS NULL OR total_cost = 0;

-- ============================================================================
-- 3. Signup → purchase signal: stamp first_order_at on user_profiles
-- ============================================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION stamp_first_order_at() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE user_profiles
       SET first_order_at = NEW.created_at
     WHERE id = NEW.user_id
       AND first_order_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_first_order_at ON orders;
CREATE TRIGGER trg_stamp_first_order_at
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION stamp_first_order_at();

-- Backfill from existing orders
UPDATE user_profiles up
   SET first_order_at = sub.first_order
  FROM (
    SELECT user_id, MIN(created_at) AS first_order
      FROM orders
     WHERE user_id IS NOT NULL
     GROUP BY user_id
  ) sub
 WHERE up.id = sub.user_id
   AND up.first_order_at IS NULL;

-- ============================================================================
-- 4. Views — all exclude frozen users from analytics
-- ============================================================================

-- 4a. Daily sales rollup
CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  DATE_TRUNC('day', o.created_at)::date AS day,
  COUNT(*)::int                          AS orders_count,
  COALESCE(SUM(o.total_price), 0)::numeric        AS gross_revenue,
  COALESCE(SUM(o.total_cost), 0)::numeric         AS total_cost,
  COALESCE(SUM(o.points_redeemed), 0)::numeric    AS points_redeemed,
  COALESCE(SUM(o.total_price) - SUM(o.points_redeemed), 0)::numeric AS net_revenue,
  CASE WHEN COUNT(*) > 0
    THEN (COALESCE(SUM(o.total_price), 0) / COUNT(*))::numeric
    ELSE 0
  END                                    AS aov
FROM orders o
LEFT JOIN user_profiles up ON up.id = o.user_id
WHERE up.frozen IS NOT TRUE
  AND o.order_status <> 'cancelled'
GROUP BY 1;

-- 4b. Monthly referral payouts from the ledger
CREATE OR REPLACE VIEW v_referral_payouts_monthly AS
SELECT
  COALESCE(period_month, DATE_TRUNC('month', created_at)::date) AS month,
  reason,
  COALESCE(SUM(delta), 0)::int AS points
FROM points_ledger
WHERE reason IN ('referral_l1', 'referral_l2', 'referral_l3')
GROUP BY 1, 2;

-- 4c. Monthly net profit (the hero metric)
--     net_profit = (gross - points_redeemed) - cost - referral_payouts
CREATE OR REPLACE VIEW v_net_profit_monthly AS
WITH sales AS (
  SELECT
    DATE_TRUNC('month', day)::date AS month,
    SUM(gross_revenue)   AS gross_revenue,
    SUM(net_revenue)     AS net_revenue,
    SUM(total_cost)      AS total_cost,
    SUM(points_redeemed) AS points_redeemed,
    SUM(orders_count)    AS orders_count
  FROM v_sales_daily
  GROUP BY 1
),
payouts AS (
  SELECT month, SUM(points)::numeric AS referral_payout
    FROM v_referral_payouts_monthly
   GROUP BY 1
)
SELECT
  COALESCE(s.month, p.month) AS month,
  COALESCE(s.gross_revenue, 0)   AS gross_revenue,
  COALESCE(s.net_revenue, 0)     AS net_revenue,
  COALESCE(s.total_cost, 0)      AS total_cost,
  COALESCE(s.points_redeemed, 0) AS points_redeemed,
  COALESCE(s.orders_count, 0)    AS orders_count,
  COALESCE(p.referral_payout, 0) AS referral_payout,
  (COALESCE(s.net_revenue, 0) - COALESCE(s.total_cost, 0) - COALESCE(p.referral_payout, 0))
                                  AS net_profit
FROM sales s
FULL OUTER JOIN payouts p ON p.month = s.month;

-- 4d. Points liability — outstanding obligation to users
CREATE OR REPLACE VIEW v_points_liability AS
SELECT
  COALESCE(SUM(delta) FILTER (WHERE delta > 0), 0)::int  AS points_issued,
  COALESCE(-SUM(delta) FILTER (WHERE delta < 0), 0)::int AS points_redeemed,
  COALESCE(SUM(delta), 0)::int                            AS outstanding,
  CASE
    WHEN SUM(delta) FILTER (WHERE delta > 0) > 0
      THEN (-SUM(delta) FILTER (WHERE delta < 0))::numeric / SUM(delta) FILTER (WHERE delta > 0)
    ELSE 0
  END::numeric AS burn_ratio
FROM points_ledger pl
LEFT JOIN user_profiles up ON up.id = pl.user_id
WHERE up.frozen IS NOT TRUE;

-- 4e. Per-product profitability
--     Allocates referral payouts proportionally by product revenue share within qualifying orders.
CREATE OR REPLACE VIEW v_product_profit AS
WITH order_lines AS (
  SELECT
    o.id                                            AS order_id,
    o.created_at,
    o.referral_qualifying,
    NULLIF(item->>'product_id', '')::uuid           AS product_id,
    COALESCE((item->>'quantity')::numeric, 1)       AS quantity,
    COALESCE((item->>'price')::numeric, 0)          AS unit_price,
    COALESCE((item->>'price')::numeric, 0) *
      COALESCE((item->>'quantity')::numeric, 1)     AS line_revenue,
    COALESCE(pv.cost, p.cost, 0) *
      COALESCE((item->>'quantity')::numeric, 1)     AS line_cost
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.order_items) AS item
  LEFT JOIN product_variations pv ON pv.id = NULLIF(item->>'variation_id', '')::uuid
  LEFT JOIN products p            ON p.id  = NULLIF(item->>'product_id', '')::uuid
  LEFT JOIN user_profiles up      ON up.id = o.user_id
  WHERE o.order_status <> 'cancelled'
    AND (up.frozen IS NOT TRUE)
),
payouts_per_order AS (
  -- total referral payout attributable to a given invitee's orders for the month they were credited
  SELECT
    pl.source_order_id,
    SUM(pl.delta)::numeric AS payout_points
  FROM points_ledger pl
  WHERE pl.reason IN ('referral_l1', 'referral_l2', 'referral_l3')
    AND pl.source_order_id IS NOT NULL
  GROUP BY 1
),
allocated AS (
  SELECT
    ol.product_id,
    ol.quantity,
    ol.line_revenue,
    ol.line_cost,
    -- prorate payout across this order's qualifying lines by revenue share
    CASE
      WHEN ol.referral_qualifying AND ppo.payout_points IS NOT NULL THEN
        ppo.payout_points *
          (ol.line_revenue / NULLIF(SUM(ol.line_revenue) OVER (PARTITION BY ol.order_id), 0))
      ELSE 0
    END AS allocated_payout
  FROM order_lines ol
  LEFT JOIN payouts_per_order ppo ON ppo.source_order_id = ol.order_id
)
SELECT
  p.id                                          AS product_id,
  p.name                                        AS product_name,
  COALESCE(SUM(a.quantity), 0)::numeric         AS units_sold,
  COALESCE(SUM(a.line_revenue), 0)::numeric     AS gross_revenue,
  COALESCE(SUM(a.line_cost), 0)::numeric        AS total_cost,
  COALESCE(SUM(a.allocated_payout), 0)::numeric AS referral_payout,
  (COALESCE(SUM(a.line_revenue), 0)
     - COALESCE(SUM(a.line_cost), 0)
     - COALESCE(SUM(a.allocated_payout), 0))::numeric AS real_profit
FROM products p
LEFT JOIN allocated a ON a.product_id = p.id
GROUP BY p.id, p.name;

-- ============================================================================
-- 5. Grant read access via PostgREST (views inherit table RLS; orders/products
--    are not RLS-locked, so admin-only gating happens at the app layer — same
--    pattern as the rest of AdminDashboard).
-- ============================================================================
GRANT SELECT ON v_sales_daily              TO anon, authenticated;
GRANT SELECT ON v_referral_payouts_monthly TO anon, authenticated;
GRANT SELECT ON v_net_profit_monthly       TO anon, authenticated;
GRANT SELECT ON v_points_liability         TO anon, authenticated;
GRANT SELECT ON v_product_profit           TO anon, authenticated;
