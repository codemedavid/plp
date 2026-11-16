import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceExact, formatPriceWithDecimals, CURRENCY_SYMBOL, CURRENCY_CODE } from '../utils/currency';

describe('Currency Utilities', () => {
  describe('formatPrice', () => {
    it('formats a whole number price with peso symbol', () => {
      expect(formatPrice(2500)).toBe('₱2,500');
    });

    it('formats zero', () => {
      expect(formatPrice(0)).toBe('₱0');
    });

    it('truncates decimals (no fraction digits)', () => {
      expect(formatPrice(1999.99)).toBe('₱2,000');
    });

    it('formats large numbers with commas', () => {
      expect(formatPrice(1000000)).toBe('₱1,000,000');
    });

    it('formats small numbers without commas', () => {
      expect(formatPrice(150)).toBe('₱150');
    });

    it('handles negative prices', () => {
      const result = formatPrice(-500);
      expect(result).toContain('500');
      expect(result).toContain('₱');
    });
  });

  describe('formatPriceWithDecimals', () => {
    it('formats price with 2 decimal places', () => {
      expect(formatPriceWithDecimals(2500)).toBe('₱2,500.00');
    });

    it('formats zero with decimals', () => {
      expect(formatPriceWithDecimals(0)).toBe('₱0.00');
    });

    it('preserves decimal values', () => {
      expect(formatPriceWithDecimals(1999.50)).toBe('₱1,999.50');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatPriceWithDecimals(99.999)).toBe('₱100.00');
    });
  });

  describe('Constants', () => {
    it('exports peso symbol', () => {
      expect(CURRENCY_SYMBOL).toBe('₱');
    });

    it('exports PHP currency code', () => {
      expect(CURRENCY_CODE).toBe('PHP');
    });
  });
});


describe('formatPriceExact', () => {
    it('shows whole pesos without decimals', () => {
        expect(formatPriceExact(1150)).toBe('₱1,150');
    });

    it('shows centavos when present (e.g. a 3% payment fee)', () => {
        expect(formatPriceExact(34.5)).toBe('₱34.50');
        expect(formatPriceExact(1184.5)).toBe('₱1,184.50');
    });

    it('never shows more than two decimals', () => {
        expect(formatPriceExact(37.0371)).toBe('₱37.04');
    });
});
