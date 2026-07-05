import type { BundleTier, KitType, Product, ProductVariation } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';

// ─────────────────────────────────────────────────────
// Automatic bundle promo schedule (per product line quantity)
//   1 bottle  -> regular price
//   2 bottles -> 10% off
//   3+ bottles -> 15% off + free shipping (cart-wide)
// Admins no longer type bundle prices; they derive from the unit price.
// An explicit per-product tier price still overrides this (see getEffectiveUnitPrice).
// ─────────────────────────────────────────────────────

export const BUNDLE_2_DISCOUNT = 0.1;
export const BUNDLE_3_PLUS_DISCOUNT = 0.15;

// Cart-wide bottle count that unlocks free shipping.
export const FREE_SHIPPING_MIN_QTY = 3;

// Auto discount rate for a given line quantity.
export const getBundleDiscountRate = (quantity: number): number => {
  if (quantity >= FREE_SHIPPING_MIN_QTY) return BUNDLE_3_PLUS_DISCOUNT;
  if (quantity === 2) return BUNDLE_2_DISCOUNT;
  return 0;
};

const isUsableTierPrice = (tier: BundleTier): boolean =>
  typeof tier.price === 'number' && Number.isFinite(tier.price) && tier.price > 0;

export const getMatchingBundleTier = (
  product: Product | undefined | null,
  quantity: number
): BundleTier | undefined => {
  if (!product?.bundle_tiers || product.bundle_tiers.length === 0) return undefined;
  return product.bundle_tiers.find(
    (tier) => tier.qty === quantity && isUsableTierPrice(tier)
  );
};

export const getRegularUnitPrice = (
  product: Product,
  variation?: ProductVariation
): number => {
  if (variation) {
    return variation.discount_active && variation.discount_price != null
      ? variation.discount_price
      : variation.price;
  }
  return product.discount_active && product.discount_price != null
    ? product.discount_price
    : product.base_price;
};

// Per-unit price including bundle discount and kit upgrade.
// Precedence: explicit admin tier price (if set) > automatic promo discount.
// The bundle discount applies to the product price only; the flat kit upgrade
// fee is added afterwards.
export const getEffectiveUnitPrice = (
  product: Product,
  variation: ProductVariation | undefined,
  kitType: KitType,
  quantity: number
): number => {
  const tier = getMatchingBundleTier(product, quantity);
  const regularUnit = getRegularUnitPrice(product, variation);
  const baseUnit = tier
    ? tier.price! / tier.qty
    : regularUnit * (1 - getBundleDiscountRate(quantity));
  const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
  return baseUnit + kitUpgrade;
};

export interface BundleSavings {
  // Line total the customer actually pays (bundle discount applied).
  discountedTotal: number;
  // Line total at the regular per-unit price (no bundle discount).
  originalTotal: number;
  // Rounded percentage saved on the line, 0 when there is no saving.
  pct: number;
  // True when the discounted total is strictly cheaper than the original.
  hasSavings: boolean;
}

// Shared savings calculation for PDP, cart, and checkout so the strikethrough
// and SAVE % are always consistent.
export const getBundleSavings = (
  product: Product,
  variation: ProductVariation | undefined,
  kitType: KitType,
  quantity: number
): BundleSavings => {
  const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
  const originalTotal = (getRegularUnitPrice(product, variation) + kitUpgrade) * quantity;
  const discountedTotal = getEffectiveUnitPrice(product, variation, kitType, quantity) * quantity;
  const hasSavings = discountedTotal < originalTotal;
  const pct = hasSavings && originalTotal > 0
    ? Math.round((1 - discountedTotal / originalTotal) * 100)
    : 0;
  return { discountedTotal, originalTotal, pct, hasSavings };
};

// Free shipping unlocks once the cart holds FREE_SHIPPING_MIN_QTY bottles in total.
export const qualifiesForFreeShipping = (
  items: ReadonlyArray<{ quantity: number }>
): boolean => {
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  return totalQty >= FREE_SHIPPING_MIN_QTY;
};
