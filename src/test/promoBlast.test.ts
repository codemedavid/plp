import { describe, it, expect } from 'vitest';
import {
  selectRecipients,
  chunk,
  RESEND_BATCH_LIMIT,
} from '../../supabase/functions/send-promo-blast/lib';

// ─────────────────────────────────────────────────────
// Broadcast recipient selection
//
// These are account signups, not a marketing opt-in list, so the rules are
// deliberately conservative: confirmed addresses only, deduped, and anything
// already sent for this campaign is skipped so a re-run cannot double-send.
// ─────────────────────────────────────────────────────

const user = (
  id: string,
  email: string | null,
  confirmed: string | null = '2026-08-01T00:00:00Z'
) => ({ id, email, email_confirmed_at: confirmed });

describe('selectRecipients', () => {
  it('includes confirmed users that have an email address', () => {
    const users = [user('1', 'a@example.com'), user('2', 'b@example.com')];

    expect(selectRecipients(users, [])).toEqual(['a@example.com', 'b@example.com']);
  });

  it('excludes users who never confirmed their email', () => {
    const users = [user('1', 'a@example.com'), user('2', 'pending@example.com', null)];

    expect(selectRecipients(users, [])).toEqual(['a@example.com']);
  });

  it('excludes users with a missing or blank email', () => {
    const users = [user('1', 'a@example.com'), user('2', null), user('3', '   ')];

    expect(selectRecipients(users, [])).toEqual(['a@example.com']);
  });

  it('normalises case and trims surrounding whitespace', () => {
    const users = [user('1', '  Alice@Example.COM ')];

    expect(selectRecipients(users, [])).toEqual(['alice@example.com']);
  });

  it('deduplicates addresses that differ only by case', () => {
    const users = [user('1', 'a@example.com'), user('2', 'A@EXAMPLE.COM')];

    expect(selectRecipients(users, [])).toEqual(['a@example.com']);
  });

  it('skips addresses already sent for this campaign so a re-run cannot double-send', () => {
    const users = [user('1', 'a@example.com'), user('2', 'b@example.com')];

    expect(selectRecipients(users, ['a@example.com'])).toEqual(['b@example.com']);
  });

  it('matches the already-sent list case-insensitively', () => {
    const users = [user('1', 'a@example.com')];

    expect(selectRecipients(users, ['A@Example.com'])).toEqual([]);
  });

  it('returns an empty list when there are no users', () => {
    expect(selectRecipients([], [])).toEqual([]);
  });
});

describe('chunk', () => {
  it('exposes the Resend batch ceiling as 100', () => {
    expect(RESEND_BATCH_LIMIT).toBe(100);
  });

  it('keeps a list smaller than the limit as a single batch', () => {
    expect(chunk(['a', 'b', 'c'], 100)).toEqual([['a', 'b', 'c']]);
  });

  it('splits a list larger than the limit', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('produces no trailing empty batch on an exact multiple', () => {
    expect(chunk(['a', 'b', 'c', 'd'], 2)).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('returns no batches for an empty list, so nothing is sent', () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
