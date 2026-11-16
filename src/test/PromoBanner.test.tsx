import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() },
}));

import PromoBanner from '../components/PromoBanner';

// The 8.8 slide only shows inside the sale window (Aug 7-9 PHT), so the clock
// is pinned — otherwise this suite would go silent once the sale closes.
const DURING_PROMO = new Date('2026-08-08T12:00:00+08:00');

describe('PromoBanner 8.8 tagline', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_PROMO);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advertises "up to 50% off" rather than a flat 50%', () => {
    render(<PromoBanner />);

    expect(screen.getByText(/up to 50% off/i)).toBeInTheDocument();
  });

  it('does not promise a flat "50% off everything"', () => {
    // Not every SKU lands at exactly half price — the promo is floor-guarded
    // against already-deeper clearance prices — so the claim must be hedged.
    render(<PromoBanner />);

    expect(screen.queryByText(/^50% off everything/i)).not.toBeInTheDocument();
  });
});

describe('PromoBanner ber-months slide', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('leads with the ber-months sale while it runs', () => {
    vi.setSystemTime(new Date('2026-11-20T12:00:00+08:00'));
    render(<PromoBanner />);

    expect(screen.getByText(/up to 55% off/i)).toBeInTheDocument();
    expect(screen.getByText(/till the year ends/i)).toBeInTheDocument();
  });

  it('drops the ber-months slide after New Year', () => {
    vi.setSystemTime(new Date('2027-01-02T12:00:00+08:00'));
    render(<PromoBanner />);

    expect(screen.queryByText(/till the year ends/i)).not.toBeInTheDocument();
  });
});
