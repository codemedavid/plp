import { getPaymentFeeLabel } from '../../lib/paymentFee';
import { formatPriceExact } from '../../utils/currency';

type Props = {
    subtotal: number;
    shippingFee: number;
    isFreeShipping: boolean;
    discount: number;
    pointsRedeemed: number;
    /** Selected payment method; null before one is chosen. */
    paymentMethodName: string | null;
    surchargePct: number;
    /** Fee for the selected method, from computeCheckoutTotals(). 0 hides the line. */
    paymentFee: number;
    /** Amount to pay, fee included. */
    total: number;
};

/** Payment-step order summary lines (subtotal → total), including the payment-method fee. */
export default function CheckoutTotals({
    subtotal,
    shippingFee,
    isFreeShipping,
    discount,
    pointsRedeemed,
    paymentMethodName,
    surchargePct,
    paymentFee,
    total,
}: Props) {
    const showFee = paymentFee > 0;

    return (
        <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPriceExact(subtotal)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                {isFreeShipping ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                ) : (
                    <span>{formatPriceExact(shippingFee)}</span>
                )}
            </div>
            {discount > 0 && (
                <div className="flex justify-between text-brand-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatPriceExact(discount)}</span>
                </div>
            )}
            {pointsRedeemed > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Points</span>
                    <span>-{formatPriceExact(pointsRedeemed)}</span>
                </div>
            )}
            {showFee && (
                <div className="flex justify-between">
                    <span className="text-gray-600">{getPaymentFeeLabel(paymentMethodName, surchargePct)}</span>
                    <span data-testid="checkout-payment-fee">{formatPriceExact(paymentFee)}</span>
                </div>
            )}
            <div className="flex justify-between font-bold text-charcoal-900 text-lg pt-2">
                <span>Total</span>
                <span data-testid="checkout-total" aria-live="polite">
                    {formatPriceExact(total)}
                </span>
            </div>
        </div>
    );
}
