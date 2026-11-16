import { describe, it, expect } from 'vitest';
import { KIT_UPGRADE_PRICE } from '../types';
import type { KitType, CartItem, Product, PromoCode } from '../types';

describe('Type Constants', () => {
  it('KIT_UPGRADE_PRICE is 150', () => {
    expect(KIT_UPGRADE_PRICE).toBe(150);
  });
});

describe('Type Contracts', () => {
  it('CartItem supports vial_only kitType', () => {
    const item: CartItem = {
      product: createMockProduct(),
      kitType: 'vial_only' as KitType,
      quantity: 1,
    };
    expect(item.kitType).toBe('vial_only');
  });

  it('CartItem supports complete_kit kitType', () => {
    const item: CartItem = {
      product: createMockProduct(),
      kitType: 'complete_kit' as KitType,
      quantity: 2,
    };
    expect(item.kitType).toBe('complete_kit');
  });

  it('CartItem variation is optional', () => {
    const item: CartItem = {
      product: createMockProduct(),
      kitType: 'vial_only',
      quantity: 1,
    };
    expect(item.variation).toBeUndefined();
  });

  it('PromoCode discount_type is percentage or fixed', () => {
    const promo: PromoCode = {
      id: '1',
      code: 'SAVE10',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase_amount: 0,
      usage_count: 0,
      active: true,
      created_at: '2024-01-01',
    };
    expect(['percentage', 'fixed']).toContain(promo.discount_type);
  });
});

function createMockProduct(): Product {
  return {
    id: 'prod-1',
    name: 'Test Product',
    description: 'Test',
    category: 'peptides',
    base_price: 2500,
    cost: 0,
    description_font_family: null,
    description_font_size: null,
    inclusions_font_family: null,
    inclusions_font_size: null,
    is_new: false,
    highlighted: false,
    coa_url: null,
    coa_links: [],
    paired_product_ids: [],
    bundle_tiers: [],
    discount_price: null,
    discount_start_date: null,
    discount_end_date: null,
    discount_active: false,
    purity_percentage: 99,
    molecular_weight: null,
    cas_number: null,
    sequence: null,
    storage_conditions: 'Store at -20°C',
    inclusions: null,
    stock_quantity: 10,
    available: true,
    featured: false,
    image_url: null,
    safety_sheet_url: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };
}
