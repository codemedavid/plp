import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock('../lib/supabase', () => ({
    supabase: {
        rpc: (...args: unknown[]) => rpcMock(...args),
        from: (...args: unknown[]) => fromMock(...args),
    },
}));

import { placeOrder, trackOrder, validatePromoCode, type PlaceOrderInput } from '../lib/orderApi';

beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
});

const input: PlaceOrderInput = {
    customer_name: 'Ana Cruz',
    customer_email: 'ana@example.com',
    customer_phone: '09171234567',
    shipping_address: '1 Test St',
    shipping_barangay: 'Poblacion',
    shipping_city: 'Makati',
    shipping_state: 'NCR',
    shipping_zip_code: '1200',
    order_items: [
        {
            product_id: 'p1',
            product_name: 'Tirzepatide',
            variation_id: null,
            variation_name: null,
            quantity: 2,
            price: 500,
            total: 1000,
            kit_type: 'vial_only',
            purity_percentage: 99,
        },
    ],
    shipping_fee: 150,
    courier_id: 'c1',
    shipping_location: 'ncr',
    payment_method_id: 'qrph-id',
    payment_proof_url: 'https://example.com/proof.jpg',
    contact_method: 'email',
    notes: null,
    promo_code: 'SAVEBIG',
    points_redeemed: 0,
};

describe('placeOrder', () => {
    it('creates the order through the place_order RPC, never a direct table insert', async () => {
        rpcMock.mockResolvedValue({ data: { id: 'o1', order_number: 'PLP-1234', total_price: 1184.5 }, error: null });

        await placeOrder(input);

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(rpcMock.mock.calls[0][0]).toBe('place_order');
        expect(fromMock).not.toHaveBeenCalled();
    });

    it('does not send client-computed totals, fees, status or user id', async () => {
        rpcMock.mockResolvedValue({ data: { id: 'o1', order_number: 'PLP-1234' }, error: null });

        await placeOrder({ ...input, ...({ total_price: 1, payment_fee: 0, user_id: 'x', order_status: 'paid' } as object) } as PlaceOrderInput);

        const payload = rpcMock.mock.calls[0][1].p_order as Record<string, unknown>;
        expect(payload).not.toHaveProperty('total_price');
        expect(payload).not.toHaveProperty('payment_fee');
        expect(payload).not.toHaveProperty('user_id');
        expect(payload).not.toHaveProperty('order_status');
        expect(payload.promo_code).toBe('SAVEBIG');
        expect(payload.payment_method_id).toBe('qrph-id');
    });

    it('returns the server-persisted totals, including the payment fee', async () => {
        rpcMock.mockResolvedValue({
            data: {
                id: 'o1',
                order_number: 'PLP-1234',
                order_items: input.order_items,
                subtotal: 1000,
                shipping_fee: 150,
                discount_applied: 0,
                points_redeemed: 0,
                payment_fee: 34.5,
                payment_fee_pct: 3,
                total_price: 1184.5,
                payment_method_name: 'QRPh',
                contact_method: 'email',
                promo_code: null,
            },
            error: null,
        });

        const result = await placeOrder(input);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.order.orderNumber).toBe('PLP-1234');
            expect(result.order.paymentFee).toBe(34.5);
            expect(result.order.paymentFeePct).toBe(3);
            expect(result.order.total).toBe(1184.5);
            expect(result.order.paymentMethodName).toBe('QRPh');
        }
    });

    it('coerces numeric strings from the API into numbers', async () => {
        rpcMock.mockResolvedValue({
            data: { id: 'o1', order_number: 'PLP-1', total_price: '1184.50', payment_fee: '34.50', shipping_fee: '150.00' },
            error: null,
        });
        const result = await placeOrder(input);
        expect(result.ok && result.order.total).toBe(1184.5);
        expect(result.ok && result.order.paymentFee).toBe(34.5);
    });

    it('surfaces the server error message (e.g. promo limit reached)', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'Promo code usage limit reached' } });
        const result = await placeOrder(input);
        expect(result).toEqual({ ok: false, error: 'Promo code usage limit reached' });
    });

    it('fails safely when the RPC returns no order', async () => {
        rpcMock.mockResolvedValue({ data: null, error: null });
        const result = await placeOrder(input);
        expect(result.ok).toBe(false);
    });

    it('fails safely when the request throws', async () => {
        rpcMock.mockRejectedValue(new Error('network down'));
        const result = await placeOrder(input);
        expect(result).toEqual({ ok: false, error: 'network down' });
    });
});

describe('validatePromoCode', () => {
    it('validates through the RPC with the trimmed upper-case code and subtotal', async () => {
        rpcMock.mockResolvedValue({
            data: {
                valid: true,
                id: 'promo-1',
                code: 'SAVEBIG',
                discount_type: 'fixed',
                discount_value: 4500,
                max_discount_amount: null,
                min_purchase_amount: 11000,
                discount: 4500,
            },
            error: null,
        });

        const result = await validatePromoCode('  savebig ', 12000);

        expect(rpcMock).toHaveBeenCalledWith('validate_promo_code', { p_code: 'SAVEBIG', p_subtotal: 12000 });
        expect(fromMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            ok: true,
            promo: {
                id: 'promo-1',
                code: 'SAVEBIG',
                discount_type: 'fixed',
                discount_value: 4500,
                max_discount_amount: null,
                min_purchase_amount: 11000,
            },
        });
    });

    it('returns the server reason for an invalid code', async () => {
        rpcMock.mockResolvedValue({ data: { valid: false, error: 'Promo code has expired' }, error: null });
        expect(await validatePromoCode('OLD', 5000)).toEqual({ ok: false, error: 'Promo code has expired' });
    });

    it('rejects an empty code without a network call', async () => {
        expect(await validatePromoCode('   ', 5000)).toEqual({ ok: false, error: 'Please enter a promo code' });
        expect(rpcMock).not.toHaveBeenCalled();
    });

    it('maps transport errors to a generic message', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
        expect(await validatePromoCode('X', 1)).toEqual({ ok: false, error: 'Failed to apply promo code' });
    });
});

describe('trackOrder', () => {
    it('looks the order up by reference and contact through the RPC', async () => {
        rpcMock.mockResolvedValue({
            data: [{ id: 'o1', order_number: 'PLP-1234', payment_fee: 34.5, total_price: 1184.5 }],
            error: null,
        });

        const result = await trackOrder(' PLP-1234 ', ' ana@example.com ');

        expect(rpcMock).toHaveBeenCalledWith('track_order', {
            p_order_ref: 'PLP-1234',
            p_contact: 'ana@example.com',
        });
        expect(result.ok && result.order?.order_number).toBe('PLP-1234');
    });

    it('returns null when nothing matches', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        const result = await trackOrder('PLP-1', 'x@y.z');
        expect(result).toEqual({ ok: true, order: null });
    });

    it('requires both the reference and the contact', async () => {
        const result = await trackOrder('PLP-1', '');
        expect(result.ok).toBe(false);
        expect(rpcMock).not.toHaveBeenCalled();
    });

    it('reports RPC errors', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
        expect((await trackOrder('PLP-1', 'a@b.c')).ok).toBe(false);
    });
});
