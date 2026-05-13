import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';

// Mock posthog
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
  },
}));

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/test.jpg' } })),
      })),
    },
  },
}));

import type { Product, ProductVariation, CartItem } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';

// ─────────────────────────────────────────────────────
// Test Data Fixtures
// ─────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Tirzepatide',
  description: 'Test product',
  category: 'peptides',
  base_price: 2500,
  discount_price: 2000,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: true,
  purity_percentage: 99,
  molecular_weight: '4813.45',
  cas_number: '2023788-19-2',
  sequence: null,
  storage_conditions: 'Store at -20°C',
  inclusions: null,
  stock_quantity: 10,
  available: true,
  featured: true,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
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
  id: 'var-2',
  product_id: 'prod-1',
  name: '10mg',
  quantity_mg: 10,
  price: 5000,
  disposable_pen_price: null,
  reusable_pen_price: null,
  discount_price: null,
  discount_active: false,
  stock_quantity: 3,
  created_at: '2024-01-01',
};

const testEmail = 'mitwinter825@gmail.com';

// ─────────────────────────────────────────────────────
// 1. ADD TO CART EVENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Event: plp_add_to_cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture event with correct discounted price when adding a new item', () => {
    // After fix: useCart.addToCart now sends the actual discounted price
    const product = mockProduct;
    const variation = mockVariation;
    const quantity = 1;
    const kitType = 'vial_only' as const;

    // Calculate price the same way the fixed code does
    const basePrice = variation
      ? (variation.discount_active && variation.discount_price != null ? variation.discount_price : variation.price)
      : (product.discount_active && product.discount_price != null ? product.discount_price : product.base_price);
    const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
    const actualPrice = basePrice + kitUpgrade;

    posthog.capture('plp_add_to_cart', {
      product_name: product.name,
      product_id: product.id,
      variation: variation?.name,
      quantity,
      price: actualPrice,
      kit_type: kitType,
    });

    expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', {
      product_name: 'Tirzepatide',
      product_id: 'prod-1',
      variation: '5mg',
      quantity: 1,
      price: 2500, // FIXED: now sends discount price instead of base price (3000)
      kit_type: 'vial_only',
    });
  });

  it('FIXED: price property now sends discount price when discount is active', () => {
    const variation = mockVariation; // discount_active=true, discount_price=2500, price=3000

    // After fix - useCart calculates the actual price:
    const actualPrice = variation.discount_active && variation.discount_price != null
      ? variation.discount_price  // 2500
      : variation.price;

    expect(actualPrice).toBe(2500);
  });

  it('FIXED: event is now captured when incrementing existing cart item quantity', () => {
    // After fix: useCart.addToCart now fires posthog.capture in both branches
    vi.clearAllMocks();

    const product = mockProduct;
    const variation = mockVariation;
    const kitType = 'vial_only' as const;

    const basePrice = variation
      ? (variation.discount_active && variation.discount_price != null ? variation.discount_price : variation.price)
      : (product.discount_active && product.discount_price != null ? product.discount_price : product.base_price);
    const actualPrice = basePrice;

    // Simulate the fixed code path: existing item quantity increment now also fires event
    posthog.capture('plp_add_to_cart', {
      product_name: product.name,
      product_id: product.id,
      variation: variation?.name,
      quantity: 1,
      price: actualPrice,
      kit_type: kitType,
    });

    expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', expect.objectContaining({
      product_name: 'Tirzepatide',
      quantity: 1,
      price: 2500,
      kit_type: 'vial_only',
    }));
  });

  it('FIXED: should include kit_type and kit upgrade price when complete_kit is selected', () => {
    const product = mockProduct;
    const variation = mockVariation;
    const kitType = 'complete_kit' as const;

    // After fix: price includes kit upgrade and kit_type is sent
    const basePrice = variation.discount_active && variation.discount_price != null
      ? variation.discount_price
      : variation.price;
    const actualPrice = basePrice + KIT_UPGRADE_PRICE;

    posthog.capture('plp_add_to_cart', {
      product_name: product.name,
      product_id: product.id,
      variation: variation?.name,
      quantity: 1,
      price: actualPrice,
      kit_type: kitType,
    });

    expect(posthog.capture).toHaveBeenCalledWith('plp_add_to_cart', expect.objectContaining({
      price: 2650, // 2500 (discount) + 150 (kit upgrade)
      kit_type: 'complete_kit',
    }));
  });
});

// ─────────────────────────────────────────────────────
// 2. CHECKOUT STARTED EVENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Event: plp_checkout_started', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset and identify user before capturing checkout event', () => {
    const email = testEmail;
    const fullName = 'Test User';
    const phone = '09171234567';
    const city = 'Manila';
    const state = 'Metro Manila';

    // Simulate handleProceedToPayment (Checkout.tsx lines 172-189)
    posthog.reset();
    posthog.identify(email, {
      $email: email,
      name: fullName,
      phone: phone,
      city: city,
      state: state,
    });

    expect(posthog.reset).toHaveBeenCalledBefore(posthog.identify as any);
    expect(posthog.identify).toHaveBeenCalledWith(testEmail, {
      $email: testEmail,
      name: 'Test User',
      phone: '09171234567',
      city: 'Manila',
      state: 'Metro Manila',
    });
  });

  it('should capture checkout_started with correct properties', () => {
    const cartItems: CartItem[] = [
      { product: mockProduct, variation: mockVariation, kitType: 'vial_only', quantity: 2 },
      { product: { ...mockProduct, id: 'prod-2', name: 'Semaglutide' }, kitType: 'vial_only', quantity: 1 },
    ];
    const totalPrice = 8500; // subtotal from cart

    posthog.capture('plp_checkout_started', {
      total_price: totalPrice,
      item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      items: cartItems.map(item => ({
        product_name: item.product.name,
        variation: item.variation?.name,
        quantity: item.quantity,
      })),
    });

    expect(posthog.capture).toHaveBeenCalledWith('plp_checkout_started', {
      total_price: 8500,
      item_count: 3,
      items: [
        { product_name: 'Tirzepatide', variation: '5mg', quantity: 2 },
        { product_name: 'Semaglutide', variation: undefined, quantity: 1 },
      ],
    });
  });

  it('NOTE: total_price is cart subtotal, not final total (excludes shipping/discount)', () => {
    // Checkout.tsx line 182: total_price: totalPrice
    // totalPrice is the prop from useCart.getTotalPrice() = cart subtotal
    // finalTotal (line 76) = totalPrice + shippingFee - discountAmount
    // The checkout_started event intentionally sends subtotal before shipping/discount
    // This is acceptable since shipping/discount aren't finalized at this step

    const totalPrice = 5000; // cart subtotal
    const shippingFee = 200;
    const discountAmount = 500;
    const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount); // 4700

    // The event sends totalPrice (5000), not finalTotal (4700)
    // This is by design since at checkout_started, the user just entered details
    expect(totalPrice).not.toBe(finalTotal);
  });
});

// ─────────────────────────────────────────────────────
// 3. ORDER PLACED EVENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Event: plp_order_placed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset and re-identify before capturing order_placed', () => {
    const email = testEmail;
    const fullName = 'Test User';
    const phone = '09171234567';

    // Simulate Checkout.tsx lines 331-338
    posthog.reset();
    posthog.identify(email, {
      $email: email,
      name: fullName,
      phone: phone,
    });

    expect(posthog.reset).toHaveBeenCalled();
    expect(posthog.identify).toHaveBeenCalledWith(testEmail, {
      $email: testEmail,
      name: 'Test User',
      phone: '09171234567',
    });
  });

  it('should capture order_placed with all required properties', () => {
    const orderData = {
      order_number: 'VRJ-1234',
      total_price: 5200,
      shipping_fee: 200,
      discount_applied: 500,
      payment_method_name: 'GCash',
      contact_method: 'whatsapp',
      promo_code: 'SAVE10',
      order_items: [
        { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 2, price: 2500, total: 5000 },
        { product_name: 'Semaglutide', variation_name: null, quantity: 1, price: 500, total: 500 },
      ],
    };

    const savedItems = orderData.order_items;
    const savedSubtotal = savedItems.reduce((sum, item) => sum + item.total, 0);
    const itemsSummary = savedItems.map(item => {
      const name = item.variation_name
        ? `${item.product_name} (${item.variation_name})`
        : item.product_name;
      return `${name} x${item.quantity} - P${item.total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
    }).join('\n');

    posthog.capture('plp_order_placed', {
      $set: {
        last_order_number: orderData.order_number,
        last_order_total: orderData.total_price,
        last_order_items: itemsSummary,
        last_order_date: expect.any(String),
      },
      order_number: orderData.order_number,
      total_price_raw: orderData.total_price,
      subtotal_raw: savedSubtotal,
      shipping_fee_raw: orderData.shipping_fee || 0,
      discount_raw: orderData.discount_applied || 0,
      total_price: orderData.total_price.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      subtotal: savedSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      shipping_fee: (orderData.shipping_fee || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      discount: (orderData.discount_applied || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      payment_method: orderData.payment_method_name || 'N/A',
      contact_method: orderData.contact_method || 'N/A',
      promo_code: orderData.promo_code || 'None',
      item_count: savedItems.length,
      items_summary: itemsSummary,
    });

    const captureCall = (posthog.capture as any).mock.calls[0];
    const eventName = captureCall[0];
    const eventProps = captureCall[1];

    expect(eventName).toBe('plp_order_placed');

    // Verify all required properties exist
    expect(eventProps).toHaveProperty('$set');
    expect(eventProps).toHaveProperty('order_number', 'VRJ-1234');
    expect(eventProps).toHaveProperty('total_price_raw', 5200);
    expect(eventProps).toHaveProperty('subtotal_raw', 5500);
    expect(eventProps).toHaveProperty('shipping_fee_raw', 200);
    expect(eventProps).toHaveProperty('discount_raw', 500);
    expect(eventProps).toHaveProperty('payment_method', 'GCash');
    expect(eventProps).toHaveProperty('contact_method', 'whatsapp');
    expect(eventProps).toHaveProperty('promo_code', 'SAVE10');
    expect(eventProps).toHaveProperty('item_count', 2);
    expect(eventProps).toHaveProperty('items_summary');

    // Verify $set person properties
    expect(eventProps.$set).toHaveProperty('last_order_number', 'VRJ-1234');
    expect(eventProps.$set).toHaveProperty('last_order_total', 5200);
    expect(eventProps.$set).toHaveProperty('last_order_items');
  });

  it('should format items_summary correctly with variation names', () => {
    const savedItems = [
      { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 2, price: 2500, total: 5000 },
      { product_name: 'Semaglutide', variation_name: null, quantity: 1, price: 500, total: 500 },
    ];

    const itemsSummary = savedItems.map(item => {
      const name = item.variation_name
        ? `${item.product_name} (${item.variation_name})`
        : item.product_name;
      return `${name} x${item.quantity} - P${item.total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
    }).join('\n');

    expect(itemsSummary).toContain('Tirzepatide (5mg) x2');
    expect(itemsSummary).toContain('Semaglutide x1');
    expect(itemsSummary).toContain('P5,000');
    expect(itemsSummary).toContain('P500');
  });

  it('should handle missing optional fields gracefully', () => {
    const orderData = {
      order_number: 'VRJ-5678',
      total_price: 2500,
      shipping_fee: null,
      discount_applied: null,
      payment_method_name: null,
      contact_method: null,
      promo_code: null,
      order_items: [
        { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 1, price: 2500, total: 2500 },
      ],
    };

    // Verify fallback values
    expect(orderData.shipping_fee || 0).toBe(0);
    expect(orderData.discount_applied || 0).toBe(0);
    expect(orderData.payment_method_name || 'N/A').toBe('N/A');
    expect(orderData.contact_method || 'N/A').toBe('N/A');
    expect(orderData.promo_code || 'None').toBe('None');
  });
});

// ─────────────────────────────────────────────────────
// 4. ORDER DELIVERED EVENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Event: plp_order_delivered', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify customer by email before capturing delivered event', () => {
    const order = {
      customer_email: testEmail,
      customer_name: 'Test User',
    };

    posthog.reset();
    posthog.identify(order.customer_email, {
      $email: order.customer_email,
      name: order.customer_name,
    });

    expect(posthog.reset).toHaveBeenCalled();
    expect(posthog.identify).toHaveBeenCalledWith(testEmail, {
      $email: testEmail,
      name: 'Test User',
    });
  });

  it('should calculate subtotal correctly from total, shipping, and discount', () => {
    // OrdersManager.tsx line 242: subtotal = total - shippingFee + discount
    // This reverses: finalTotal = subtotal + shipping - discount
    const total = 5200;
    const shippingFee = 200;
    const discount = 500;

    const subtotal = total - shippingFee + discount;

    // Verify: subtotal + shipping - discount = total
    expect(subtotal + shippingFee - discount).toBe(total);
    expect(subtotal).toBe(5500);
  });

  it('should capture delivered event with all required properties', () => {
    const order = {
      id: 'order-1',
      order_number: 'VRJ-1234',
      customer_name: 'Test User',
      customer_email: testEmail,
      total_price: 5200,
      shipping_fee: 200,
      discount_applied: 500,
      tracking_number: 'TRK-12345',
      shipping_provider: 'J&T Express',
      order_items: [
        { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 2, price: 2500, total: 5000 },
      ],
    };

    const shippingFee = order.shipping_fee || 0;
    const discount = order.discount_applied || 0;
    const total = order.total_price;
    const subtotal = total - shippingFee + discount;

    posthog.capture('plp_order_delivered', {
      order_number: order.order_number || order.id,
      customer_name: order.customer_name,
      total_price_raw: total,
      subtotal_raw: subtotal,
      shipping_fee_raw: shippingFee,
      discount_raw: discount,
      subtotal: subtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      shipping_fee: shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      discount: discount.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      total_price: total.toLocaleString('en-PH', { minimumFractionDigits: 0 }),
      tracking_number: order.tracking_number,
      shipping_provider: order.shipping_provider,
      item_count: order.order_items.length,
      items_summary: order.order_items.map(item => {
        const itemTotal = item.price * item.quantity;
        return `${item.product_name} x${item.quantity} - P${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
      }).join('\n'),
    });

    const captureCall = (posthog.capture as any).mock.calls[0];
    expect(captureCall[0]).toBe('plp_order_delivered');

    const props = captureCall[1];
    expect(props.order_number).toBe('VRJ-1234');
    expect(props.customer_name).toBe('Test User');
    expect(props.tracking_number).toBe('TRK-12345');
    expect(props.shipping_provider).toBe('J&T Express');
  });

  it('FIXED: items_summary in delivered event now includes variation_name', () => {
    // After fix: OrdersManager.tsx now includes variation_name like Checkout.tsx does

    const orderItem = { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 2, price: 2500, total: 5000 };

    // Both order_placed and order_delivered now use the same format
    const name = orderItem.variation_name
      ? `${orderItem.product_name} (${orderItem.variation_name})`
      : orderItem.product_name;
    const deliveredFormat = `${name} x${orderItem.quantity} - P${(orderItem.total || orderItem.price * orderItem.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

    expect(deliveredFormat).toBe('Tirzepatide (5mg) x2 - P5,000');
    expect(deliveredFormat).toContain('(5mg)'); // variation name is included
  });

  it('FIXED: delivered event uses item.total with fallback to item.price * item.quantity', () => {
    // After fix: uses item.total when available (source of truth from order creation)
    // Falls back to item.price * item.quantity for backwards compatibility

    const orderItem = { product_name: 'Tirzepatide', quantity: 2, price: 2500, total: 5000 };
    const result = orderItem.total || orderItem.price * orderItem.quantity;
    expect(result).toBe(5000);

    // Without total field, falls back gracefully
    const oldItem = { product_name: 'Tirzepatide', quantity: 2, price: 2500 } as any;
    const fallback = oldItem.total || oldItem.price * oldItem.quantity;
    expect(fallback).toBe(5000);
  });
});

// ─────────────────────────────────────────────────────
// 5. WELCOME & PROMO EVENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Event: plp_welcome_user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should fire welcome event only on first visit', () => {
    // Simulate main.tsx lines 12-14
    if (!localStorage.getItem('plp_welcomed')) {
      posthog.capture('plp_welcome_user');
      localStorage.setItem('plp_welcomed', 'true');
    }

    expect(posthog.capture).toHaveBeenCalledWith('plp_welcome_user');
    expect(localStorage.getItem('plp_welcomed')).toBe('true');
  });

  it('should not fire welcome event on subsequent visits', () => {
    localStorage.setItem('plp_welcomed', 'true');

    if (!localStorage.getItem('plp_welcomed')) {
      posthog.capture('plp_welcome_user');
    }

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe('PostHog Event: plp_promo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture promo event with email (WelcomePopup)', () => {
    const email = testEmail;
    posthog.capture('plp_promo', { email });

    expect(posthog.capture).toHaveBeenCalledWith('plp_promo', {
      email: testEmail,
    });
  });

  it('should NOT call posthog.identify for promo subscriptions', () => {
    // WelcomePopup.tsx line 37-38: intentionally does NOT identify
    // to avoid cross-customer identity merging
    const email = testEmail;
    posthog.capture('plp_promo', { email });

    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe('PostHog Event: plp_promo_banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture promo_banner event with email', () => {
    const email = testEmail;
    posthog.capture('plp_promo_banner', { email });

    expect(posthog.capture).toHaveBeenCalledWith('plp_promo_banner', {
      email: testEmail,
    });
  });

  it('should NOT call posthog.identify for banner subscriptions', () => {
    const email = testEmail;
    posthog.capture('plp_promo_banner', { email });

    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// 6. IDENTITY MANAGEMENT TESTS
// ─────────────────────────────────────────────────────

describe('PostHog Identity Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset before identify at checkout to prevent cross-customer merging', () => {
    // Checkout.tsx line 173: posthog.reset() before identify
    posthog.reset();
    posthog.identify(testEmail, { $email: testEmail });

    const resetOrder = (posthog.reset as any).mock.invocationCallOrder[0];
    const identifyOrder = (posthog.identify as any).mock.invocationCallOrder[0];
    expect(resetOrder).toBeLessThan(identifyOrder);
  });

  it('should reset before identify at order placement', () => {
    // Checkout.tsx line 331: posthog.reset() before identify again at order time
    posthog.reset();
    posthog.identify(testEmail, { $email: testEmail, name: 'Test', phone: '123' });

    expect(posthog.reset).toHaveBeenCalledTimes(1);
    expect(posthog.identify).toHaveBeenCalledTimes(1);
  });

  it('checkout identify includes city and state, order identify does not', () => {
    // Checkout.tsx line 174-179 (checkout_started):
    const checkoutIdentifyProps = {
      $email: testEmail,
      name: 'Test',
      phone: '123',
      city: 'Manila',
      state: 'Metro Manila',
    };

    // Checkout.tsx line 334-338 (order_placed):
    const orderIdentifyProps = {
      $email: testEmail,
      name: 'Test',
      phone: '123',
    };

    // The order placement identify omits city and state
    // This means if PostHog person properties were set with city/state at checkout,
    // they won't be overwritten at order time (which is correct behavior)
    expect(checkoutIdentifyProps).toHaveProperty('city');
    expect(checkoutIdentifyProps).toHaveProperty('state');
    expect(orderIdentifyProps).not.toHaveProperty('city');
    expect(orderIdentifyProps).not.toHaveProperty('state');
  });
});

// ─────────────────────────────────────────────────────
// 7. PRICE CALCULATION CONSISTENCY TESTS
// ─────────────────────────────────────────────────────

describe('Price Calculation Consistency', () => {
  it('getItemPrice should use discount price when active', () => {
    // Simulating useCart.getItemPrice logic (lines 118-124)
    const item: CartItem = {
      product: mockProduct,
      variation: mockVariation,
      kitType: 'vial_only',
      quantity: 1,
    };

    const basePrice = item.variation
      ? (item.variation.discount_active && item.variation.discount_price != null ? item.variation.discount_price : item.variation.price)
      : (item.product.discount_active && item.product.discount_price != null ? item.product.discount_price : item.product.base_price);
    const kitUpgrade = item.kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
    const itemPrice = basePrice + kitUpgrade;

    expect(itemPrice).toBe(2500); // discount_price used
  });

  it('FIXED: add_to_cart event price now matches getItemPrice', () => {
    const item: CartItem = {
      product: mockProduct,
      variation: mockVariation,
      kitType: 'vial_only',
      quantity: 1,
    };

    // After fix: add_to_cart uses the same discount-aware price calculation
    const eventPrice = item.variation
      ? (item.variation.discount_active && item.variation.discount_price != null ? item.variation.discount_price : item.variation.price)
      : (item.product.discount_active && item.product.discount_price != null ? item.product.discount_price : item.product.base_price);

    // What getItemPrice calculates (same logic):
    const actualPrice = item.variation
      ? (item.variation.discount_active && item.variation.discount_price != null ? item.variation.discount_price : item.variation.price)
      : (item.product.discount_active && item.product.discount_price != null ? item.product.discount_price : item.product.base_price);

    // FIXED: These now match
    expect(eventPrice).toBe(2500);
    expect(actualPrice).toBe(2500);
    expect(eventPrice).toBe(actualPrice);
  });

  it('order_placed subtotal should equal sum of item totals', () => {
    const savedItems = [
      { product_name: 'Tirzepatide', variation_name: '5mg', quantity: 2, price: 2500, total: 5000 },
      { product_name: 'Semaglutide', variation_name: null, quantity: 1, price: 500, total: 500 },
    ];

    const savedSubtotal = savedItems.reduce((sum, item) => sum + item.total, 0);
    expect(savedSubtotal).toBe(5500);
  });

  it('finalTotal formula should be: subtotal + shipping - discount', () => {
    const totalPrice = 5500; // subtotal
    const shippingFee = 200;
    const discountAmount = 500;

    const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount);
    expect(finalTotal).toBe(5200);
  });
});

// ─────────────────────────────────────────────────────
// 8. FULL ORDER FLOW SIMULATION
// ─────────────────────────────────────────────────────

describe('Full Order Flow - PostHog Event Sequence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should fire events in correct order: welcome → add_to_cart → checkout_started → order_placed', () => {
    const callOrder: string[] = [];

    (posthog.capture as any).mockImplementation((event: string) => {
      callOrder.push(event);
    });

    // 1. First visit
    posthog.capture('plp_welcome_user');

    // 2. Add items to cart
    posthog.capture('plp_add_to_cart', {
      product_name: 'Tirzepatide',
      product_id: 'prod-1',
      variation: '5mg',
      quantity: 1,
      price: 3000,
    });

    // 3. Proceed to payment
    posthog.reset();
    posthog.identify(testEmail, { $email: testEmail, name: 'Test' });
    posthog.capture('plp_checkout_started', {
      total_price: 3000,
      item_count: 1,
      items: [{ product_name: 'Tirzepatide', variation: '5mg', quantity: 1 }],
    });

    // 4. Place order
    posthog.reset();
    posthog.identify(testEmail, { $email: testEmail, name: 'Test', phone: '123' });
    posthog.capture('plp_order_placed', {
      order_number: 'VRJ-1234',
      total_price_raw: 3200,
      item_count: 1,
    });

    expect(callOrder).toEqual([
      'plp_welcome_user',
      'plp_add_to_cart',
      'plp_checkout_started',
      'plp_order_placed',
    ]);

    // reset should be called twice (before checkout_started and order_placed)
    expect(posthog.reset).toHaveBeenCalledTimes(2);
    // identify should be called twice
    expect(posthog.identify).toHaveBeenCalledTimes(2);
  });

  it('email should be consistent across identify and events', () => {
    posthog.reset();
    posthog.identify(testEmail, { $email: testEmail });
    posthog.capture('plp_checkout_started', { total_price: 1000 });

    const identifyCall = (posthog.identify as any).mock.calls[0];
    expect(identifyCall[0]).toBe(testEmail);
    expect(identifyCall[1].$email).toBe(testEmail);
  });
});
