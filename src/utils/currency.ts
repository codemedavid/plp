// Currency formatting utility for Philippine Peso

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString('en-PH', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  })}`;
}

export function formatPriceWithDecimals(price: number): string {
  return `₱${price.toLocaleString('en-PH', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Whole pesos print without decimals (₱1,150); amounts with centavos -- such
 * as a percentage payment fee -- print both digits (₱1,184.50) so a recap
 * never shows a rounded figure that differs from what was charged.
 */
export function formatPriceExact(price: number): string {
  const hasCentavos = Math.round(price * 100) % 100 !== 0;
  const digits = hasCentavos ? 2 : 0;
  return `₱${price.toLocaleString('en-PH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}

export const CURRENCY_SYMBOL = '₱';
export const CURRENCY_CODE = 'PHP';

