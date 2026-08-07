import { describe, it, expect } from 'vitest';
import type { Product, ProductVariation } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import {
  getBundleDiscountRate,
  getRegularUnitPrice,
  getPromoUnitPrice,
  getEffectiveUnitPrice,
  getBundleSavings,
  qualifiesForFreeShipping,
  isPromo88Active,
  FREE_SHIPPING_MIN_QTY,
  PROMO_88_RATE,
} from '../lib/bundlePricing';

// The 8.8 sale runs Aug 7 00:00 -> Aug 10 00:00 PHT (Aug 9 is a full selling day).
// Every pricing assertion pins an explicit `now` so the suite stays deterministic
// once the window closes; without it these tests would change behaviour on Aug 10.
const DURING_PROMO = new Date('2026-08-09T12:00:00+08:00');
const OFF_PROMO = new Date('2026-09-01T00:00:00+08:00');

// ─────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────

const baseProduct: Product = {
  id: 'prod-1',
  name: 'BPC-157',
  description: 'Test peptide',
  category: 'peptides',
  base_price: 4999,
  discount_price: null,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: false,
  purity_percentage: 99,
  molecular_weight: null,
  cas_number: null,
  sequence: null,
  storage_conditions: null,
  inclusions: null,
  stock_quantity: 20,
  available: true,
  featured: false,
  is_new: false,
  highlighted: false,
  image_url: null,
  safety_sheet_url: null,
  coa_url: null,
  paired_product_ids: [],
  bundle_tiers: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const discountedProduct: Product = {
  ...baseProduct,
  id: 'prod-2',
  base_price: 2500,
  discount_price: 2000,
  discount_active: true,
};

// Product whose admin manually pinned an explicit 2-pack price (override wins)
const adminTierProduct: Product = {
  ...baseProduct,
  id: 'prod-3',
  base_price: 5000,
  bundle_tiers: [
    { qty: 1, label: '1 BOTTLE' },
    { qty: 2, label: '2 BOTTLES', popular: true, price: 8000 },
  ],
};

const variation: ProductVariation = {
  id: 'var-1',
  product_id: 'prod-1',
  name: '10mg',
  quantity_mg: 10,
  price: 3000,
  cost: null,
  disposable_pen_price: null,
  reusable_pen_price: null,
  discount_price: null,
  discount_active: false,
  stock_quantity: 10,
  created_at: '2024-01-01',
};

// ─────────────────────────────────────────────────────
// getBundleDiscountRate — the promo schedule
// ─────────────────────────────────────────────────────

describe('getBundleDiscountRate', () => {
  it('gives no discount for a single bottle', () => {
    expect(getBundleDiscountRate(1)).toBe(0);
  });

  it('gives 10% off for 2 bottles', () => {
    expect(getBundleDiscountRate(2)).toBeCloseTo(0.1);
  });

  it('gives 15% off for exactly 3 bottles', () => {
    expect(getBundleDiscountRate(3)).toBeCloseTo(0.15);
  });

  it('keeps 15% off for more than 3 bottles (open-ended)', () => {
    expect(getBundleDiscountRate(4)).toBeCloseTo(0.15);
    expect(getBundleDiscountRate(10)).toBeCloseTo(0.15);
  });

  it('treats zero or negative quantity as no discount', () => {
    expect(getBundleDiscountRate(0)).toBe(0);
    expect(getBundleDiscountRate(-1)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────
// getRegularUnitPrice — undiscounted selling price
// ─────────────────────────────────────────────────────

describe('getRegularUnitPrice', () => {
  it('returns base price when no discount', () => {
    expect(getRegularUnitPrice(baseProduct)).toBe(4999);
  });

  it('returns active discount price', () => {
    expect(getRegularUnitPrice(discountedProduct)).toBe(2000);
  });

  it('returns variation price when a variation is chosen', () => {
    expect(getRegularUnitPrice(baseProduct, variation)).toBe(3000);
  });
});

// ─────────────────────────────────────────────────────
// getEffectiveUnitPrice — auto bundle discount applied per unit
// ─────────────────────────────────────────────────────

describe('getEffectiveUnitPrice (outside the 8.8 promo)', () => {
  it('charges regular price for 1 bottle', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 1, OFF_PROMO)).toBe(4999);
  });

  it('applies 10% off per unit at 2 bottles', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 2, OFF_PROMO)).toBeCloseTo(
      4999 * 0.9
    );
  });

  it('applies 15% off per unit at 3+ bottles', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 3, OFF_PROMO)).toBeCloseTo(
      4999 * 0.85
    );
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 5, OFF_PROMO)).toBeCloseTo(
      4999 * 0.85
    );
  });

  it('stacks the bundle discount on top of an active product sale price', () => {
    // discountedProduct sells at 2000; 2 bottles => 10% off => 1800
    expect(getEffectiveUnitPrice(discountedProduct, undefined, 'vial_only', 2, OFF_PROMO)).toBeCloseTo(
      1800
    );
  });

  it('adds the kit upgrade fee after discounting the product price', () => {
    // 2 bottles: (4999 * 0.9) + 150 kit fee
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'complete_kit', 2, OFF_PROMO)).toBeCloseTo(
      4999 * 0.9 + KIT_UPGRADE_PRICE
    );
  });

  it('lets an explicit admin tier price override the auto discount', () => {
    // adminTierProduct pinned 2-pack at 8000 total => 4000/unit, beats auto 5000*0.9=4500
    expect(getEffectiveUnitPrice(adminTierProduct, undefined, 'vial_only', 2, OFF_PROMO)).toBe(4000);
  });
});

// ─────────────────────────────────────────────────────
// getBundleSavings — totals + percentage for display
// ─────────────────────────────────────────────────────

describe('getBundleSavings (outside the 8.8 promo)', () => {
  it('reports no savings for a single bottle', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 1, OFF_PROMO);
    expect(s.hasSavings).toBe(false);
    expect(s.pct).toBe(0);
    expect(s.discountedTotal).toBe(4999);
    expect(s.originalTotal).toBe(4999);
  });

  it('reports 10% savings for 2 bottles', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 2, OFF_PROMO);
    expect(s.hasSavings).toBe(true);
    expect(s.pct).toBe(10);
    expect(s.originalTotal).toBe(4999 * 2);
    expect(s.discountedTotal).toBeCloseTo(4999 * 2 * 0.9);
  });

  it('reports 15% savings for 3 bottles', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 3, OFF_PROMO);
    expect(s.pct).toBe(15);
    expect(s.discountedTotal).toBeCloseTo(4999 * 3 * 0.85);
  });
});

// ─────────────────────────────────────────────────────
// 8.8 sitewide promo — 50% off base price, Aug 7-11 PHT
// Policy: the promo REPLACES bundle-quantity discounts; it never stacks
// with them. An ACTIVE admin sale price opts the SKU out of the promo
// entirely, so the price merchandising set is the price customers see.
// Free shipping is a shipping perk (cart quantity), not a price discount,
// so it still applies.
// ─────────────────────────────────────────────────────

// Mirrors the live PLP-Slim (Tirzepatide 15mg) row: admin-pinned tiers that
// are all more expensive than half price, so the promo must win.
const promoRegressionProduct: Product = {
  ...baseProduct,
  id: 'prod-plp-slim-15',
  name: 'PLP-Slim (Tirzepatide 15mg)',
  base_price: 3999,
  bundle_tiers: [
    { qty: 2, label: '1 BOTTLE', price: 6000 },
    { qty: 3, label: '3 BOTTLES', price: 8500 },
  ],
};

// Hypothetical clearance SKU already cheaper than 50% off base. The promo
// must never RAISE a price, so the deeper existing sale price wins.
const deepSaleProduct: Product = {
  ...baseProduct,
  id: 'prod-deep-sale',
  base_price: 4000,
  discount_price: 1200, // 70% off, deeper than the 50% promo
  discount_active: true,
};

// Mirrors the live PLP-Slim (Tirzepatide 15mg) row after merchandising set a
// sale price mid-promo. Half of base (1999.50) is deeper than the 2499 they
// typed, so under a "cheapest always wins" rule their price stays invisible.
const adminSaleProduct: Product = {
  ...baseProduct,
  id: 'prod-plp-slim-15-sale',
  name: 'PLP-Slim (Tirzepatide 15mg)',
  base_price: 3999,
  discount_price: 2499,
  discount_active: true,
};

// Mirrors the live PLP-Slim 2.0 row: a sale price is stored but switched OFF,
// so it must not opt the SKU out of the promo.
const inactiveSaleProduct: Product = {
  ...baseProduct,
  id: 'prod-plp-slim-2',
  name: 'PLP-Slim 2.0',
  base_price: 9499,
  discount_price: 5499,
  discount_active: false,
};

// Variation carrying its own active sale price, to prove the opt-out is
// evaluated per chosen SKU rather than only at product level.
const saleVariation: ProductVariation = {
  ...variation,
  id: 'var-sale',
  price: 3000,
  discount_price: 2100,
  discount_active: true,
};

describe('isPromo88Active', () => {
  it('exposes the promo rate as 50%', () => {
    expect(PROMO_88_RATE).toBe(0.5);
  });

  it('is inactive the moment before the window opens', () => {
    expect(isPromo88Active(new Date('2026-08-06T23:59:59+08:00'))).toBe(false);
  });

  it('is active at exactly Aug 7 00:00 PHT', () => {
    expect(isPromo88Active(new Date('2026-08-07T00:00:00+08:00'))).toBe(true);
  });

  it('is active through the whole of Aug 9 PHT', () => {
    expect(isPromo88Active(new Date('2026-08-09T23:59:59+08:00'))).toBe(true);
  });

  it('expires at Aug 10 00:00 PHT without a deploy', () => {
    expect(isPromo88Active(new Date('2026-08-10T00:00:00+08:00'))).toBe(false);
  });

  // Aug 10 and 11 were the previous (wrong) window; guard against a revert.
  it('is inactive on Aug 10 and Aug 11 PHT', () => {
    expect(isPromo88Active(new Date('2026-08-10T12:00:00+08:00'))).toBe(false);
    expect(isPromo88Active(new Date('2026-08-11T23:59:59+08:00'))).toBe(false);
  });
});

describe('getPromoUnitPrice', () => {
  it('halves the base price during the promo', () => {
    expect(getPromoUnitPrice(baseProduct, undefined, DURING_PROMO)).toBeCloseTo(4999 * 0.5);
  });

  it('halves the variation price when a variation is chosen', () => {
    expect(getPromoUnitPrice(baseProduct, variation, DURING_PROMO)).toBeCloseTo(3000 * 0.5);
  });

  it('honours an active per-product sale price instead of halving base', () => {
    // discountedProduct: base 2500, sale 2000. Half of base is 1250, but an
    // active sale price opts the SKU out of the promo — merchandising wins.
    expect(getPromoUnitPrice(discountedProduct, undefined, DURING_PROMO)).toBe(2000);
  });

  it('shows the admin sale price for a live PLP-Slim SKU during the promo', () => {
    // The reported bug: admin set 2499, storefront rendered 1999.50 instead.
    expect(getPromoUnitPrice(adminSaleProduct, undefined, DURING_PROMO)).toBe(2499);
  });

  it('still halves base when a stored sale price is switched off', () => {
    // PLP-Slim 2.0: 5499 is stored but discount_active is false, so it is
    // not a live price and must not opt the SKU out of the promo.
    expect(getPromoUnitPrice(inactiveSaleProduct, undefined, DURING_PROMO)).toBeCloseTo(4749.5);
  });

  it('honours an active sale price set on the chosen variation', () => {
    expect(getPromoUnitPrice(baseProduct, saleVariation, DURING_PROMO)).toBe(2100);
  });

  it('still halves the variation price when only the parent product is on sale', () => {
    // The variation is the SKU being bought; the parent's sale price does not
    // apply to it, so nothing opts this variation out of the promo.
    expect(getPromoUnitPrice(discountedProduct, variation, DURING_PROMO)).toBeCloseTo(1500);
  });

  it('still halves base when the sale toggle is on but no price was typed', () => {
    // Admin can flip discount_active without filling in discount_price. That
    // is not a usable price, so it must not opt the SKU out of the promo.
    const emptySale: Product = { ...baseProduct, discount_active: true, discount_price: null };
    expect(getPromoUnitPrice(emptySale, undefined, DURING_PROMO)).toBeCloseTo(4999 * 0.5);
  });

  it('never raises a price above an already-deeper sale price', () => {
    // base 4000 -> promo 2000, but the live sale price is 1200. Customer keeps 1200.
    expect(getPromoUnitPrice(deepSaleProduct, undefined, DURING_PROMO)).toBe(1200);
  });

  it('falls back to the regular list price outside the window', () => {
    expect(getPromoUnitPrice(baseProduct, undefined, OFF_PROMO)).toBe(4999);
    expect(getPromoUnitPrice(discountedProduct, undefined, OFF_PROMO)).toBe(2000);
  });
});

describe('getEffectiveUnitPrice (during the 8.8 promo)', () => {
  it('gives a flat 50% off regardless of quantity, never stacking the bundle discount', () => {
    const half = 4999 * 0.5;
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 1, DURING_PROMO)).toBeCloseTo(half);
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 2, DURING_PROMO)).toBeCloseTo(half);
    // Would be 57.5% off if the 15% bundle rate stacked — it must not.
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 3, DURING_PROMO)).toBeCloseTo(half);
  });

  it('suspends admin-pinned bundle tier prices', () => {
    // adminTierProduct pins 2-pack at 4000/unit; promo half of 5000 = 2500 is cheaper.
    expect(getEffectiveUnitPrice(adminTierProduct, undefined, 'vial_only', 2, DURING_PROMO)).toBe(2500);
  });

  it('beats every live PLP-Slim 15mg tier price', () => {
    // Live tier: 3 bottles = 8500. Promo: 3999 * 0.5 * 3 = 5998.50
    const unit = getEffectiveUnitPrice(promoRegressionProduct, undefined, 'vial_only', 3, DURING_PROMO);
    expect(unit * 3).toBeCloseTo(5998.5);
    expect(unit * 3).toBeLessThan(8500);
  });

  it('adds the kit upgrade fee undiscounted on top of the promo price', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'complete_kit', 2, DURING_PROMO)).toBeCloseTo(
      4999 * 0.5 + KIT_UPGRADE_PRICE
    );
  });

  it('charges the admin sale price for a single bottle of an opted-out SKU', () => {
    expect(getEffectiveUnitPrice(adminSaleProduct, undefined, 'vial_only', 1, DURING_PROMO)).toBe(2499);
  });

  it('resumes the bundle-quantity schedule for an opted-out SKU', () => {
    // The promo skips this SKU entirely, so it prices exactly as it would
    // outside the window: the quantity discount stacks on the sale price.
    expect(getEffectiveUnitPrice(adminSaleProduct, undefined, 'vial_only', 2, DURING_PROMO)).toBeCloseTo(
      2499 * 0.9
    );
    expect(getEffectiveUnitPrice(adminSaleProduct, undefined, 'vial_only', 3, DURING_PROMO)).toBeCloseTo(
      2499 * 0.85
    );
  });
});

describe('getBundleSavings (during the 8.8 promo)', () => {
  it('shows a 50% saving against the pre-promo list price on a single bottle', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 1, DURING_PROMO);
    expect(s.hasSavings).toBe(true);
    expect(s.pct).toBe(50);
    expect(s.originalTotal).toBe(4999);
    expect(s.discountedTotal).toBeCloseTo(4999 * 0.5);
  });

  it('still shows 50% (not 57.5%) at 3 bottles', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 3, DURING_PROMO);
    expect(s.pct).toBe(50);
    expect(s.originalTotal).toBe(4999 * 3);
    expect(s.discountedTotal).toBeCloseTo(4999 * 3 * 0.5);
  });

  it('claims no extra saving on a single bottle of an opted-out SKU', () => {
    // The sale price IS the regular price here, so there is nothing further
    // to strike through — the PDP must not render a bogus 0% saving badge.
    const s = getBundleSavings(adminSaleProduct, undefined, 'vial_only', 1, DURING_PROMO);
    expect(s.discountedTotal).toBe(2499);
    expect(s.originalTotal).toBe(2499);
    expect(s.hasSavings).toBe(false);
    expect(s.pct).toBe(0);
  });
});

// Pinned to the real PLP-Slim rows as they stood when the bug was reported,
// so the storefront price for each is asserted end-to-end rather than only
// through synthetic fixtures.
describe('live PLP-Slim line during the 8.8 promo', () => {
  const liveRows: ReadonlyArray<{
    name: string;
    base: number;
    sale: number | null;
    saleActive: boolean;
    expected: number;
  }> = [
    { name: 'PLP-Slim (Tirzepatide 15mg)', base: 3999, sale: 2499, saleActive: true, expected: 2499 },
    { name: 'PLP-Slim (Tirzepatide 20mg)', base: 4499, sale: 2999, saleActive: true, expected: 2999 },
    { name: 'PLP-Slim Tirzepatide 30mg', base: 4999, sale: 3999, saleActive: true, expected: 3999 },
    { name: 'PLP Slim & Glow Bundle', base: 7499, sale: 4899, saleActive: true, expected: 4899 },
    // Sale price stored but switched off -> promo still applies.
    { name: 'PLP-Slim 2.0', base: 9499, sale: 5499, saleActive: false, expected: 4749.5 },
    // No sale price at all -> promo applies.
    { name: 'PLP-Slim Booster Lipo-C with B12', base: 2499, sale: null, saleActive: false, expected: 1249.5 },
  ];

  it.each(liveRows)('prices $name at $expected', ({ name, base, sale, saleActive, expected }) => {
    const row: Product = {
      ...baseProduct,
      id: `live-${name}`,
      name,
      base_price: base,
      discount_price: sale,
      discount_active: saleActive,
    };
    expect(getPromoUnitPrice(row, undefined, DURING_PROMO)).toBeCloseTo(expected);
  });
});

describe('free shipping during the 8.8 promo', () => {
  it('still unlocks at 3+ bottles (a shipping perk, not a price discount)', () => {
    expect(qualifiesForFreeShipping([{ quantity: 3 }])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// qualifiesForFreeShipping — cart-wide 3+ bottles
// ─────────────────────────────────────────────────────

describe('qualifiesForFreeShipping', () => {
  it('exposes the free-shipping threshold as 3', () => {
    expect(FREE_SHIPPING_MIN_QTY).toBe(3);
  });

  it('is false for an empty cart', () => {
    expect(qualifiesForFreeShipping([])).toBe(false);
  });

  it('is false below the threshold', () => {
    expect(qualifiesForFreeShipping([{ quantity: 2 }])).toBe(false);
  });

  it('is true at exactly 3 bottles in one line', () => {
    expect(qualifiesForFreeShipping([{ quantity: 3 }])).toBe(true);
  });

  it('sums quantity across multiple lines', () => {
    expect(qualifiesForFreeShipping([{ quantity: 1 }, { quantity: 1 }, { quantity: 1 }])).toBe(true);
    expect(qualifiesForFreeShipping([{ quantity: 1 }, { quantity: 1 }])).toBe(false);
  });
});
