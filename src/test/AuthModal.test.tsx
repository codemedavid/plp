import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn(), identify: vi.fn() },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));

import AuthModal from '../components/AuthModal';

describe('AuthModal signup incentive copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show the signup bonus in sign-in mode', () => {
    render(<AuthModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByText(/100 points/i)).not.toBeInTheDocument();
  });

  it('promotes the 100-point welcome bonus once the visitor switches to sign up', () => {
    render(<AuthModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(screen.getByText(/100 points/i)).toBeInTheDocument();
    expect(screen.getByText(/₱100/)).toBeInTheDocument();
  });
});
