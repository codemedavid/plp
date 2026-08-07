// ─────────────────────────────────────────────────────
// Pure helpers for the promo broadcast.
//
// Deliberately free of Deno globals and network calls so the selection rules
// — the part that decides who receives a marketing email — can be unit tested
// from the main Vitest suite rather than only in production.
// ─────────────────────────────────────────────────────

// Resend accepts at most 100 messages per /emails/batch call.
export const RESEND_BATCH_LIMIT = 100;

export interface AuthUserRow {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
}

const normalise = (email: string): string => email.trim().toLowerCase();

// Confirmed, non-blank, deduped, and minus anything already sent for this
// campaign. The already-sent filter is what makes a re-run safe: a partial
// failure can be retried without emailing the same person twice.
export const selectRecipients = (
  users: ReadonlyArray<AuthUserRow>,
  alreadySent: ReadonlyArray<string>
): string[] => {
  const sent = new Set(alreadySent.map(normalise));
  const seen = new Set<string>();

  return users.reduce<string[]>((recipients, user) => {
    if (!user.email_confirmed_at) return recipients;
    if (!user.email || user.email.trim() === '') return recipients;

    const email = normalise(user.email);
    if (sent.has(email) || seen.has(email)) return recipients;

    seen.add(email);
    return [...recipients, email];
  }, []);
};

export const chunk = <T>(items: ReadonlyArray<T>, size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );
