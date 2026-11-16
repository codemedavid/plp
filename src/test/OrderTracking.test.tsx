import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const trackOrderMock = vi.fn();
vi.mock('../lib/orderApi', () => ({
    trackOrder: (...args: unknown[]) => trackOrderMock(...args),
}));

// The direct-table client must not be used for guest lookups.
const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock('../lib/supabase', () => ({
    supabase: {
        rpc: (...args: unknown[]) => rpcMock(...args),
        from: (...args: unknown[]) => fromMock(...args),
    },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../hooks/useCart', () => ({ useCart: () => ({ cartItems: [] }) }));
vi.mock('../hooks/useReviews', () => ({
    getReviewsForOrder: vi.fn().mockResolvedValue([]),
    REVIEW_REWARD_POINTS: 50,
}));
vi.mock('../components/Header', () => ({ default: () => <header /> }));
vi.mock('../components/Footer', () => ({ default: () => <footer /> }));
vi.mock('../components/seo/Seo', () => ({ default: () => null }));
vi.mock('../components/WriteReviewModal', () => ({ default: () => null }));

import OrderTracking from '../components/OrderTracking';

const trackedOrder = {
    id: 'ea8eb53a-dbd9-48e6-afe7-f540ddea3e88',
    order_number: 'PLP-6080',
    order_status: 'new',
    payment_status: 'pending',
    tracking_number: null,
    shipping_provider: null,
    shipping_note: null,
    total_price: 1184.5,
    shipping_fee: 150,
    order_items: [{ product_id: 'p1', product_name: 'Tirzepatide', quantity: 2 }],
    created_at: '2026-11-17T00:00:00Z',
    promo_code: null,
    discount_applied: 0,
    points_redeemed: 0,
    payment_fee: 34.5,
    payment_fee_pct: 3,
    payment_method_name: 'QRPh',
    customer_name: 'Ana',
};

const renderPage = () =>
    render(
        <MemoryRouter>
            <OrderTracking />
        </MemoryRouter>,
    );

beforeEach(() => {
    trackOrderMock.mockReset();
    rpcMock.mockReset();
    fromMock.mockReset();
});

describe('OrderTracking guest lookup', () => {
    it('asks for the email or phone used at checkout', () => {
        renderPage();
        expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument();
    });

    it('keeps Track disabled until both the order number and contact are filled', async () => {
        const user = userEvent.setup();
        renderPage();
        const button = screen.getByRole('button', { name: /track order/i });
        expect(button).toBeDisabled();
        await user.type(screen.getByLabelText(/order number/i), 'PLP-6080');
        expect(button).toBeDisabled();
        await user.type(screen.getByLabelText(/email or phone/i), 'ana@example.com');
        expect(button).toBeEnabled();
    });

    it('looks up the order through track_order with both values', async () => {
        trackOrderMock.mockResolvedValue({ ok: true, order: trackedOrder });
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/order number/i), 'PLP-6080');
        await user.type(screen.getByLabelText(/email or phone/i), 'ana@example.com');
        await user.click(screen.getByRole('button', { name: /track order/i }));

        expect(trackOrderMock).toHaveBeenCalledWith('PLP-6080', 'ana@example.com');
        expect(rpcMock).not.toHaveBeenCalledWith('get_order_details', expect.anything());
        expect(await screen.findByText('QRPh fee (3%)')).toBeInTheDocument();
        expect(screen.getByText('₱34.50')).toBeInTheDocument();
        expect(screen.getByText('₱1,184.50')).toBeInTheDocument();
        // Subtotal backs out shipping and the fee: 1184.50 - 150 - 34.50 = 1000.
        expect(screen.getByText('₱1,000')).toBeInTheDocument();
    });

    it('shows a not-found message that mentions the contact check', async () => {
        trackOrderMock.mockResolvedValue({ ok: true, order: null });
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/order number/i), 'PLP-0000');
        await user.type(screen.getByLabelText(/email or phone/i), 'x@y.z');
        await user.click(screen.getByRole('button', { name: /track order/i }));

        expect(await screen.findByText(/order not found/i)).toHaveTextContent(/email or phone/i);
    });

    it('does not render a stray "0" for orders without discount or points', async () => {
        trackOrderMock.mockResolvedValue({ ok: true, order: { ...trackedOrder, payment_fee: 0, payment_fee_pct: 0, total_price: 1150 } });
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/order number/i), 'PLP-6080');
        await user.type(screen.getByLabelText(/email or phone/i), 'ana@example.com');
        await user.click(screen.getByRole('button', { name: /track order/i }));

        await screen.findByText('₱1,150');
        expect(screen.queryByText(/fee \(/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    });
});
