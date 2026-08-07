import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock posthog
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
  },
}));

import posthog from 'posthog-js';
import type { Product, ProductVariation } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import { useCart } from '../hooks/useCart';

// ─────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Tirzepatide',
  description: 'Test peptide',
  category: 'peptides',
  base_price: 2500,
  discount_price: 2000,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: true,
  purity_percentage: 99,
  molecular_weight: '4813.45',
  cas_number: null,
  sequence: null,
  storage_conditions: 'Store at -20°C',
  inclusions: ['vial', 'bac water'],
  stock_quantity: 10,
  available: true,
  featured: true,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockProductNoDiscount: Product = {
  ...mockProduct,
  id: 'prod-2',
  name: 'BPC-157',
  discount_price: null,
  discount_active: false,
  inclusions: null,
};

const mockVariation: ProductVariation = {
  id: 'var-1',
  product_id: 'prod-1',
  name: '5mg',
  quantity_mg: 5,
  price: 3000,
  disposable_pen_price: null,
  reusable_pen_price: null,
  discount_price: 2500,
  discount_active: true,
  stock_quantity: 5,
  created_at: '2024-01-01',
};

const mockVariationNoDiscount: ProductVariation = {
  ...mockVariation,
  id: 'var-2',
  name: '10mg',
  quantity_mg: 10,
  price: 5000,
  discount_price: null,
  discount_active: false,
  stock_quantity: 3,
};

const mockOutOfStockVariation: ProductVariation = {
  ...mockVariation,
  id: 'var-3',
  name: '20mg',
  quantity_mg: 20,
  price: 8000,
  discount_price: null,
  discount_active: false,
  stock_quantity: 0,
};

// The 8.8 promo (Aug 7-9 PHT) halves every price, so cart totals depend on the
// wall clock. Pin the clock off-promo by default so the bundle/kit assertions
// below keep asserting regular pricing; promo behaviour has its own block.
const DURING_PROMO = new Date('2026-08-08T12:00:00+08:00');
const OFF_PROMO = new Date('2026-09-01T00:00:00+08:00');

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(OFF_PROMO);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────
// Unit Tests: useCart Hook
// ─────────────────────────────────────────────────────

describe('useCart Hook', () => {
  describe('Initial state', () => {
    it('starts with empty cart', () => {
      const { result } = renderHook(() => useCart());
      expect(result.current.cartItems).toEqual([]);
      expect(result.current.getTotalPrice()).toBe(0);
      expect(result.current.getTotalItems()).toBe(0);
    });

    it('restores cart from localStorage', () => {
      const savedCart = [
        { product: mockProduct, kitType: 'vial_only', quantity: 2 },
      ];
      localStorage.setItem('peptide_cart', JSON.stringify(savedCart));

      const { result } = renderHook(() => useCart());
      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].quantity).toBe(2);
    });

    it('migrates old cart items without kitType', () => {
      const oldCart = [
        { product: mockProduct, quantity: 1 },
      ];
      localStorage.setItem('peptide_cart', JSON.stringify(oldCart));

      const { result } = renderHook(() => useCart());
      expect(result.current.cartItems[0].kitType).toBe('vial_only');
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('peptide_cart', 'invalid-json{{{');

      const { result } = renderHook(() => useCart());
      expect(result.current.cartItems).toEqual([]);
    });
  });

  describe('addToCart', () => {
    it('adds a product without variation', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct);
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].product.id).toBe('prod-1');
      expect(result.current.cartItems[0].quantity).toBe(1);
      expect(result.current.cartItems[0].kitType).toBe('vial_only');
    });

    it('adds a product with variation', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].variation?.id).toBe('var-1');
    });

    it('adds a product with complete_kit type', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, undefined, 1, 'complete_kit');
      });

      expect(result.current.cartItems[0].kitType).toBe('complete_kit');
    });

    it('increments quantity for same product/variation/kitType', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });
      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 2, 'vial_only');
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].quantity).toBe(3);
    });

    it('treats different kitTypes as separate items', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });
      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'complete_kit');
      });

      expect(result.current.cartItems).toHaveLength(2);
    });

    it('treats different variations as separate items', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1);
      });
      act(() => {
        result.current.addToCart(mockProduct, mockVariationNoDiscount, 1);
      });

      expect(result.current.cartItems).toHaveLength(2);
    });

    it('does not add out-of-stock product', () => {
      const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(outOfStockProduct);
      });

      expect(result.current.cartItems).toHaveLength(0);
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('out of stock'));
      alertSpy.mockRestore();
    });

    it('does not add out-of-stock variation', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockOutOfStockVariation);
      });

      expect(result.current.cartItems).toHaveLength(0);
      alertSpy.mockRestore();
    });

    it('caps quantity at available stock for new item', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 100, 'vial_only');
      });

      expect(result.current.cartItems[0].quantity).toBe(5); // mockVariation.stock_quantity
      alertSpy.mockRestore();
    });

    it('caps quantity at available stock when incrementing existing item', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 4, 'vial_only');
      });
      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 5, 'vial_only');
      });

      // stock_quantity is 5, already have 4, can only add 1 more
      expect(result.current.cartItems[0].quantity).toBe(5);
      alertSpy.mockRestore();
    });

    it('fires posthog event on add', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });

      expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', expect.objectContaining({
        product_name: 'Tirzepatide',
        product_id: 'prod-1',
        variation: '5mg',
        quantity: 1,
        kit_type: 'vial_only',
      }));
    });

    it('fires posthog with discounted price', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });

      // variation discount_price is 2500
      expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', expect.objectContaining({
        price: 2500,
      }));
    });

    it('fires posthog with kit upgrade price included', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'complete_kit');
      });

      // variation discount_price 2500 + KIT_UPGRADE_PRICE 150 = 2650
      expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', expect.objectContaining({
        price: 2500 + KIT_UPGRADE_PRICE,
      }));
    });
  });

  describe('updateQuantity', () => {
    it('updates item quantity', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1);
      });
      act(() => {
        result.current.updateQuantity(0, 3);
      });

      expect(result.current.cartItems[0].quantity).toBe(3);
    });

    it('removes item when quantity set to 0', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct);
      });
      act(() => {
        result.current.updateQuantity(0, 0);
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('removes item when quantity set to negative', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct);
      });
      act(() => {
        result.current.updateQuantity(0, -1);
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('caps at available stock', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1);
      });
      act(() => {
        result.current.updateQuantity(0, 999);
      });

      expect(result.current.cartItems[0].quantity).toBe(5);
      alertSpy.mockRestore();
    });
  });

  describe('removeFromCart', () => {
    it('removes item by index', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct);
      });
      act(() => {
        result.current.addToCart(mockProductNoDiscount);
      });
      act(() => {
        result.current.removeFromCart(0);
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].product.id).toBe('prod-2');
    });
  });

  describe('clearCart', () => {
    it('removes all items and clears localStorage', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct);
        result.current.addToCart(mockProductNoDiscount);
      });
      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cartItems).toHaveLength(0);
      // clearCart removes the key, but the useEffect re-saves empty array
      // So localStorage will have '[]' after the effect runs
      const stored = localStorage.getItem('peptide_cart');
      expect(stored === null || stored === '[]').toBe(true);
    });
  });

  describe('getItemPrice', () => {
    it('returns discount price for discounted product (no variation)', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, undefined, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2000);
    });

    it('returns base price for non-discounted product', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProductNoDiscount, undefined, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500);
    });

    it('returns variation discount price when active', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500);
    });

    it('returns variation regular price when no discount', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariationNoDiscount, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(5000);
    });

    it('adds KIT_UPGRADE_PRICE for complete_kit', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'complete_kit');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500 + KIT_UPGRADE_PRICE);
    });

    it('does not add kit upgrade for vial_only', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500);
    });
  });

  describe('8.8 promo pricing', () => {
    it('halves the item price while the promo is live', () => {
      vi.setSystemTime(DURING_PROMO);
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProductNoDiscount, undefined, 1, 'vial_only');
      });

      // base 2500 -> 1250 at 50% off
      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(1250);
    });

    it('charges the admin sale price rather than halving base', () => {
      vi.setSystemTime(DURING_PROMO);
      const { result } = renderHook(() => useCart());

      act(() => {
        // mockProduct: base 2500, live sale 2000. The active sale price opts
        // this SKU out of the promo, so the cart charges what admin set.
        result.current.addToCart(mockProduct, undefined, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2000);
    });

    it('adds the kit upgrade fee undiscounted on top of the promo price', () => {
      vi.setSystemTime(DURING_PROMO);
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'complete_kit');
      });

      // mockVariation carries its own live sale price (2500), which opts this
      // SKU out of the promo, plus the flat kit fee, which is never discounted.
      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500 + KIT_UPGRADE_PRICE);
    });

    it('reverts to regular pricing once the window closes', () => {
      vi.setSystemTime(new Date('2026-08-10T00:00:00+08:00'));
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProductNoDiscount, undefined, 1, 'vial_only');
      });

      expect(result.current.getItemPrice(result.current.cartItems[0])).toBe(2500);
    });
  });

  describe('getTotalPrice', () => {
    it('returns 0 for empty cart', () => {
      const { result } = renderHook(() => useCart());
      expect(result.current.getTotalPrice()).toBe(0);
    });

    it('calculates total for single item with auto 3+ bundle discount', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 3, 'vial_only');
      });

      // 3 bottles => 15% off: 2500 * 3 * 0.85 = 6375
      expect(result.current.getTotalPrice()).toBeCloseTo(6375);
    });

    it('calculates total for multiple items with different kit types and bundle discounts', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 2, 'vial_only');
      });
      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 1, 'complete_kit');
      });

      // vial_only: 2 bottles => 10% off: 2500 * 2 * 0.9 = 4500
      // complete_kit: 1 bottle => no discount: (2500 + 150) * 1 = 2650
      expect(result.current.getTotalPrice()).toBeCloseTo(7150);
    });
  });

  describe('getTotalItems', () => {
    it('returns 0 for empty cart', () => {
      const { result } = renderHook(() => useCart());
      expect(result.current.getTotalItems()).toBe(0);
    });

    it('sums up all item quantities', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, mockVariation, 2, 'vial_only');
      });
      act(() => {
        result.current.addToCart(mockProductNoDiscount, undefined, 3, 'vial_only');
      });

      expect(result.current.getTotalItems()).toBe(5);
    });
  });

  describe('localStorage persistence', () => {
    it('saves cart to localStorage on change', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(mockProduct, undefined, 1, 'vial_only');
      });

      const saved = JSON.parse(localStorage.getItem('peptide_cart') || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].product.id).toBe('prod-1');
    });
  });
});
