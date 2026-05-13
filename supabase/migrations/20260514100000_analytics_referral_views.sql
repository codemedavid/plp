-- Chunk 2 analytics: per-referrer stats, network L1/L2/L3 breakdown, signup→purchase funnel.

-- ============================================================================
-- v_network_levels — per (inviter, level) breakdown of their downline
--   level 1 = direct invitees, 2 = invitees-of-invitees, 3 = three deep.
-- ============================================================================
CREATE OR REPLACE VIEW v_network_levels AS
WITH RECURSIVE tree AS (
  SELECT
    up.referred_by AS inviter_id,
    up.id          AS invitee_id,
    1              AS level
  FROM user_profiles up
  WHERE up.referred_by IS NOT NULL
    AND up.frozen IS NOT TRUE
  UNION ALL
  SELECT
    t.inviter_id,
    up.id,
    t.level + 1
  FROM tree t
  JOIN user_profiles up ON up.referred_by = t.invitee_id
  WHERE t.level < 3
    AND up.frozen IS NOT TRUE
),
order_stats AS (
  SELECT
    o.user_id,
    COUNT(*) FILTER (
      WHERE o.referral_qualifying AND o.order_status <> 'cancelled'
    )::int AS qual_orders,
    COALESCE(SUM(o.total_price) FILTER (
      WHERE o.referral_qualifying AND o.order_status <> 'cancelled'
    ), 0)::numeric AS revenue
  FROM orders o
  WHERE o.user_id IS NOT NULL
  GROUP BY o.user_id
),
payouts AS (
  SELECT
    pl.user_id                    AS inviter_id,
    pl.source_referral_invitee_id AS invitee_id,
    pl.reason,
    SUM(pl.delta)::int            AS points
  FROM points_ledger pl
  WHERE pl.reason IN ('referral_l1','referral_l2','referral_l3')
  GROUP BY 1, 2, 3
)
SELECT
  t.inviter_id,
  t.level,
  COUNT(DISTINCT t.invitee_id)::int       AS invitees,
  COALESCE(SUM(os.qual_orders), 0)::int   AS orders,
  COALESCE(SUM(os.revenue), 0)::numeric   AS revenue,
  COALESCE(SUM(p.points), 0)::int         AS points_paid
FROM tree t
LEFT JOIN order_stats os ON os.user_id = t.invitee_id
LEFT JOIN payouts p
       ON p.inviter_id = t.inviter_id
      AND p.invitee_id = t.invitee_id
      AND p.reason     = 'referral_l' || t.level
GROUP BY t.inviter_id, t.level;

-- ============================================================================
-- v_referrer_stats — one row per user who has at least one direct invitee.
-- ============================================================================
CREATE OR REPLACE VIEW v_referrer_stats AS
SELECT
  up.id                                            AS inviter_id,
  up.referral_code,
  up.full_name,
  COALESCE(SUM(nl.invitees) FILTER (WHERE nl.level = 1), 0)::int AS direct_invitees,
  COALESCE(SUM(nl.invitees), 0)::int               AS total_network,
  COALESCE(SUM(nl.orders), 0)::int                 AS network_orders,
  COALESCE(SUM(nl.revenue), 0)::numeric            AS network_revenue,
  COALESCE(SUM(nl.points_paid), 0)::int            AS points_earned,
  CASE
    WHEN SUM(nl.points_paid) > 0
      THEN (SUM(nl.revenue) / SUM(nl.points_paid))::numeric
    ELSE 0
  END                                              AS roi
FROM user_profiles up
LEFT JOIN v_network_levels nl ON nl.inviter_id = up.id
WHERE up.frozen IS NOT TRUE
GROUP BY up.id, up.referral_code, up.full_name
HAVING COALESCE(SUM(nl.invitees) FILTER (WHERE nl.level = 1), 0) > 0;

-- ============================================================================
-- v_funnel — overall signup → purchase funnel, plus referred-cohort breakdown.
-- ============================================================================
CREATE OR REPLACE VIEW v_funnel AS
WITH base AS (
  SELECT
    (COUNT(*) FILTER (WHERE frozen IS NOT TRUE))::int                                    AS signups,
    (COUNT(*) FILTER (WHERE frozen IS NOT TRUE AND referred_by IS NOT NULL))::int        AS referred_signups,
    (COUNT(*) FILTER (WHERE frozen IS NOT TRUE AND first_order_at IS NOT NULL))::int     AS signups_with_order,
    (COUNT(*) FILTER (
      WHERE frozen IS NOT TRUE AND referred_by IS NOT NULL AND first_order_at IS NOT NULL
    ))::int                                                                              AS referred_with_order
  FROM user_profiles
),
repeats AS (
  SELECT COUNT(*)::int AS repeat_buyers FROM (
    SELECT user_id
      FROM orders
     WHERE user_id IS NOT NULL AND order_status <> 'cancelled'
     GROUP BY user_id
    HAVING COUNT(*) >= 2
  ) sub
)
SELECT b.*, r.repeat_buyers FROM base b CROSS JOIN repeats r;

GRANT SELECT ON v_network_levels  TO anon, authenticated;
GRANT SELECT ON v_referrer_stats  TO anon, authenticated;
GRANT SELECT ON v_funnel          TO anon, authenticated;
