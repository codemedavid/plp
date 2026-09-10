import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import OrderPlacedPanel from '../components/orders/OrderPlacedPanel';
import type { OrderPlacedSummary } from '../lib/orderPlacedSummary';

const summary: OrderPlacedSummary = {
  orderNumber: 'PLP-1234',
  email: 'buyer@example.com',
  customerName: 'Juan Dela Cruz',
  items: [
    { name: 'Tirzepatide (10mg)', quantity: 2, total: 5000 },
    { name: 'Retatrutide (5mg)', quantity: 1, total: 3200 },
  ],
  subtotal: 8200,
  shippingFee: 150,
  discount: 500,
  pointsRedeemed: 100,
  total: 7750,
};

const renderPanel = (value: OrderPlacedSummary | null) =>
  render(
    <MemoryRouter>
      <OrderPlacedPanel summary={value} />
    </MemoryRouter>
  );

describe('OrderPlacedPanel', () => {
  it('confirms the order was placed', () => {
    renderPanel(summary);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/order placed/i);
  });

  it('shows the order reference', () => {
    renderPanel(summary);

    expect(screen.getByText('PLP-1234')).toBeInTheDocument();
  });

  it('tells the customer to wait for the confirmation email at their address', () => {
    renderPanel(summary);

    expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
    expect(screen.getByText(/confirmation email/i)).toBeInTheDocument();
    expect(screen.getByText(/spam/i)).toBeInTheDocument();
  });

  it('says order status updates are emailed too', () => {
    renderPanel(summary);

    expect(screen.getByText(/every status update/i)).toBeInTheDocument();
  });

  it('lists the ordered items with quantities', () => {
    renderPanel(summary);

    expect(screen.getByText('Tirzepatide (10mg)')).toBeInTheDocument();
    expect(screen.getByText('Retatrutide (5mg)')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('shows the order totals', () => {
    renderPanel(summary);

    expect(screen.getByText('₱8,200')).toBeInTheDocument();
    expect(screen.getByText('₱150')).toBeInTheDocument();
    expect(screen.getByText('-₱500')).toBeInTheDocument();
    expect(screen.getByText('-₱100')).toBeInTheDocument();
    expect(screen.getByText('₱7,750')).toBeInTheDocument();
  });

  it('hides discount and points rows when they are zero', () => {
    renderPanel({ ...summary, discount: 0, pointsRedeemed: 0 });

    expect(screen.queryByText(/promo discount/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/points redeemed/i)).not.toBeInTheDocument();
  });

  it('links to order tracking and back to the catalog', () => {
    renderPanel(summary);

    expect(screen.getByRole('link', { name: /track/i })).toHaveAttribute('href', '/track-order');
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute('href', '/');
  });

  it('still renders guidance when the page is opened without order details', () => {
    renderPanel(null);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/order placed/i);
    expect(screen.getByText(/confirmation email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track/i })).toBeInTheDocument();
    expect(screen.queryByText(/order summary/i)).not.toBeInTheDocument();
  });
});
