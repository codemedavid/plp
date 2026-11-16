// ─────────────────────────────────────────────────────
// Order total arithmetic shared by checkout and the order views.
//
// Kept in lockstep with the SQL in
// supabase/migrations/pending/20261118000000_phase2a_order_rpcs.sql
// (compute_promo_discount / place_order), which is authoritative:
//
//   payable = max(items subtotal + shipping - promo discount - points, 0)
//   fee     = payable * surcharge_pct / 100   (rounded to the centavo)
//   total   = payable + fee                   (stored as orders.total_price)
// ─────────────────────────────────────────────────────

import { computePaymentFee } from './paymentFee';

export interface PromoTerms {
    discount_type: string;
    discount_value: number;
    max_discount_amount?: number | null;
}

export interface CheckoutTotalsInput {
    subtotal: number;
    shippingFee: number;
    discount: number;
    pointsRedeemed: number;
    surchargePct: number;
}

export interface CheckoutTotals {
    payable: number;
    paymentFee: number;
    total: number;
}

export interface StoredOrderAmounts {
    total: number;
    shippingFee: number | null;
    discount: number | null;
    pointsRedeemed: number | null;
    paymentFee: number | null;
}

const amount = (value: number | null | undefined): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

const roundCentavos = (value: number): number => Math.round(value * 100) / 100;

/** Promo discount for an items subtotal. Null/0 cap = uncapped; never exceeds the subtotal. */
export function computePromoDiscount(promo: PromoTerms | null | undefined, subtotal: number): number {
    const base = Math.max(amount(subtotal), 0);
    if (!promo || base === 0) return 0;

    const value = Math.max(amount(promo.discount_value), 0);
    let discount: number;
    if (promo.discount_type === 'percentage') {
        // Integer centavos x basis points, same rounding as Postgres round(numeric, 2).
        discount = Math.round((Math.round(base * 100) * Math.round(value * 100)) / 10000) / 100;
        const cap = amount(promo.max_discount_amount);
        if (cap > 0) discount = Math.min(discount, cap);
    } else {
        discount = value;
    }
    return roundCentavos(Math.min(discount, base));
}

/** Live checkout totals for the selected payment method. */
export function computeCheckoutTotals(input: CheckoutTotalsInput): CheckoutTotals {
    const payable = roundCentavos(
        Math.max(
            amount(input.subtotal) + amount(input.shippingFee) - amount(input.discount) - amount(input.pointsRedeemed),
            0,
        ),
    );
    const paymentFee = computePaymentFee(payable, input.surchargePct);
    return { payable, paymentFee, total: roundCentavos(payable + paymentFee) };
}

/**
 * Items subtotal recovered from a stored order. total_price already includes
 * shipping and the payment fee, net of discount and points.
 */
export function deriveItemsSubtotal(order: StoredOrderAmounts): number {
    return roundCentavos(
        amount(order.total) -
            amount(order.shippingFee) -
            amount(order.paymentFee) +
            amount(order.discount) +
            amount(order.pointsRedeemed),
    );
}
