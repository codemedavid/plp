import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AnalyticsTabs from '../components/analytics/AnalyticsTabs';

describe('AnalyticsTabs', () => {
  it('renders all six analytics tabs', () => {
    render(<AnalyticsTabs active="sales" onSelect={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    for (const label of [
      'Sales & Profit',
      'Referrals',
      'Network',
      'Customers',
      'Payout & Liability',
      'Product Profit',
    ]) {
      expect(screen.getByRole('tab', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('marks the active tab as selected', () => {
    render(<AnalyticsTabs active="product" onSelect={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Product Profit/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /Sales & Profit/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('calls onSelect with the tab id when a tab is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AnalyticsTabs active="sales" onSelect={onSelect} />);
    await user.click(screen.getByRole('tab', { name: /Payout & Liability/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('payout');
  });

  // Responsiveness guarantee. JSDOM has no layout engine, so we assert on the
  // structural classes that make the strip scroll instead of clip on narrow
  // viewports (see evidence report for the layout-limitation note).
  it('renders a horizontally scrollable tab strip that does not clip', () => {
    render(<AnalyticsTabs active="sales" onSelect={vi.fn()} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('overflow-x-auto');
    // w-fit forces the strip to exceed its parent and get clipped — must be gone.
    expect(tablist.className).not.toContain('w-fit');
  });

  it('keeps each tab pill from squishing or wrapping', () => {
    render(<AnalyticsTabs active="sales" onSelect={vi.fn()} />);
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.className).toContain('shrink-0');
      expect(tab.className).toContain('whitespace-nowrap');
    }
  });
});
