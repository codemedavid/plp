import { describe, it, expect } from 'vitest';
import { CART_VECTORS, LINE_VECTORS, tsCartTotals, tsLineTotal } from './fixtures/serverPricingVectors';

// place_order() reprices orders server-side with a SQL port of bundlePricing.ts
// (supabase/migrations/20261118000300_place_order_server_pricing.sql). The
// `sql` numbers below were produced by that SQL for the same inputs. If this
// suite fails, the client pricing rules changed: update place_order() to match
// and re-capture the vectors, or customers will be charged a different amount
// than checkout showed (and every order will carry a pricing_mismatch).

describe('server pricing parity: per-line unit price (compute_unit_price)', () => {
    it.each(LINE_VECTORS.map((v) => [v.name, v] as const))('%s', (_name, vector) => {
        expect(tsLineTotal(vector)).toBe(vector.sqlLineTotal);
    });
});

describe('server pricing parity: whole order (place_order)', () => {
    it.each(CART_VECTORS.map((v) => [v.name, v] as const))('%s', (_name, vector) => {
        expect(tsCartTotals(vector)).toEqual(vector.sql);
    });
});
