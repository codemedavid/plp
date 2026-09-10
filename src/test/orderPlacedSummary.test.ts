import { describe, it, expect } from 'vitest';
import { parseOrderPlacedSummary } from '../lib/orderPlacedSummary';

describe('parseOrderPlacedSummary', () => {
  const validState = {
    orderNumber: 'PLP-1234',
    email: 'buyer@example.com',
    customerName: 'Juan Dela Cruz',
    items: [{ name: 'Tirzepatide (10mg)', quantity: 2, total: 5000 }],
    subtotal: 5000,
    shippingFee: 150,
    discount: 500,
    pointsRedeemed: 0,
    total: 4650,
  };

  it('returns null when there is no navigation state', () => {
    expect(parseOrderPlacedSummary(null)).toBeNull();
    expect(parseOrderPlacedSummary(undefined)).toBeNull();
  });

  it('returns null when the state is not an object', () => {
    expect(parseOrderPlacedSummary('PLP-1234')).toBeNull();
  });

  it('returns null when the order number is missing or blank', () => {
    expect(parseOrderPlacedSummary({ ...validState, orderNumber: '' })).toBeNull();
    expect(parseOrderPlacedSummary({ ...validState, orderNumber: undefined })).toBeNull();
  });

  it('parses a complete summary', () => {
    expect(parseOrderPlacedSummary(validState)).toEqual(validState);
  });

  it('defaults missing money fields to zero and missing text to empty', () => {
    const parsed = parseOrderPlacedSummary({ orderNumber: 'PLP-9999' });

    expect(parsed).toEqual({
      orderNumber: 'PLP-9999',
      email: '',
      customerName: '',
      items: [],
      subtotal: 0,
      shippingFee: 0,
      discount: 0,
      pointsRedeemed: 0,
      total: 0,
    });
  });

  it('drops malformed line items instead of rendering broken rows', () => {
    const parsed = parseOrderPlacedSummary({
      ...validState,
      items: [
        { name: 'Retatrutide', quantity: 1, total: 3200 },
        { name: '', quantity: 1, total: 100 },
        { name: 'No quantity', quantity: 0, total: 100 },
        'not-an-item',
      ],
    });

    expect(parsed?.items).toEqual([{ name: 'Retatrutide', quantity: 1, total: 3200 }]);
  });

  it('coerces non-finite numbers to zero', () => {
    const parsed = parseOrderPlacedSummary({ ...validState, total: Number.NaN, shippingFee: 'free' });

    expect(parsed?.total).toBe(0);
    expect(parsed?.shippingFee).toBe(0);
  });
});
