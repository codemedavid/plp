import React, { useState } from 'react';
import posthog from 'posthog-js';
import { Zap, Check } from 'lucide-react';

const EVENTS: Array<{ name: string; props: Record<string, unknown> }> = [
  { name: 'plp_welcome_user', props: {} },
  {
    name: 'plp_checkout_started',
    props: {
      cart_total: 4500,
      item_count: 2,
      items: [{ id: 'test-1', name: 'Test Peptide', qty: 1, price: 2500 }],
    },
  },
  {
    name: 'plp_order_placed',
    props: {
      order_id: 'test-order-' + Date.now(),
      total: 4500,
      item_count: 2,
      payment_method: 'gcash',
    },
  },
  {
    name: 'plp_order_confirmed',
    props: {
      customer_name: 'Test User',
      order_number: 'TEST-' + Date.now(),
      total_price: '4500',
      subtotal: '4000',
      shipping_fee: '500',
      discount: '0',
      payment_method: 'GCash',
      contact_method: 'email',
      promo_code: 'None',
      item_count: 2,
      items_summary: 'Test Peptide (10mg) x1 - P2500\nTest Peptide (5mg) x1 - P1500',
    },
  },
  {
    name: 'plp_order_processing',
    props: {
      customer_name: 'Test User',
      order_number: 'TEST-' + Date.now(),
      total_price: '4500',
      subtotal: '4000',
      shipping_fee: '500',
      discount: '0',
      payment_method: 'GCash',
      contact_method: 'email',
      promo_code: 'None',
      item_count: 2,
      items_summary: 'Test Peptide (10mg) x1 - P2500\nTest Peptide (5mg) x1 - P1500',
    },
  },
  {
    name: 'plp_order_shipped',
    props: {
      customer_name: 'Test User',
      order_number: 'TEST-' + Date.now(),
      total_price: '4500',
      subtotal: '4000',
      shipping_fee: '500',
      discount: '0',
      payment_method: 'GCash',
      contact_method: 'email',
      promo_code: 'None',
      item_count: 2,
      items_summary: 'Test Peptide (10mg) x1 - P2500\nTest Peptide (5mg) x1 - P1500',
      tracking_number: 'TRACK123456',
      shipping_provider: 'J&T Express',
    },
  },
  {
    name: 'plp_order_delivered',
    props: {
      customer_name: 'Test User',
      order_number: 'TEST-' + Date.now(),
      total_price: '4500',
      subtotal: '4000',
      shipping_fee: '500',
      discount: '0',
      payment_method: 'GCash',
      contact_method: 'email',
      promo_code: 'None',
      item_count: 2,
      items_summary: 'Test Peptide (10mg) x1 - P2500\nTest Peptide (5mg) x1 - P1500',
      tracking_number: 'TRACK123456',
      shipping_provider: 'J&T Express',
    },
  },
  {
    name: 'plp_order_cancelled',
    props: {
      customer_name: 'Test User',
      order_number: 'TEST-' + Date.now(),
      total_price: '4500',
      subtotal: '4000',
      shipping_fee: '500',
      discount: '0',
      payment_method: 'GCash',
      contact_method: 'email',
      promo_code: 'None',
      item_count: 2,
      items_summary: 'Test Peptide (10mg) x1 - P2500\nTest Peptide (5mg) x1 - P1500',
      cancellation_reason: 'Customer request',
    },
  },
  { name: 'plp_promo', props: { email: 'test@example.com', $set: { email: 'test@example.com' } } },
  { name: 'plp_promo_banner', props: { email: 'test@example.com' } },
  {
    name: 'plp_recommendation_impression',
    props: { product_id: 'test-1', product_name: 'Test Peptide', position: 0 },
  },
  {
    name: 'plp_recommendation_add_to_cart',
    props: { product_id: 'test-1', product_name: 'Test Peptide', price: 2500 },
  },
  {
    name: 'plp_recommendation_click',
    props: { product_id: 'test-1', product_name: 'Test Peptide', position: 0 },
  },
  {
    name: 'plp_add_to_cart',
    props: { product_id: 'test-1', product_name: 'Test Peptide', price: 2500, quantity: 1 },
  },
  {
    name: 'plp_cart_abandoned',
    props: {
      email: 'test@example.com',
      user_id: 'test-user',
      full_name: 'Test User',
      item_count: 2,
      cart_total: 4500,
      items: [
        {
          product_id: 'test-1',
          product_name: 'Test Peptide',
          variation: '10mg',
          kit_type: 'vial_only',
          quantity: 2,
          image_url: null,
        },
      ],
      $set: { email: 'test@example.com' },
    },
  },
];

const PostHogEventTester: React.FC = () => {
  const [fired, setFired] = useState<Set<string>>(new Set());
  const [isFiring, setIsFiring] = useState(false);

  const fireOne = (name: string, props: Record<string, unknown>) => {
    posthog.capture(name, { ...props, _test: true });
    setFired((prev) => new Set(prev).add(name));
  };

  const fireAll = async () => {
    setIsFiring(true);
    setFired(new Set());
    for (const { name, props } of EVENTS) {
      posthog.capture(name, { ...props, _test: true });
      setFired((prev) => new Set(prev).add(name));
      await new Promise((r) => setTimeout(r, 120));
    }
    setIsFiring(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            PostHog Event Tester
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Fire each tracked event with test payload (`_test: true`). Dev/QA only.
          </p>
        </div>
        <button
          onClick={fireAll}
          disabled={isFiring}
          className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isFiring ? 'Firing…' : 'Fire All Events'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {EVENTS.map(({ name, props }) => (
          <button
            key={name}
            onClick={() => fireOne(name, props)}
            className="flex items-center justify-between gap-2 text-left px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <code className="text-xs text-gray-700 truncate">{name}</code>
            {fired.has(name) && <Check className="w-4 h-4 text-green-600 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PostHogEventTester;
