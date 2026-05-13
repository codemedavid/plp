import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import PayoutSimulator from '../components/analytics/PayoutSimulator';
import type { PayoutDetail } from '../components/analytics/useAnalytics';

const current = { l1: 100, l2: 50, l3: 25 };

const payouts: PayoutDetail[] = [
  { inviter_id: 'u1', invitee_id: 'i1', reason: 'referral_l1', level: 1, month: '2026-03-01', points: 1000 },
  { inviter_id: 'u1', invitee_id: 'i2', reason: 'referral_l2', level: 2, month: '2026-03-01', points: 500 },
  { inviter_id: 'u1', invitee_id: 'i3', reason: 'referral_l1', level: 1, month: '2026-04-01', points: 200 },
  { inviter_id: 'u1', invitee_id: 'i4', reason: 'referral_l3', level: 3, month: '2026-05-01', points: 75 },
];

describe('PayoutSimulator', () => {
  it('renders title and three rate inputs', () => {
    render(<PayoutSimulator payouts={payouts} current={current} onClose={vi.fn()} />);
    expect(screen.getByText('Payout Simulator')).toBeInTheDocument();
    expect(screen.getByText(/L1 \(current 100\)/)).toBeInTheDocument();
    expect(screen.getByText(/L2 \(current 50\)/)).toBeInTheDocument();
    expect(screen.getByText(/L3 \(current 25\)/)).toBeInTheDocument();
  });

  it('initializes rates from current config', () => {
    render(<PayoutSimulator payouts={payouts} current={current} onClose={vi.fn()} />);
    const numberInputs = document.querySelectorAll('input[type="number"]');
    expect((numberInputs[0] as HTMLInputElement).value).toBe('100');
    expect((numberInputs[1] as HTMLInputElement).value).toBe('50');
    expect((numberInputs[2] as HTMLInputElement).value).toBe('25');
  });

  it('shows "No payout history" when payouts is empty', () => {
    render(<PayoutSimulator payouts={[]} current={current} onClose={vi.fn()} />);
    expect(screen.getByText('No payout history yet.')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<PayoutSimulator payouts={payouts} current={current} onClose={onClose} />);
    // Close button is the first one (icon button)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows months in table (latest 3)', () => {
    render(<PayoutSimulator payouts={payouts} current={current} onClose={vi.fn()} />);
    expect(screen.getByText('2026-03')).toBeInTheDocument();
    expect(screen.getByText('2026-04')).toBeInTheDocument();
    expect(screen.getByText('2026-05')).toBeInTheDocument();
  });

  it('shows zero delta when rates unchanged', () => {
    render(<PayoutSimulator payouts={payouts} current={current} onClose={vi.fn()} />);
    // Total row delta should contain "+₱0" or similar zero — search for "(0.0%)"
    expect(screen.getByText(/\(0\.0%\)/)).toBeInTheDocument();
  });

  it('recomputes simulated totals when l1 changes', () => {
    render(<PayoutSimulator payouts={payouts} current={current} onClose={vi.fn()} />);
    const numberInputs = document.querySelectorAll('input[type="number"]');
    // Double L1 rate -> should produce a non-zero positive delta
    fireEvent.change(numberInputs[0], { target: { value: '200' } });
    // Delta percentage should no longer be 0.0%
    const deltaText = screen.getByText(/\(\d+\.\d%\)/).textContent || '';
    expect(deltaText).not.toContain('(0.0%)');
  });
});
