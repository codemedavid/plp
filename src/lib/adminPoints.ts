// Admin manual points grants.
//
// Lets an admin credit a customer's points balance and *name what the points
// are for*. The write itself lands in points_ledger via the admin_grant_points
// SECURITY DEFINER RPC (gated by public.is_admin()), because points_ledger has
// no client INSERT policy. These client-side helpers validate the input up
// front so we never fire a doomed RPC, mirroring award_review_points /
// admin_approve_pending_points.
import { supabase } from './supabase';

// 1 point = ₱1, so a grant is a real liability — cap it to catch fat-finger
// entries (e.g. an extra zero) before they reach the ledger.
export const MAX_POINTS_GRANT = 1_000_000;

// Keeps the "what the points are for" label sane; also matches the ledger.notes
// column being free text rather than an unbounded blob.
export const MAX_GRANT_LABEL_LENGTH = 120;

export interface GrantPointsInput {
  userId: string;
  amount: number;
  /** Human name for what the points are for, e.g. "Loyalty bonus". */
  label: string;
}

export type ValidationResult =
  | { ok: true; value: GrantPointsInput }
  | { ok: false; error: string };

/**
 * Validate and normalize an admin points grant. Returns the trimmed, integer
 * value on success, or a user-facing error message on failure. Pure — no I/O.
 */
export function validateGrantPoints(input: GrantPointsInput): ValidationResult {
  const userId = input.userId?.trim();
  if (!userId) {
    return { ok: false, error: 'Select a customer to grant points to.' };
  }

  const { amount } = input;
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    return { ok: false, error: 'Enter a whole number of points.' };
  }
  if (amount <= 0) {
    return { ok: false, error: 'Points to add must be greater than zero.' };
  }
  if (amount > MAX_POINTS_GRANT) {
    return { ok: false, error: `Points to add cannot exceed ${MAX_POINTS_GRANT.toLocaleString()}.` };
  }

  const label = input.label?.trim() ?? '';
  if (!label) {
    return { ok: false, error: 'Name what the points are for.' };
  }
  if (label.length > MAX_GRANT_LABEL_LENGTH) {
    return { ok: false, error: `Reason must be ${MAX_GRANT_LABEL_LENGTH} characters or fewer.` };
  }

  return { ok: true, value: { userId, amount, label } };
}

/**
 * Grant points to a customer with a named reason. Validates client-side, then
 * calls the admin_grant_points RPC (which re-checks admin + inputs server-side).
 */
export async function adminGrantPoints(
  input: GrantPointsInput
): Promise<{ error: string | null }> {
  const validation = validateGrantPoints(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const { userId, amount, label } = validation.value;
  const { error } = await supabase.rpc('admin_grant_points', {
    p_user_id: userId,
    p_amount: amount,
    p_label: label,
  });

  return { error: error ? error.message : null };
}
