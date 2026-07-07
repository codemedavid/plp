// Single source for the signup welcome-bonus number used in on-site copy.
// The authoritative award amount lives server-side in
// referral_config.signup_bonus_points (see the signup_bonus migration);
// this constant keeps the marketing copy in sync with the default.
export const SIGNUP_BONUS_POINTS = 100;

// 1 point = ₱1 across the points economy (points_ledger / withdrawals).
export function signupBonusPesos(): string {
  return `₱${SIGNUP_BONUS_POINTS}`;
}
