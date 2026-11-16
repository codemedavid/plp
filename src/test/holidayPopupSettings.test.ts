import { describe, it, expect } from 'vitest';
import { HOLIDAY_SALE_END, HOLIDAY_SALE_HEADLINE_PCT, HOLIDAY_SALE_START } from '../lib/holidaySeason';
import {
  HOLIDAY_POPUP_DEFAULT_COPY,
  HOLIDAY_POPUP_MAX_LENGTH,
  fromPhilippineDateTimeInput,
  isHolidayPopupLive,
  readHolidayPopupSettings,
  resolveHolidayPopupConfig,
  splitOfferFigure,
  toPhilippineDateTimeInput,
  validateHolidayPopupForm,
  type HolidayPopupFormValues,
} from '../lib/holidayPopupSettings';

const validForm = (overrides: Partial<HolidayPopupFormValues> = {}): HolidayPopupFormValues => ({
  enabled: true,
  eyebrow: '',
  title: '',
  message: '',
  offer: '',
  paymentNote: '',
  paymentNoteEnabled: true,
  buttonLabel: '',
  start: '2026-11-01T00:00',
  end: '2027-01-01T00:00',
  ...overrides,
});

describe('HOLIDAY_POPUP_DEFAULT_COPY', () => {
  it('matches the copy the popup shipped with', () => {
    expect(HOLIDAY_POPUP_DEFAULT_COPY).toEqual({
      eyebrow: 'Merry Christmas',
      title: 'Hello guys, it’s Ber Months time naaa!',
      message: 'So as a small gift, I’m doing a promo till the year ends!',
      offer: `Up to ${HOLIDAY_SALE_HEADLINE_PCT}% off`,
      paymentNote: 'QRPh is now available — order now, pay later with selected banks.',
      buttonLabel: 'Shop Now',
    });
  });

  it('keeps the payment note within its length limit', () => {
    expect(HOLIDAY_POPUP_MAX_LENGTH.paymentNote).toBe(140);
    expect(HOLIDAY_POPUP_DEFAULT_COPY.paymentNote.length).toBeLessThanOrEqual(HOLIDAY_POPUP_MAX_LENGTH.paymentNote);
  });
});

describe('readHolidayPopupSettings', () => {
  it('maps stored rows onto the holiday popup fields', () => {
    const fields = readHolidayPopupSettings([
      { id: 'holiday_popup_enabled', value: 'false' },
      { id: 'holiday_popup_title', value: 'Happy holidays!' },
      { id: 'holiday_popup_start', value: '2026-12-01T00:00:00.000Z' },
      { id: 'site_name', value: 'ignored' },
    ]);

    expect(fields.holiday_popup_enabled).toBe(false);
    expect(fields.holiday_popup_title).toBe('Happy holidays!');
    expect(fields.holiday_popup_start).toBe('2026-12-01T00:00:00.000Z');
    expect(fields.holiday_popup_message).toBe('');
  });

  it('treats a missing on/off row as on', () => {
    expect(readHolidayPopupSettings([]).holiday_popup_enabled).toBe(true);
  });

  it('maps the payment note and its toggle, which defaults to on', () => {
    expect(readHolidayPopupSettings([]).holiday_popup_payment_note_enabled).toBe(true);
    expect(readHolidayPopupSettings([]).holiday_popup_payment_note).toBe('');

    const fields = readHolidayPopupSettings([
      { id: 'holiday_popup_payment_note', value: 'GCash too!' },
      { id: 'holiday_popup_payment_note_enabled', value: 'false' },
    ]);
    expect(fields.holiday_popup_payment_note).toBe('GCash too!');
    expect(fields.holiday_popup_payment_note_enabled).toBe(false);
  });
});

describe('resolveHolidayPopupConfig', () => {
  it('falls back to the shipped copy and code window when nothing is saved', () => {
    const config = resolveHolidayPopupConfig(null);

    expect(config).toEqual({
      ...HOLIDAY_POPUP_DEFAULT_COPY,
      paymentNoteEnabled: true,
      enabled: true,
      start: HOLIDAY_SALE_START,
      end: HOLIDAY_SALE_END,
    });
  });

  it('uses saved text, trimmed, and falls back field by field', () => {
    const config = resolveHolidayPopupConfig({
      holiday_popup_title: '  Season’s greetings  ',
      holiday_popup_message: '   ',
      holiday_popup_offer: 'Buy 1 Take 1',
    });

    expect(config.title).toBe('Season’s greetings');
    expect(config.message).toBe(HOLIDAY_POPUP_DEFAULT_COPY.message);
    expect(config.offer).toBe('Buy 1 Take 1');
    expect(config.eyebrow).toBe(HOLIDAY_POPUP_DEFAULT_COPY.eyebrow);
  });

  it('caps over-long stored text at the field limit', () => {
    const config = resolveHolidayPopupConfig({ holiday_popup_title: 'x'.repeat(500) });
    expect(config.title).toHaveLength(HOLIDAY_POPUP_MAX_LENGTH.title);
  });

  it('honours the off switch', () => {
    expect(resolveHolidayPopupConfig({ holiday_popup_enabled: false }).enabled).toBe(false);
  });

  it('uses the saved payment note, trimmed and capped, or the default when blank', () => {
    expect(resolveHolidayPopupConfig({ holiday_popup_payment_note: '  Pay via QRPh  ' }).paymentNote).toBe('Pay via QRPh');
    expect(resolveHolidayPopupConfig({ holiday_popup_payment_note: '   ' }).paymentNote).toBe(
      HOLIDAY_POPUP_DEFAULT_COPY.paymentNote,
    );
    expect(resolveHolidayPopupConfig({ holiday_popup_payment_note: 'x'.repeat(500) }).paymentNote).toHaveLength(
      HOLIDAY_POPUP_MAX_LENGTH.paymentNote,
    );
  });

  it('honours the payment note off switch', () => {
    expect(resolveHolidayPopupConfig({ holiday_popup_payment_note_enabled: false }).paymentNoteEnabled).toBe(false);
    expect(resolveHolidayPopupConfig({}).paymentNoteEnabled).toBe(true);
  });

  it('uses the saved window when it is valid', () => {
    const config = resolveHolidayPopupConfig({
      holiday_popup_start: '2026-12-01T00:00:00+08:00',
      holiday_popup_end: '2026-12-26T00:00:00+08:00',
    });
    expect(config.start).toEqual(new Date('2026-12-01T00:00:00+08:00'));
    expect(config.end).toEqual(new Date('2026-12-26T00:00:00+08:00'));
  });

  it('falls back to the code window when a saved date is unreadable', () => {
    const config = resolveHolidayPopupConfig({ holiday_popup_start: 'not a date' });
    expect(config.start).toEqual(HOLIDAY_SALE_START);
    expect(config.end).toEqual(HOLIDAY_SALE_END);
  });

  it('falls back to the code window when the saved end is not after the start', () => {
    const config = resolveHolidayPopupConfig({
      holiday_popup_start: '2026-12-26T00:00:00+08:00',
      holiday_popup_end: '2026-12-01T00:00:00+08:00',
    });
    expect(config.start).toEqual(HOLIDAY_SALE_START);
    expect(config.end).toEqual(HOLIDAY_SALE_END);
  });
});

describe('isHolidayPopupLive', () => {
  const config = resolveHolidayPopupConfig(null);

  it('is live inside the window', () => {
    expect(isHolidayPopupLive(config, new Date('2026-11-20T12:00:00+08:00'))).toBe(true);
  });

  it('is live from the first instant and off at the end (half-open)', () => {
    expect(isHolidayPopupLive(config, HOLIDAY_SALE_START)).toBe(true);
    expect(isHolidayPopupLive(config, HOLIDAY_SALE_END)).toBe(false);
  });

  it('is not live before the window opens', () => {
    expect(isHolidayPopupLive(config, new Date('2026-10-31T23:59:00+08:00'))).toBe(false);
  });

  it('is never live when switched off', () => {
    const off = { ...config, enabled: false };
    expect(isHolidayPopupLive(off, new Date('2026-11-20T12:00:00+08:00'))).toBe(false);
  });
});

describe('Philippine date-time inputs', () => {
  it('formats an instant as a PH wall-clock input value', () => {
    expect(toPhilippineDateTimeInput(HOLIDAY_SALE_START)).toBe('2026-11-01T00:00');
    expect(toPhilippineDateTimeInput(HOLIDAY_SALE_END)).toBe('2027-01-01T00:00');
  });

  it('reads an input value as PH time', () => {
    expect(fromPhilippineDateTimeInput('2026-12-25T18:30')).toEqual(
      new Date('2026-12-25T10:30:00Z'),
    );
  });

  it('rejects empty or malformed input', () => {
    expect(fromPhilippineDateTimeInput('')).toBeNull();
    expect(fromPhilippineDateTimeInput('25/12/2026')).toBeNull();
    expect(fromPhilippineDateTimeInput('2026-13-45T99:99')).toBeNull();
  });
});

describe('validateHolidayPopupForm', () => {
  it('trims text and returns the settings to save', () => {
    const result = validateHolidayPopupForm(
      validForm({
        enabled: false,
        title: '  Hi po!  ',
        buttonLabel: ' Shop ',
        paymentNote: '  QRPh na!  ',
        paymentNoteEnabled: false,
      }),
    );

    expect(result).toEqual({
      ok: true,
      updates: {
        holiday_popup_enabled: false,
        holiday_popup_eyebrow: '',
        holiday_popup_title: 'Hi po!',
        holiday_popup_message: '',
        holiday_popup_offer: '',
        holiday_popup_payment_note: 'QRPh na!',
        holiday_popup_payment_note_enabled: false,
        holiday_popup_button_label: 'Shop',
        holiday_popup_start: '2026-10-31T16:00:00.000Z',
        holiday_popup_end: '2026-12-31T16:00:00.000Z',
      },
    });
  });

  it('requires the end to be after the start', () => {
    const result = validateHolidayPopupForm(
      validForm({ start: '2026-12-25T00:00', end: '2026-12-25T00:00' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.end).toMatch(/after the start/i);
  });

  it('requires both dates', () => {
    const result = validateHolidayPopupForm(validForm({ start: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.start).toBeTruthy();
  });

  it('rejects text over the limit', () => {
    const result = validateHolidayPopupForm(
      validForm({ eyebrow: 'x'.repeat(HOLIDAY_POPUP_MAX_LENGTH.eyebrow + 1) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.eyebrow).toMatch(/characters/i);
  });

  it('rejects a payment note over the limit', () => {
    const result = validateHolidayPopupForm(
      validForm({ paymentNote: 'x'.repeat(HOLIDAY_POPUP_MAX_LENGTH.paymentNote + 1) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.paymentNote).toMatch(/140 characters/i);
  });

  it('accepts a payment note exactly at the limit', () => {
    const result = validateHolidayPopupForm(
      validForm({ paymentNote: 'x'.repeat(HOLIDAY_POPUP_MAX_LENGTH.paymentNote) }),
    );
    expect(result.ok).toBe(true);
  });
});

describe('splitOfferFigure', () => {
  it('pulls the percentage out so it can be shown large', () => {
    expect(splitOfferFigure('Up to 50% off')).toEqual({
      before: 'Up to ',
      figure: '50%',
      after: ' off',
    });
  });

  it('returns null when there is no percentage', () => {
    expect(splitOfferFigure('Buy 1 Take 1')).toBeNull();
  });
});
