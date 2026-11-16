import { describe, it, expect } from 'vitest';
import {
    computeCheckoutTotals,
    computePromoDiscount,
    deriveItemsSubtotal,
} from '../lib/orderTotals';

describe('computePromoDiscount', () => {
    it('applies a fixed discount', () => {
        expect(computePromoDiscount({ discount_type: 'fixed', discount_value: 4500 }, 12000)).toBe(4500);
    });

    it('never discounts more than the subtotal', () => {
        expect(computePromoDiscount({ discount_type: 'fixed', discount_value: 4500 }, 3000)).toBe(3000);
    });

    it('applies a percentage, rounded to the centavo', () => {
        expect(computePromoDiscount({ discount_type: 'percentage', discount_value: 15 }, 1234.5)).toBe(185.18);
    });

    it('caps a percentage at max_discount_amount', () => {
        expect(
            computePromoDiscount({ discount_type: 'percentage', discount_value: 50, max_discount_amount: 500 }, 4000),
        ).toBe(500);
    });

    it('treats a null or 0 cap as uncapped (matches the admin screen)', () => {
        expect(
            computePromoDiscount({ discount_type: 'percentage', discount_value: 10, max_discount_amount: 0 }, 4000),
        ).toBe(400);
        expect(
            computePromoDiscount({ discount_type: 'percentage', discount_value: 10, max_discount_amount: null }, 4000),
        ).toBe(400);
    });

    it('returns 0 without a promo or with an empty cart', () => {
        expect(computePromoDiscount(null, 4000)).toBe(0);
        expect(computePromoDiscount({ discount_type: 'fixed', discount_value: 100 }, 0)).toBe(0);
    });
});

describe('computeCheckoutTotals', () => {
    const base = { subtotal: 1000, shippingFee: 150, discount: 0, pointsRedeemed: 0 };

    it('adds no fee when the selected method has no surcharge', () => {
        expect(computeCheckoutTotals({ ...base, surchargePct: 0 })).toEqual({
            payable: 1150,
            paymentFee: 0,
            total: 1150,
        });
    });

    it('charges the surcharge on the amount after discounts and points, including shipping', () => {
        // 1000 + 150 - 100 discount - 50 points = 1000 payable -> 30.00 fee
        expect(
            computeCheckoutTotals({ subtotal: 1000, shippingFee: 150, discount: 100, pointsRedeemed: 50, surchargePct: 3 }),
        ).toEqual({ payable: 1000, paymentFee: 30, total: 1030 });
    });

    it('matches the server example used in the rollback test (34.50 on 1,150)', () => {
        expect(computeCheckoutTotals({ ...base, surchargePct: 3 })).toEqual({
            payable: 1150,
            paymentFee: 34.5,
            total: 1184.5,
        });
    });

    it('never goes below zero', () => {
        expect(
            computeCheckoutTotals({ subtotal: 100, shippingFee: 0, discount: 500, pointsRedeemed: 0, surchargePct: 3 }),
        ).toEqual({ payable: 0, paymentFee: 0, total: 0 });
    });
});

describe('deriveItemsSubtotal', () => {
    it('backs the payment fee out of the stored total', () => {
        // total_price 1030 = 1000 items + 150 shipping - 100 discount - 50 points + 30 fee
        expect(
            deriveItemsSubtotal({ total: 1030, shippingFee: 150, discount: 100, pointsRedeemed: 50, paymentFee: 30 }),
        ).toBe(1000);
    });

    it('works for legacy orders without a fee', () => {
        expect(
            deriveItemsSubtotal({ total: 1150, shippingFee: 150, discount: 0, pointsRedeemed: 0, paymentFee: 0 }),
        ).toBe(1000);
    });

    it('tolerates null columns', () => {
        expect(
            deriveItemsSubtotal({ total: 1150, shippingFee: null, discount: null, pointsRedeemed: null, paymentFee: null }),
        ).toBe(1150);
    });
});
