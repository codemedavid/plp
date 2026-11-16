// ─────────────────────────────────────────────────────
// Storefront order RPCs (see supabase/migrations/pending/20261118000000_phase2a_order_rpcs.sql)
//
// Once orders / promo_codes have RLS, the storefront cannot read or write
// those tables directly. Every checkout-side order operation goes through a
// SECURITY DEFINER function that validates server-side:
//   place_order          create an order (totals, promo, points, fee)
//   validate_promo_code  check one code without exposing the code list
//   track_order          guest lookup by order reference + email/phone
// ─────────────────────────────────────────────────────

import { supabase } from './supabase';

export interface PlaceOrderItem {
    product_id: string;
    product_name: string;
    variation_id: string | null;
    variation_name: string | null;
    quantity: number;
    price: number;
    total: number;
    kit_type: string;
    purity_percentage?: number | null;
}

/** What the client may send. Totals, fee, status and user id are decided by the server. */
export interface PlaceOrderInput {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: string;
    shipping_barangay: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip_code: string;
    order_items: PlaceOrderItem[];
    shipping_fee: number;
    courier_id: string | null;
    shipping_location: string | null;
    payment_method_id: string | null;
    payment_proof_url: string | null;
    contact_method: string;
    notes: string | null;
    promo_code: string | null;
    points_redeemed: number;
}

export interface PlacedOrder {
    id: string;
    orderNumber: string;
    items: PlaceOrderItem[];
    subtotal: number;
    shippingFee: number;
    discount: number;
    pointsRedeemed: number;
    paymentFee: number;
    paymentFeePct: number;
    total: number;
    paymentMethodName: string | null;
    contactMethod: string | null;
    promoCode: string | null;
}

export interface AppliedPromo {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount: number | null;
    min_purchase_amount: number;
}

export interface TrackedOrder {
    id: string;
    order_number: string | null;
    order_status: string;
    payment_status: string;
    tracking_number: string | null;
    shipping_provider: string | null;
    shipping_note: string | null;
    total_price: number;
    shipping_fee: number;
    order_items: { product_id?: string; product_name: string; quantity: number }[];
    customer_name?: string;
    created_at: string;
    promo_code: string | null;
    discount_applied: number | null;
    points_redeemed: number | null;
    payment_fee?: number | null;
    payment_fee_pct?: number | null;
    payment_method_name?: string | null;
}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const PLACE_ORDER_FIELDS: ReadonlyArray<keyof PlaceOrderInput> = [
    'customer_name',
    'customer_email',
    'customer_phone',
    'shipping_address',
    'shipping_barangay',
    'shipping_city',
    'shipping_state',
    'shipping_zip_code',
    'order_items',
    'shipping_fee',
    'courier_id',
    'shipping_location',
    'payment_method_id',
    'payment_proof_url',
    'contact_method',
    'notes',
    'promo_code',
    'points_redeemed',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number => {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

/** Whitelist the payload so stray fields (total_price, user_id, ...) never reach the RPC. */
function buildOrderPayload(input: PlaceOrderInput): Record<string, unknown> {
    return Object.fromEntries(PLACE_ORDER_FIELDS.map((key) => [key, input[key]]));
}

function toPlacedOrder(row: Record<string, unknown>): PlacedOrder {
    return {
        id: String(row.id),
        orderNumber: toText(row.order_number) ?? String(row.id),
        items: Array.isArray(row.order_items) ? (row.order_items as PlaceOrderItem[]) : [],
        subtotal: toNumber(row.subtotal),
        shippingFee: toNumber(row.shipping_fee),
        discount: toNumber(row.discount_applied),
        pointsRedeemed: toNumber(row.points_redeemed),
        paymentFee: toNumber(row.payment_fee),
        paymentFeePct: toNumber(row.payment_fee_pct),
        total: toNumber(row.total_price),
        paymentMethodName: toText(row.payment_method_name),
        contactMethod: toText(row.contact_method),
        promoCode: toText(row.promo_code),
    };
}

export async function placeOrder(input: PlaceOrderInput): Promise<Result<{ order: PlacedOrder }>> {
    try {
        const { data, error } = await supabase.rpc('place_order', { p_order: buildOrderPayload(input) });
        if (error) return { ok: false, error: error.message || 'Failed to place order' };
        if (!isRecord(data) || !data.id) return { ok: false, error: 'The order could not be confirmed. Please try again.' };
        return { ok: true, order: toPlacedOrder(data) };
    } catch (err: unknown) {
        return { ok: false, error: errorMessage(err, 'Failed to place order') };
    }
}

export async function validatePromoCode(code: string, subtotal: number): Promise<Result<{ promo: AppliedPromo }>> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, error: 'Please enter a promo code' };

    try {
        const { data, error } = await supabase.rpc('validate_promo_code', {
            p_code: normalized,
            p_subtotal: subtotal,
        });
        if (error || !isRecord(data)) return { ok: false, error: 'Failed to apply promo code' };
        if (data.valid !== true) {
            return { ok: false, error: toText(data.error) ?? 'Invalid or inactive promo code' };
        }
        return {
            ok: true,
            promo: {
                id: String(data.id),
                code: String(data.code),
                discount_type: String(data.discount_type),
                discount_value: toNumber(data.discount_value),
                max_discount_amount: data.max_discount_amount == null ? null : toNumber(data.max_discount_amount),
                min_purchase_amount: toNumber(data.min_purchase_amount),
            },
        };
    } catch {
        return { ok: false, error: 'Failed to apply promo code' };
    }
}

export async function trackOrder(orderRef: string, contact: string): Promise<Result<{ order: TrackedOrder | null }>> {
    const ref = orderRef.trim();
    const who = contact.trim();
    if (!ref || !who) return { ok: false, error: 'Enter your order number and the email or phone used at checkout.' };

    try {
        const { data, error } = await supabase.rpc('track_order', { p_order_ref: ref, p_contact: who });
        if (error) return { ok: false, error: error.message || 'Failed to look up order' };
        const rows = Array.isArray(data) ? data : [];
        return { ok: true, order: rows.length > 0 ? (rows[0] as TrackedOrder) : null };
    } catch (err: unknown) {
        return { ok: false, error: errorMessage(err, 'Failed to look up order') };
    }
}
