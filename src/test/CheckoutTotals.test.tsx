import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CheckoutTotals from '../components/checkout/CheckoutTotals';
import { computeCheckoutTotals } from '../lib/orderTotals';

interface Method {
    name: string;
    surcharge_pct: number;
}

const MAYA: Method = { name: 'Maya', surcharge_pct: 0 };
const QRPH: Method = { name: 'QRPh', surcharge_pct: 3 };

// Mirrors how Checkout derives the props from the selected method.
const renderFor = (method: Method | null) => {
    const totals = computeCheckoutTotals({
        subtotal: 1000,
        shippingFee: 150,
        discount: 0,
        pointsRedeemed: 0,
        surchargePct: method?.surcharge_pct ?? 0,
    });
    return (
        <CheckoutTotals
            subtotal={1000}
            shippingFee={150}
            isFreeShipping={false}
            discount={0}
            pointsRedeemed={0}
            paymentMethodName={method?.name ?? null}
            surchargePct={method?.surcharge_pct ?? 0}
            paymentFee={totals.paymentFee}
            total={totals.total}
        />
    );
};

describe('CheckoutTotals', () => {
    it('shows no fee line when the selected method has no surcharge', () => {
        render(renderFor(MAYA));
        expect(screen.queryByText(/fee \(/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('checkout-total')).toHaveTextContent('₱1,150');
    });

    it('shows "<Method> fee (<pct>%)" and the higher total while a surcharged method is selected', () => {
        render(renderFor(QRPH));
        expect(screen.getByText('QRPh fee (3%)')).toBeInTheDocument();
        expect(screen.getByTestId('checkout-payment-fee')).toHaveTextContent('₱34.50');
        expect(screen.getByTestId('checkout-total')).toHaveTextContent('₱1,184.50');
    });

    it('updates live when switching payment methods', () => {
        const { rerender } = render(renderFor(QRPH));
        expect(screen.getByText('QRPh fee (3%)')).toBeInTheDocument();

        rerender(renderFor(MAYA));
        expect(screen.queryByText('QRPh fee (3%)')).not.toBeInTheDocument();
        expect(screen.getByTestId('checkout-total')).toHaveTextContent('₱1,150');

        rerender(renderFor(QRPH));
        expect(screen.getByTestId('checkout-total')).toHaveTextContent('₱1,184.50');
    });

    it('shows no fee line before a method is chosen', () => {
        render(renderFor(null));
        expect(screen.queryByTestId('checkout-payment-fee')).not.toBeInTheDocument();
    });

    it('still renders discount, points and free shipping lines', () => {
        render(
            <CheckoutTotals
                subtotal={5000}
                shippingFee={0}
                isFreeShipping
                discount={500}
                pointsRedeemed={100}
                paymentMethodName="QRPh"
                surchargePct={3}
                paymentFee={132}
                total={4532}
            />,
        );
        expect(screen.getByText('FREE')).toBeInTheDocument();
        expect(screen.getByText('-₱500')).toBeInTheDocument();
        expect(screen.getByText('-₱100')).toBeInTheDocument();
        expect(screen.getByText('QRPh fee (3%)')).toBeInTheDocument();
    });
});
