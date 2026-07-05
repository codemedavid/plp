import { describe, it, expect } from 'vitest';
import type { Product, ProductVariation } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import {
  getBundleDiscountRate,
  getRegularUnitPrice,
  getEffectiveUnitPrice,
  getBundleSavings,
  qualifiesForFreeShipping,
  FREE_SHIPPING_MIN_QTY,
} from '../lib/bundlePricing';

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

describe('getEffectiveUnitPrice', () => {
  it('charges regular price for 1 bottle', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 1)).toBe(4999);
  });

  it('applies 10% off per unit at 2 bottles', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 2)).toBeCloseTo(4999 * 0.9);
  });

  it('applies 15% off per unit at 3+ bottles', () => {
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 3)).toBeCloseTo(4999 * 0.85);
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'vial_only', 5)).toBeCloseTo(4999 * 0.85);
  });

  it('stacks the bundle discount on top of an active product sale price', () => {
    // discountedProduct sells at 2000; 2 bottles => 10% off => 1800
    expect(getEffectiveUnitPrice(discountedProduct, undefined, 'vial_only', 2)).toBeCloseTo(1800);
  });

  it('adds the kit upgrade fee after discounting the product price', () => {
    // 2 bottles: (4999 * 0.9) + 150 kit fee
    expect(getEffectiveUnitPrice(baseProduct, undefined, 'complete_kit', 2)).toBeCloseTo(
      4999 * 0.9 + KIT_UPGRADE_PRICE
    );
  });

  it('lets an explicit admin tier price override the auto discount', () => {
    // adminTierProduct pinned 2-pack at 8000 total => 4000/unit, beats auto 5000*0.9=4500
    expect(getEffectiveUnitPrice(adminTierProduct, undefined, 'vial_only', 2)).toBe(4000);
  });
});

// ─────────────────────────────────────────────────────
// getBundleSavings — totals + percentage for display
// ─────────────────────────────────────────────────────

describe('getBundleSavings', () => {
  it('reports no savings for a single bottle', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 1);
    expect(s.hasSavings).toBe(false);
    expect(s.pct).toBe(0);
    expect(s.discountedTotal).toBe(4999);
    expect(s.originalTotal).toBe(4999);
  });

  it('reports 10% savings for 2 bottles', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 2);
    expect(s.hasSavings).toBe(true);
    expect(s.pct).toBe(10);
    expect(s.originalTotal).toBe(4999 * 2);
    expect(s.discountedTotal).toBeCloseTo(4999 * 2 * 0.9);
  });

  it('reports 15% savings for 3 bottles', () => {
    const s = getBundleSavings(baseProduct, undefined, 'vial_only', 3);
    expect(s.pct).toBe(15);
    expect(s.discountedTotal).toBeCloseTo(4999 * 3 * 0.85);
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
