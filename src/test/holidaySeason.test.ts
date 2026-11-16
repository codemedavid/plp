import { describe, it, expect } from 'vitest';
import {
  HOLIDAY_SALE_END,
  HOLIDAY_SALE_START,
  isHolidaySaleActive,
} from '../lib/holidaySeason';

describe('isHolidaySaleActive', () => {
  it('is active in the middle of the ber-months sale', () => {
    expect(isHolidaySaleActive(new Date('2026-11-20T10:00:00+08:00'))).toBe(true);
  });

  it('is active from the very first instant of the window', () => {
    expect(isHolidaySaleActive(HOLIDAY_SALE_START)).toBe(true);
  });

  it('is still active in the last minute of New Year’s Eve (PHT)', () => {
    expect(isHolidaySaleActive(new Date('2026-12-31T23:59:00+08:00'))).toBe(true);
  });

  it('switches itself off at midnight on Jan 1 PHT', () => {
    expect(isHolidaySaleActive(HOLIDAY_SALE_END)).toBe(false);
    expect(isHolidaySaleActive(new Date('2027-01-01T00:00:00+08:00'))).toBe(false);
  });

  it('is not active before the window opens', () => {
    expect(isHolidaySaleActive(new Date('2026-10-31T23:59:00+08:00'))).toBe(false);
  });
});
