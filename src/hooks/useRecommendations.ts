import { useMemo } from 'react';
import type { Product, CartItem } from '../types';

interface RecommendationOptions {
  products: Product[];
  cartItems?: CartItem[];
  anchorProduct?: Product;
  limit?: number;
  /**
   * Cross-sell mode. When true, favor product lines (categories) the customer
   * does NOT already have in their cart and spread picks across lines, so the
   * rail introduces other collections instead of more of the same.
   */
  diversify?: boolean;
}

const isInStock = (product: Product): boolean => {
  if (product.variations && product.variations.length > 0) {
    return product.variations.some((v) => v.stock_quantity > 0);
  }
  return product.stock_quantity > 0;
};

const scoreProduct = (
  product: Product,
  anchorCategories: Set<string>,
  cartCategories: Set<string>,
  diversify: boolean
): number => {
  let score = 0;
  if (diversify) {
    // Cross-sell: reward products from lines the customer does not yet have.
    if (!cartCategories.has(product.category)) score += 3;
  } else {
    if (anchorCategories.has(product.category)) score += 4;
    else if (cartCategories.has(product.category)) score += 2;
  }
  if (product.featured) score += 1;
  if (product.discount_active && product.discount_price != null) score += 1;
  return score;
};

export function useRecommendations({
  products,
  cartItems = [],
  anchorProduct,
  limit = 4,
  diversify = false,
}: RecommendationOptions): Product[] {
  return useMemo(() => {
    if (!products || products.length === 0) return [];

    const excludedIds = new Set<string>();
    if (anchorProduct) excludedIds.add(anchorProduct.id);
    cartItems.forEach((item) => excludedIds.add(item.product.id));

    const productById = new Map(products.map((p) => [p.id, p]));
    const result: Product[] = [];

    // 1. Admin-curated pairings on the anchor product, in chosen order.
    const manualIds = anchorProduct?.paired_product_ids ?? [];
    for (const id of manualIds) {
      if (result.length >= limit) break;
      if (excludedIds.has(id)) continue;
      const p = productById.get(id);
      if (!p || !p.available || !isInStock(p)) continue;
      result.push(p);
      excludedIds.add(id);
    }

    if (result.length >= limit) return result;

    // 2. Auto-fill remaining slots via category-based scoring.
    const anchorCategories = new Set<string>();
    if (anchorProduct) anchorCategories.add(anchorProduct.category);

    const cartCategories = new Set<string>(
      cartItems.map((item) => item.product.category)
    );

    const candidates = products
      .filter(
        (p) => p.available && isInStock(p) && !excludedIds.has(p.id)
      )
      .map((p) => ({
        product: p,
        score: scoreProduct(p, anchorCategories, cartCategories, diversify),
      }));

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Stable tiebreaker: featured first, then name
      if (a.product.featured !== b.product.featured) {
        return a.product.featured ? -1 : 1;
      }
      return a.product.name.localeCompare(b.product.name);
    });

    if (diversify) {
      // First pass: one product per line so the rail spans multiple
      // collections instead of stacking a single category.
      const usedCategories = new Set<string>();
      for (const c of candidates) {
        if (result.length >= limit) break;
        if (usedCategories.has(c.product.category)) continue;
        result.push(c.product);
        usedCategories.add(c.product.category);
        excludedIds.add(c.product.id);
      }
      // Second pass: backfill any remaining slots regardless of line.
      for (const c of candidates) {
        if (result.length >= limit) break;
        if (excludedIds.has(c.product.id)) continue;
        result.push(c.product);
        excludedIds.add(c.product.id);
      }
      return result;
    }

    for (const c of candidates) {
      if (result.length >= limit) break;
      result.push(c.product);
    }

    return result;
  }, [products, cartItems, anchorProduct, limit, diversify]);
}
