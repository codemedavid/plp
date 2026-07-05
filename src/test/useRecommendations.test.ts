import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Product, CartItem } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';

// ─────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<Product> & { id: string }): Product => ({
  name: overrides.id,
  description: '',
  category: 'Weight Management',
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
  stock_quantity: 10,
  available: true,
  featured: false,
  image_url: null,
  safety_sheet_url: null,
  paired_product_ids: [],
  bundle_tiers: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const slim = makeProduct({ id: 'slim', name: 'SlimDose', category: 'Weight Management' });
const slimOther = makeProduct({ id: 'slim-2', name: 'RetaDose', category: 'Weight Management' });
const beauty = makeProduct({ id: 'beauty', name: 'BeautyDose', category: 'Beauty & Anti-Aging' });
const longevity = makeProduct({ id: 'longevity', name: 'YouthDose', category: 'Longevity' });
const cognitive = makeProduct({ id: 'cognitive', name: 'BrainBoost', category: 'Cognitive' });

const cartWith = (product: Product): CartItem[] => [
  { product, kitType: 'standard' as CartItem['kitType'], quantity: 1 },
];

describe('useRecommendations — diversify (cart cross-sell)', () => {
  const catalog = [slim, slimOther, beauty, longevity, cognitive];

  it('offers other product lines when the cart already has a Slim product', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        products: catalog,
        cartItems: cartWith(slim),
        limit: 3,
        diversify: true,
      })
    );

    const ids = result.current.map((p) => p.id);
    // Same-line item (still Weight Management) must not be preferred.
    expect(ids).not.toContain('slim-2');
    // All picks come from lines the customer does not already have.
    expect(result.current.every((p) => p.category !== 'Weight Management')).toBe(true);
  });

  it('spreads picks across distinct lines instead of stacking one', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        products: catalog,
        cartItems: cartWith(slim),
        limit: 3,
        diversify: true,
      })
    );

    const categories = result.current.map((p) => p.category);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it('never recommends a product already in the cart', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        products: catalog,
        cartItems: cartWith(slim),
        limit: 3,
        diversify: true,
      })
    );

    expect(result.current.map((p) => p.id)).not.toContain('slim');
  });

  it('backfills with same-line products only when no other lines remain', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        products: [slim, slimOther],
        cartItems: cartWith(slim),
        limit: 3,
        diversify: true,
      })
    );

    // Only same-line stock exists, so the rail falls back to it rather than empty.
    expect(result.current.map((p) => p.id)).toEqual(['slim-2']);
  });
});

describe('useRecommendations — default (non-diversify) is unchanged', () => {
  it('prefers the same line as the cart when diversify is off', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        products: [slim, slimOther, beauty, longevity],
        cartItems: cartWith(slim),
        limit: 1,
      })
    );

    // Legacy behavior boosts same-category items to the top.
    expect(result.current[0].id).toBe('slim-2');
  });
});
