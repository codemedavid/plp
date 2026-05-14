const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export const cleanText = (s?: string | null): string =>
  (s ?? '').replace(UUID_RE, '').replace(/\s{2,}/g, ' ').trim();
