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

// ─────────────────────────────────────────────────────
// 8.8 sitewide promo — 50% off, Aug 7 -> Aug 9 PHT inclusive
//
// The promo REPLACES the bundle-quantity schedule rather than stacking with
// it, so a promo SKU never goes deeper than 50% off list. The window is
// half-open: active from START up to but not including END, so Aug 9 is a
// full selling day and the promo expires on its own at Aug 10 00:00 PHT
// with no deploy.
//
// An ACTIVE admin sale price opts its SKU out of the promo entirely (see
// hasActiveSalePrice). Merchandising types a price in admin to have that
// exact price shown; silently undercutting it left their edits invisible
// for the whole window. Opted-out SKUs price exactly as they do outside
// the promo, quantity schedule and all.
//
// Free shipping is deliberately untouched — it keys off cart quantity
// (qualifiesForFreeShipping), so it is a shipping perk, not a price discount.
// ─────────────────────────────────────────────────────

export const PROMO_88_RATE = 0.5;
export const PROMO_88_START = new Date('2026-08-07T00:00:00+08:00');
export const PROMO_88_END = new Date('2026-08-10T00:00:00+08:00');

export const isPromo88Active = (now: Date = new Date()): boolean =>
  now.getTime() >= PROMO_88_START.getTime() && now.getTime() < PROMO_88_END.getTime();

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

// True when the SKU being priced carries a live admin sale price. Evaluated
// against the chosen variation when there is one, since that variation — not
// its parent product — is what the customer is buying. A sale price that is
// stored but switched off is not live and does not count.
const hasActiveSalePrice = (
  product: Product,
  variation?: ProductVariation
): boolean =>
  variation
    ? variation.discount_active && variation.discount_price != null
    : product.discount_active && product.discount_price != null;

// Per-unit selling price while the 8.8 promo is running: half the LIST price
// (base_price, or the variation price). A SKU with a live admin sale price is
// opted out and keeps that price, whether it is shallower or deeper than half.
// Outside the window this is just the regular price.
export const getPromoUnitPrice = (
  product: Product,
  variation?: ProductVariation,
  now: Date = new Date()
): number => {
  const regularUnit = getRegularUnitPrice(product, variation);
  if (!isPromo88Active(now)) return regularUnit;
  if (hasActiveSalePrice(product, variation)) return regularUnit;
  const listUnit = variation ? variation.price : product.base_price;
  return listUnit * PROMO_88_RATE;
};

// Per-unit price including bundle discount and kit upgrade.
// Precedence during the 8.8 promo, for SKUs the promo applies to: the flat
// 50% replaces both the admin tier price and the automatic quantity discount
// (they never stack). A SKU opted out by a live admin sale price falls
// through to the regular path below, exactly as it prices outside the window.
// Regular path: explicit admin tier price (if set) > automatic discount.
// Either way the flat kit upgrade fee is added afterwards, undiscounted.
export const getEffectiveUnitPrice = (
  product: Product,
  variation: ProductVariation | undefined,
  kitType: KitType,
  quantity: number,
  now: Date = new Date()
): number => {
  const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;

  if (isPromo88Active(now) && !hasActiveSalePrice(product, variation)) {
    return getPromoUnitPrice(product, variation, now) + kitUpgrade;
  }

  const tier = getMatchingBundleTier(product, quantity);
  const regularUnit = getRegularUnitPrice(product, variation);
  const baseUnit = tier
    ? tier.price! / tier.qty
    : regularUnit * (1 - getBundleDiscountRate(quantity));
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
  quantity: number,
  now: Date = new Date()
): BundleSavings => {
  const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
  // originalTotal deliberately uses the pre-promo regular price so the
  // strikethrough and SAVE % show the full 50% the customer is getting.
  const originalTotal = (getRegularUnitPrice(product, variation) + kitUpgrade) * quantity;
  const discountedTotal = getEffectiveUnitPrice(product, variation, kitType, quantity, now) * quantity;
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
