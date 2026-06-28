import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderDetailsView from '../components/orders/OrderDetailsView';
import { copyText } from '../components/orders/orderClipboard';
import type { Order } from '../components/orders/types';

// Spy on copyText but keep the real text-builder helpers.
vi.mock('../components/orders/orderClipboard', async (importActual) => {
  const actual = await importActual<typeof import('../components/orders/orderClipboard')>();
  return { ...actual, copyText: vi.fn().mockResolvedValue(true) };
});

// Mock the Supabase-backed courier hook with deterministic data.
vi.mock('../hooks/useCouriers', () => ({
  useCouriers: () => ({
    couriers: [
      { id: 'c1', name: 'J&T Express', code: 'jnt', tracking_url_template: 'https://t/{tracking}', is_active: true, sort_order: 1, created_at: '' },
      { id: 'c2', name: 'LBC Express', code: 'lbc', tracking_url_template: null, is_active: true, sort_order: 2, created_at: '' },
    ],
    loading: false,
  }),
}));

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
  order_items: [
    { product_id: 'p1', product_name: 'Peptide Nimo', variation_id: null, variation_name: null, quantity: 1, price: 1200, total: 1200 },
  ],
  total_price: 1200,
  payment_method_id: null,
  payment_method_name: 'Bank Transfer',
  payment_proof_url: 'https://img/proof.png',
  contact_method: 'whatsapp',
  order_status: 'new',
  payment_status: 'paid',
  notes: null,
  created_at: '2026-06-28T10:42:00Z',
  updated_at: '2026-06-28T10:42:00Z',
  tracking_number: null,
  shipping_provider: 'jnt',
  shipping_note: null,
  promo_code: null,
  discount_applied: null,
  points_redeemed: null,
  order_number: 'PEP-1003',
};

function setup(overrides: Partial<Order> = {}) {
  const onBack = vi.fn();
  const onConfirm = vi.fn();
  const onUpdateStatus = vi.fn();
  const onSaveTracking = vi.fn();
  render(
    <OrderDetailsView
      order={{ ...baseOrder, ...overrides }}
      onBack={onBack}
      onConfirm={onConfirm}
      onUpdateStatus={onUpdateStatus}
      onSaveTracking={onSaveTracking}
      isProcessing={false}
    />,
  );
  return { onBack, onConfirm, onUpdateStatus, onSaveTracking };
}

describe('OrderDetailsView', () => {
  beforeEach(() => {
    vi.mocked(copyText).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the order number, customer name, and item', () => {
    setup();
    expect(screen.getByText(/PEP-1003/)).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Peptide Nimo')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const { onBack } = setup();
    await user.click(screen.getByRole('button', { name: /back to orders/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('copies the customer name to the clipboard', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /copy name/i }));
    expect(copyText).toHaveBeenCalledWith('Maria Santos');
  });

  it('copies all customer details for booking', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /copy all for booking/i }));
    const written = vi.mocked(copyText).mock.calls[0][0];
    expect(written).toContain('Maria Santos');
    expect(written).toContain('09171234567');
    expect(written).toContain('123 Mabini St');
  });

  it('saves tracking info with the entered values', async () => {
    const user = userEvent.setup();
    const { onSaveTracking } = setup();
    const trackingInput = screen.getByPlaceholderText(/enter tracking number/i);
    await user.type(trackingInput, 'JT123456');
    await user.click(screen.getByRole('button', { name: /save tracking info/i }));
    expect(onSaveTracking).toHaveBeenCalledWith('order-1', 'JT123456', 'jnt', '');
  });

  it('calls onConfirm when confirming a new order', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: /confirm & deduct stock/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdateStatus when the status is changed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const { onUpdateStatus } = setup();
    const statusSelect = screen.getByLabelText(/order status/i);
    await user.selectOptions(statusSelect, 'shipped');
    expect(onUpdateStatus).toHaveBeenCalledWith('order-1', 'shipped');
  });

  it('shows the payment method, paid badge, and total', () => {
    setup();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText(/paid/i)).toBeInTheDocument();
    const totals = screen.getAllByText(/₱1,200\.00/);
    expect(totals.length).toBeGreaterThan(0);
  });

  it('renders discount and points rows when present', () => {
    setup({ discount_applied: 100, points_redeemed: 50, promo_code: 'SAVE10' });
    expect(screen.getByText(/SAVE10/)).toBeInTheDocument();
    expect(screen.getByText(/points/i)).toBeInTheDocument();
  });
});
