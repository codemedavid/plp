import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() },
}));

// useAuth is mocked per-test via this mutable holder.
const authState: { user: { id: string } | null } = { user: null };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

import WelcomePopup from '../components/WelcomePopup';

const POPUP_DELAY_MS = 2000;

function showPopup() {
  render(<WelcomePopup />);
  act(() => {
    vi.advanceTimersByTime(POPUP_DELAY_MS);
  });
}

describe('WelcomePopup signup incentive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authState.user = null;
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('offers logged-out visitors 100 points for signing up', () => {
    authState.user = null;
    showPopup();
    expect(screen.getAllByText(/100 points/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/₱100/)).toBeInTheDocument();
  });

  it('lets a logged-out visitor open the auth modal from the popup', () => {
    authState.user = null;
    const onOpenAuth = vi.fn();
    window.addEventListener('open-auth', onOpenAuth);
    showPopup();

    const cta = screen.getByRole('button', { name: /sign up|create account|join/i });
    act(() => {
      cta.click();
    });

    expect(onOpenAuth).toHaveBeenCalledTimes(1);
    window.removeEventListener('open-auth', onOpenAuth);
  });

  it('keeps the referral-share pitch for signed-in members', () => {
    authState.user = { id: 'user-1' };
    showPopup();
    expect(screen.getAllByText(/referral/i).length).toBeGreaterThan(0);
    // Signed-in members should not be pitched the signup bonus.
    expect(screen.queryByText(/100 points/i)).not.toBeInTheDocument();
  });
});
