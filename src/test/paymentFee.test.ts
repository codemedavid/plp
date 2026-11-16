import { describe, it, expect } from 'vitest';
import {
    MAX_SURCHARGE_PCT,
    computePaymentFee,
    formatSurchargePct,
    getPaymentFeeLabel,
    normalizeSurchargePct,
    validateSurchargePctInput,
} from '../lib/paymentFee';

describe('computePaymentFee', () => {
    it('returns 0 when the method has no surcharge', () => {
        expect(computePaymentFee(1150, 0)).toBe(0);
    });

    it('charges 3% of the amount payable, rounded to the centavo', () => {
        // 1,150 payable (1,000 items + 150 shipping) -> 34.50 fee
        expect(computePaymentFee(1150, 3)).toBe(34.5);
        // 1,234.57 * 3% = 37.0371 -> 37.04
        expect(computePaymentFee(1234.57, 3)).toBe(37.04);
    });

    it('supports fractional percentages', () => {
        expect(computePaymentFee(1000, 2.5)).toBe(25);
        // 1,001 * 1.75% = 17.5175 -> 17.52
        expect(computePaymentFee(1001, 1.75)).toBe(17.52);
    });

    it('rounds half a centavo up, matching Postgres round(numeric, 2)', () => {
        // 0.50 * 3% = 0.015 -> 0.02 (a naive float multiply gives 0.01)
        expect(computePaymentFee(0.5, 3)).toBe(0.02);
        // 1.01 * 2.5% = 0.02525 -> 0.03
        expect(computePaymentFee(1.01, 2.5)).toBe(0.03);
    });

    it('never charges a fee on a zero or negative amount', () => {
        expect(computePaymentFee(0, 3)).toBe(0);
        expect(computePaymentFee(-50, 3)).toBe(0);
    });

    it('treats a missing or invalid percentage as no fee', () => {
        expect(computePaymentFee(1000, Number.NaN)).toBe(0);
        expect(computePaymentFee(1000, -3)).toBe(0);
    });

    it('caps the percentage at the database maximum', () => {
        expect(computePaymentFee(1000, 50)).toBe(1000 * (MAX_SURCHARGE_PCT / 100));
    });
});

describe('normalizeSurchargePct', () => {
    it('accepts numbers and numeric strings (PostgREST may send either)', () => {
        expect(normalizeSurchargePct(3)).toBe(3);
        expect(normalizeSurchargePct('3.00')).toBe(3);
        expect(normalizeSurchargePct('2.5')).toBe(2.5);
    });

    it('maps null, undefined, garbage and negatives to 0', () => {
        expect(normalizeSurchargePct(null)).toBe(0);
        expect(normalizeSurchargePct(undefined)).toBe(0);
        expect(normalizeSurchargePct('abc')).toBe(0);
        expect(normalizeSurchargePct(-1)).toBe(0);
    });

    it('clamps to the maximum', () => {
        expect(normalizeSurchargePct(25)).toBe(MAX_SURCHARGE_PCT);
    });
});

describe('formatSurchargePct / getPaymentFeeLabel', () => {
    it('drops trailing zeros', () => {
        expect(formatSurchargePct(3)).toBe('3');
        expect(formatSurchargePct(2.5)).toBe('2.5');
        expect(formatSurchargePct(1.75)).toBe('1.75');
    });

    it('builds the checkout line label from the method name', () => {
        expect(getPaymentFeeLabel('QRPh', 3)).toBe('QRPh fee (3%)');
        expect(getPaymentFeeLabel('GCash', 2.5)).toBe('GCash fee (2.5%)');
    });

    it('falls back to a generic label when the name is blank', () => {
        expect(getPaymentFeeLabel('', 3)).toBe('Payment fee (3%)');
        expect(getPaymentFeeLabel(null, 3)).toBe('Payment fee (3%)');
    });
});

describe('validateSurchargePctInput', () => {
    it('accepts 0 (no fee) and an empty field as 0', () => {
        expect(validateSurchargePctInput('0')).toEqual({ ok: true, value: 0 });
        expect(validateSurchargePctInput('')).toEqual({ ok: true, value: 0 });
        expect(validateSurchargePctInput('   ')).toEqual({ ok: true, value: 0 });
    });

    it('accepts whole and half percentages up to the maximum', () => {
        expect(validateSurchargePctInput('3')).toEqual({ ok: true, value: 3 });
        expect(validateSurchargePctInput('2.5')).toEqual({ ok: true, value: 2.5 });
        expect(validateSurchargePctInput('10')).toEqual({ ok: true, value: 10 });
    });

    it('rejects values above the maximum or below zero', () => {
        expect(validateSurchargePctInput('10.5').ok).toBe(false);
        expect(validateSurchargePctInput('-1').ok).toBe(false);
    });

    it('rejects steps other than 0.5', () => {
        expect(validateSurchargePctInput('2.25').ok).toBe(false);
    });

    it('rejects non-numbers', () => {
        expect(validateSurchargePctInput('abc').ok).toBe(false);
        expect(validateSurchargePctInput('3%').ok).toBe(false);
    });

    it('returns a human-readable error', () => {
        const result = validateSurchargePctInput('12');
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/0.*10/);
    });
});
