import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase RPC mock: capture the call and return a queued response.
const rpcMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  MAX_POINTS_GRANT,
  MAX_GRANT_LABEL_LENGTH,
  validateGrantPoints,
  adminGrantPoints,
} from '../lib/adminPoints';

beforeEach(() => {
  rpcMock.mockClear();
  rpcMock.mockResolvedValue({ data: null, error: null });
});

describe('validateGrantPoints', () => {
  const valid = { userId: 'user-1', amount: 250, label: 'Loyalty bonus' };

  it('accepts a valid grant and returns the normalized value', () => {
    const result = validateGrantPoints(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ userId: 'user-1', amount: 250, label: 'Loyalty bonus' });
    }
  });

  it('trims surrounding whitespace from the label', () => {
    const result = validateGrantPoints({ ...valid, label: '   Complaint goodwill  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.label).toBe('Complaint goodwill');
  });

  it('rejects an empty user id', () => {
    const result = validateGrantPoints({ ...valid, userId: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects an amount of zero', () => {
    const result = validateGrantPoints({ ...valid, amount: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects a negative amount', () => {
    const result = validateGrantPoints({ ...valid, amount: -50 });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-integer amount', () => {
    const result = validateGrantPoints({ ...valid, amount: 10.5 });
    expect(result.ok).toBe(false);
  });

  it('rejects NaN and non-finite amounts', () => {
    expect(validateGrantPoints({ ...valid, amount: Number.NaN }).ok).toBe(false);
    expect(validateGrantPoints({ ...valid, amount: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it('rejects an amount above the maximum grant', () => {
    const result = validateGrantPoints({ ...valid, amount: MAX_POINTS_GRANT + 1 });
    expect(result.ok).toBe(false);
  });

  it('accepts an amount exactly at the maximum grant', () => {
    expect(validateGrantPoints({ ...valid, amount: MAX_POINTS_GRANT }).ok).toBe(true);
  });

  it('rejects a blank or whitespace-only label', () => {
    expect(validateGrantPoints({ ...valid, label: '' }).ok).toBe(false);
    expect(validateGrantPoints({ ...valid, label: '    ' }).ok).toBe(false);
  });

  it('rejects a label longer than the maximum length', () => {
    const tooLong = 'x'.repeat(MAX_GRANT_LABEL_LENGTH + 1);
    expect(validateGrantPoints({ ...valid, label: tooLong }).ok).toBe(false);
  });
});

describe('adminGrantPoints', () => {
  const valid = { userId: 'user-1', amount: 250, label: 'Loyalty bonus' };

  it('does not call the RPC when validation fails', async () => {
    const result = await adminGrantPoints({ ...valid, amount: 0 });
    expect(result.error).toBeTruthy();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls admin_grant_points with the normalized params on a valid grant', async () => {
    const result = await adminGrantPoints({ ...valid, label: '  Loyalty bonus  ' });
    expect(result.error).toBeNull();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('admin_grant_points', {
      p_user_id: 'user-1',
      p_amount: 250,
      p_label: 'Loyalty bonus',
    });
  });

  it('surfaces the RPC error message when the grant fails', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not authorized' } });
    const result = await adminGrantPoints(valid);
    expect(result.error).toBe('not authorized');
  });
});
