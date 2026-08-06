// ─────────────────────────────────────────────────────
// Points redemption gate
//
// Points are worth 1 pt = P1 (see lib/rewards.ts). A customer may only spend
// points once the order reaches POINTS_MIN_ORDER_TOTAL.
//
// The threshold is measured on the post-promo subtotal AFTER any promo-code
// discount and BEFORE shipping. That matches the cap basis already used in
// Checkout and the promo_codes.min_purchase_amount convention, and it stops
// a shipping fee from being used to reach the threshold.
//
// The gate is enforced again server-side (see the points_min_order migration)
// because this client-side cap is trivially bypassable from the console.
// ─────────────────────────────────────────────────────

export const POINTS_MIN_ORDER_TOTAL = 3999;

const toSafeAmount = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

// Ceiling on points redeemable against an order: zero below the threshold,
// otherwise capped by both the customer's balance and the order value.
export const getMaxRedeemablePoints = (
  pointsBalance: number,
  subtotalAfterDiscount: number
): number => {
  const balance = toSafeAmount(pointsBalance);
  const subtotal = toSafeAmount(subtotalAfterDiscount);
  if (subtotal < POINTS_MIN_ORDER_TOTAL) return 0;
  return Math.min(balance, subtotal);
};

// How much more the customer must spend before points unlock. Zero once the
// gate is open. Drives the "Spend PX more to use your points" nudge.
export const getPointsGateShortfall = (subtotalAfterDiscount: number): number =>
  Math.max(0, POINTS_MIN_ORDER_TOTAL - toSafeAmount(subtotalAfterDiscount));
