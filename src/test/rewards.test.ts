import { describe, it, expect } from 'vitest';
import { SIGNUP_BONUS_POINTS, signupBonusPesos } from '../lib/rewards';

describe('signup bonus reward constants', () => {
  it('awards 100 points on signup by default', () => {
    expect(SIGNUP_BONUS_POINTS).toBe(100);
  });

  it('renders the peso value as ₱100 (1 point = ₱1)', () => {
    expect(signupBonusPesos()).toBe('₱100');
  });
});
