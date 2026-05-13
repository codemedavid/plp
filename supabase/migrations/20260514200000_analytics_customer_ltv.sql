-- Chunk 3 analytics: per-customer lifetime value + monthly payout breakdown
-- for the simulator (so the modal can read raw per-month/per-level points).

-- ============================================================================
-- v_customer_ltv — one row per known user
-- ============================================================================
CREATE OR REPLACE VIEW v_customer_ltv AS
WITH order_agg AS (
  SELECT
    o.user_id,
    COUNT(*)::int                       AS orders,
    COALESCE(SUM(o.total_price), 0)::numeric AS gross_spent,
    COALESCE(SUM(o.points_redeemed), 0)::int AS points_redeemed,
    MIN(o.created_at)                   AS first_order_at,
    MAX(o.created_at)                   AS last_order_at
  FROM orders o
  WHERE o.user_id IS NOT NULL
    AND o.order_status <> 'cancelled'
  GROUP BY o.user_id
),
points_agg AS (
  SELECT
    pl.user_id,
    COALESCE(SUM(pl.delta) FILTER (WHERE pl.delta > 0), 0)::int AS points_earned
  FROM points_ledger pl
  GROUP BY pl.user_id
)
SELECT
  up.id                                AS user_id,
  up.referral_code,
  up.full_name,
  up.phone,
  (up.referred_by IS NOT NULL)         AS is_referred,
  COALESCE(oa.orders, 0)               AS orders,
  COALESCE(oa.gross_spent, 0)          AS gross_spent,
  COALESCE(oa.points_redeemed, 0)      AS points_redeemed,
  COALESCE(pa.points_earned, 0)        AS points_earned,
  oa.first_order_at,
  oa.last_order_at,
  up.created_at                        AS signed_up_at
FROM user_profiles up
LEFT JOIN order_agg oa ON oa.user_id = up.id
LEFT JOIN points_agg pa ON pa.user_id = up.id
WHERE up.frozen IS NOT TRUE;

-- ============================================================================
-- v_referral_payout_detail — every referral ledger row, keyed by (inviter, invitee, level, month).
--    Used by the payout simulator to recompute hypothetical payouts.
-- ============================================================================
CREATE OR REPLACE VIEW v_referral_payout_detail AS
SELECT
  pl.user_id                       AS inviter_id,
  pl.source_referral_invitee_id    AS invitee_id,
  pl.reason                        AS reason,
  CASE pl.reason
    WHEN 'referral_l1' THEN 1
    WHEN 'referral_l2' THEN 2
    WHEN 'referral_l3' THEN 3
  END                              AS level,
  pl.period_month                  AS month,
  pl.delta                         AS points
FROM points_ledger pl
LEFT JOIN user_profiles up ON up.id = pl.user_id
WHERE pl.reason IN ('referral_l1','referral_l2','referral_l3')
  AND up.frozen IS NOT TRUE;

GRANT SELECT ON v_customer_ltv          TO anon, authenticated;
GRANT SELECT ON v_referral_payout_detail TO anon, authenticated;
