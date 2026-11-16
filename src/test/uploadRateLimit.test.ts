import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../lib/upload/rateLimit';

describe('createRateLimiter', () => {
  it('allows up to the limit within the window, then blocks', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(limiter.check('1.2.3.4', 0)).toBe(true);
    expect(limiter.check('1.2.3.4', 10)).toBe(true);
    expect(limiter.check('1.2.3.4', 20)).toBe(true);
    expect(limiter.check('1.2.3.4', 30)).toBe(false);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check('a', 0)).toBe(true);
    expect(limiter.check('b', 0)).toBe(true);
    expect(limiter.check('a', 1)).toBe(false);
  });

  it('frees slots once they age out of the window', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.check('a', 0);
    limiter.check('a', 500);
    expect(limiter.check('a', 999)).toBe(false);
    expect(limiter.check('a', 1001)).toBe(true);
  });

  it('does not count blocked attempts against the window', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check('a', 0);
    expect(limiter.check('a', 900)).toBe(false);
    expect(limiter.check('a', 1001)).toBe(true);
  });

  it('bounds memory by evicting the oldest key when full', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.check('a', 0);
    limiter.check('b', 1);
    limiter.check('c', 2); // evicts "a"
    expect(limiter.size()).toBe(2);
    expect(limiter.check('a', 3)).toBe(true);
  });
});
