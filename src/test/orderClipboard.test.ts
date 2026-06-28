import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyText, buildAddressText, buildBookingText } from '../components/orders/orderClipboard';
import type { Order } from '../components/orders/types';

const baseOrder: Order = {
  id: 'order-1',
  customer_name: 'Maria Santos',
  customer_email: 'maria@example.com',
  customer_phone: '09171234567',
  shipping_address: '123 Mabini St',
  shipping_barangay: 'Poblacion',
  shipping_city: 'Makati',
  shipping_state: 'Metro Manila',
  shipping_zip_code: '1200',
  shipping_country: 'Philippines',
  shipping_location: 'NCR',
  shipping_fee: 0,
  order_items: [],
  total_price: 1200,
  payment_method_id: null,
  payment_method_name: 'Bank Transfer',
  payment_proof_url: null,
  contact_method: 'whatsapp',
  order_status: 'new',
  payment_status: 'paid',
  notes: null,
  created_at: '2026-06-28T10:42:00Z',
  updated_at: '2026-06-28T10:42:00Z',
  tracking_number: null,
  shipping_provider: null,
  shipping_note: null,
  promo_code: null,
  discount_applied: null,
  points_redeemed: null,
  order_number: 'PEP-1003',
};

describe('buildAddressText', () => {
  it('joins street, barangay, city/state/zip, country, and region', () => {
    const text = buildAddressText(baseOrder);
    expect(text).toContain('123 Mabini St');
    expect(text).toContain('Poblacion');
    expect(text).toContain('Makati, Metro Manila 1200');
    expect(text).toContain('Philippines');
    expect(text).toContain('NCR');
  });

  it('omits empty barangay and region lines', () => {
    const text = buildAddressText({ ...baseOrder, shipping_barangay: null, shipping_location: null });
    expect(text).not.toContain('Poblacion');
    expect(text).not.toContain('NCR');
    expect(text).toContain('123 Mabini St');
    expect(text).toContain('Makati, Metro Manila 1200');
  });
});

describe('buildBookingText', () => {
  it('includes name, phone, email, and the full address', () => {
    const text = buildBookingText(baseOrder);
    expect(text).toContain('Maria Santos');
    expect(text).toContain('09171234567');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('123 Mabini St');
    expect(text).toContain('Makati, Metro Manila 1200');
  });
});

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the value to the clipboard and resolves true on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyText('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result).toBe(true);
  });

  it('resolves false when the clipboard API throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyText('hello');

    expect(result).toBe(false);
  });

  it('resolves false when the clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    const result = await copyText('hello');

    expect(result).toBe(false);
  });
});
