import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import type { User } from '@supabase/supabase-js';
import type { CartItem } from '../types';
import { getEffectiveUnitPrice } from '../lib/bundlePricing';

const DEFAULT_IDLE_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const FIRED_STORAGE_KEY = 'plp_cart_abandoned_fired_at';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // don't re-fire within 24h

function resolveDelayMs(): number {
  if (typeof window === 'undefined') return DEFAULT_IDLE_DELAY_MS;
  const params = new URLSearchParams(window.location.search);
  const override = Number(params.get('cartIdleSec'));
  if (Number.isFinite(override) && override > 0) {
    return override * 1000;
  }
  return DEFAULT_IDLE_DELAY_MS;
}

function computeTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + getEffectiveUnitPrice(item.product, item.variation, item.kitType, item.quantity) * item.quantity,
    0,
  );
}

export function useCartAbandonment(cartItems: CartItem[], user: User | null) {
  const itemsRef = useRef(cartItems);
  itemsRef.current = cartItems;

  // Hash cart contents so the timer only resets on real cart changes (not on every render).
  // Use an explicit field-separator sentinel so missing variation/kitType values can't
  // collide across distinct items (e.g. "abc||5" must not match "ab|c|5").
  const cartHash = cartItems
    .map((i) =>
      [i.product.id, i.variation?.id ?? '∅', i.kitType ?? '∅', i.quantity].join('␟'),
    )
    .join('␞');

  useEffect(() => {
    if (!user || cartItems.length === 0) return;

    const lastFiredAt = Number(localStorage.getItem(FIRED_STORAGE_KEY) || 0);
    if (Date.now() - lastFiredAt < COOLDOWN_MS) return;

    const delay = resolveDelayMs();
    const timer = window.setTimeout(() => {
      const items = itemsRef.current;
      if (items.length === 0) return;

      const payloadItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        variation: item.variation?.name ?? null,
        kit_type: item.kitType,
        quantity: item.quantity,
        image_url: item.product.image_url ?? null,
      }));

      posthog.capture('plp_cart_abandoned', {
        email: user.email,
        user_id: user.id,
        full_name: (user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
        item_count: items.reduce((n, i) => n + i.quantity, 0),
        cart_total: computeTotal(items),
        items: payloadItems,
        $set: { email: user.email },
      });

      localStorage.setItem(FIRED_STORAGE_KEY, String(Date.now()));
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHash, user]);
}
