import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parsePricingMismatch } from '../lib/pricingMismatch';
import { PriceCheckBadge, PriceCheckNotice } from '../components/orders/PriceCheck';

// Shape written by place_order() (migration 20261118000300).
const RAW = {
  client_subtotal: 1100,
  server_subtotal: 1200,
  client_shipping_fee: 150,
  server_shipping_fee: 150,
  lines: [],
  detected_at: '2026-11-18T03:00:00Z',
};

describe('parsePricingMismatch', () => {
  it('returns null for unflagged orders', () => {
    expect(parsePricingMismatch(null)).toBeNull();
    expect(parsePricingMismatch(undefined)).toBeNull();
  });

  it('parses the place_order() record', () => {
    expect(parsePricingMismatch(RAW)).toEqual({
      clientSubtotal: 1100,
      serverSubtotal: 1200,
      clientShipping: 150,
      serverShipping: 150,
      detectedAt: '2026-11-18T03:00:00Z',
    });
  });

  it('accepts numeric strings (jsonb numerics may arrive as strings) and nulls', () => {
    expect(
      parsePricingMismatch({ ...RAW, client_subtotal: null, server_subtotal: '1200.50', client_shipping_fee: 'abc' }),
    ).toMatchObject({ clientSubtotal: null, serverSubtotal: 1200.5, clientShipping: null });
  });

  it('still flags a malformed-but-present record (fails visible, not silent)', () => {
    expect(parsePricingMismatch('garbage')).toEqual({
      clientSubtotal: null,
      serverSubtotal: null,
      clientShipping: null,
      serverShipping: null,
      detectedAt: null,
    });
    expect(parsePricingMismatch([])).not.toBeNull();
  });
});

describe('PriceCheckBadge', () => {
  it('renders nothing for unflagged orders', () => {
    const { container } = render(<PriceCheckBadge pricingMismatch={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a "Price check" badge for flagged orders', () => {
    render(<PriceCheckBadge pricingMismatch={RAW} />);
    expect(screen.getByText('Price check')).toBeInTheDocument();
  });
});

describe('PriceCheckNotice', () => {
  it('renders nothing for unflagged orders', () => {
    const { container } = render(<PriceCheckNotice pricingMismatch={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains the mismatch with client vs server subtotal and shipping', () => {
    render(<PriceCheckNotice pricingMismatch={RAW} />);
    const notice = screen.getByRole('note', { name: /price check/i });
    expect(notice).toHaveTextContent(/customer's checkout showed different prices/i);
    expect(screen.getByText('₱1,100.00')).toBeInTheDocument();
    expect(screen.getByText('₱1,200.00')).toBeInTheDocument();
    expect(screen.getAllByText('₱150.00')).toHaveLength(2);
    expect(notice).toHaveTextContent(/verify the amount on the payment proof/i);
  });

  it('shows a dash for values the client did not send', () => {
    render(<PriceCheckNotice pricingMismatch={{ ...RAW, client_subtotal: null }} />);
    expect(screen.getByText('Not sent')).toBeInTheDocument();
  });

  it('renders hostile values as inert text', () => {
    render(
      <PriceCheckNotice pricingMismatch={{ ...RAW, client_subtotal: '<img src=x onerror=alert(1)>' }} />,
    );
    expect(document.querySelector('img')).toBeNull();
  });
});
