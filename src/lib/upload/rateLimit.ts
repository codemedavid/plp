/**
 * Best-effort, in-memory sliding-window rate limiter. Lives for the lifetime
 * of one warm serverless instance, so it slows down casual abuse rather than
 * guaranteeing a global limit.
 */

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys; the oldest key is evicted when full. */
  maxKeys?: number;
}

export interface RateLimiter {
  /** Records an attempt for `key` and returns whether it is allowed. */
  check: (key: string, nowMs: number) => boolean;
  size: () => number;
}

const DEFAULT_MAX_KEYS = 5000;

export function createRateLimiter({ limit, windowMs, maxKeys = DEFAULT_MAX_KEYS }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, readonly number[]>();

  const check = (key: string, nowMs: number): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    // Re-insert so Map order reflects recency, then evict the stalest key.
    hits.delete(key);
    hits.set(key, [...recent, nowMs]);
    if (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }
    return true;
  };

  return { check, size: () => hits.size };
}
