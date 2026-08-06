import { describe, it, expect } from 'vitest';
import {
  POINTS_MIN_ORDER_TOTAL,
  getMaxRedeemablePoints,
  getPointsGateShortfall,
} from '../lib/pointsRedemption';

// ─────────────────────────────────────────────────────
// Points redemption gate
//
// A customer may only spend points once the order reaches
// POINTS_MIN_ORDER_TOTAL. The threshold is measured on the post-promo
// subtotal AFTER any promo-code discount and BEFORE shipping, matching the
// existing cap basis in Checkout.tsx and the promo_codes.min_purchase_amount
// convention.
// ─────────────────────────────────────────────────────

describe('POINTS_MIN_ORDER_TOTAL', () => {
  it('gates redemption at 3999', () => {
    expect(POINTS_MIN_ORDER_TOTAL).toBe(3999);
  });
});

describe('getMaxRedeemablePoints', () => {
  it('allows nothing when the order is one peso below the threshold', () => {
    expect(getMaxRedeemablePoints(5000, 3998)).toBe(0);
  });

  it('unlocks redemption at exactly the threshold', () => {
    expect(getMaxRedeemablePoints(5000, 3999)).toBe(3999);
  });

  it('allows redemption above the threshold', () => {
    expect(getMaxRedeemablePoints(5000, 4000)).toBe(4000);
  });

  it('never redeems more points than the customer holds', () => {
    expect(getMaxRedeemablePoints(500, 10000)).toBe(500);
  });

  it('never redeems more than the order is worth', () => {
    expect(getMaxRedeemablePoints(20000, 6000)).toBe(6000);
  });

  it('allows nothing when the balance is zero', () => {
    expect(getMaxRedeemablePoints(0, 10000)).toBe(0);
  });

  it('treats a negative balance as zero rather than a credit', () => {
    expect(getMaxRedeemablePoints(-500, 10000)).toBe(0);
  });

  it('allows nothing on an empty cart', () => {
    expect(getMaxRedeemablePoints(5000, 0)).toBe(0);
  });

  it('guards against a negative subtotal', () => {
    expect(getMaxRedeemablePoints(5000, -100)).toBe(0);
  });

  it('guards against NaN inputs', () => {
    expect(getMaxRedeemablePoints(Number.NaN, 5000)).toBe(0);
    expect(getMaxRedeemablePoints(5000, Number.NaN)).toBe(0);
  });

  it('measures the gate after a promo code discount, not before it', () => {
    // Subtotal 4,200 post-promo, minus a 300 promo code = 3,900 basis -> locked.
    expect(getMaxRedeemablePoints(5000, 4200 - 300)).toBe(0);
  });
});

describe('getPointsGateShortfall', () => {
  it('reports how much more the customer must spend to unlock points', () => {
    expect(getPointsGateShortfall(3900)).toBe(99);
  });

  it('reports the full threshold for an empty cart', () => {
    expect(getPointsGateShortfall(0)).toBe(POINTS_MIN_ORDER_TOTAL);
  });

  it('reports no shortfall once the gate is open', () => {
    expect(getPointsGateShortfall(3999)).toBe(0);
    expect(getPointsGateShortfall(10000)).toBe(0);
  });
});
