// ─────────────────────────────────────────────────────
// Admin-editable holiday popup
//
// The wording, on/off switch and show window live in `site_settings` as plain
// key/value rows (`holiday_popup_*`). Nothing needs seeding: any field that is
// missing, blank or unreadable falls back to the copy the popup shipped with
// and to the code window in holidaySeason.ts.
// ─────────────────────────────────────────────────────

import type { SiteSettings } from '../types';
import { HOLIDAY_SALE_END, HOLIDAY_SALE_HEADLINE_PCT, HOLIDAY_SALE_START } from './holidaySeason';

export interface HolidayPopupCopy {
  eyebrow: string;
  title: string;
  message: string;
  offer: string;
  /** Payment news line, e.g. that QRPh is now available. */
  paymentNote: string;
  buttonLabel: string;
}

/** Everything the popup card renders: the copy plus which optional parts show. */
export interface HolidayPopupContent extends HolidayPopupCopy {
  paymentNoteEnabled: boolean;
}

export interface HolidayPopupConfig extends HolidayPopupContent {
  enabled: boolean;
  start: Date;
  end: Date;
}

/** What the admin form edits. Dates are PH wall-clock `YYYY-MM-DDTHH:mm`. */
export interface HolidayPopupFormValues extends HolidayPopupContent {
  enabled: boolean;
  start: string;
  end: string;
}

export type HolidayPopupSettingsFields = Required<
  Pick<
    SiteSettings,
    | 'holiday_popup_enabled'
    | 'holiday_popup_eyebrow'
    | 'holiday_popup_title'
    | 'holiday_popup_message'
    | 'holiday_popup_offer'
    | 'holiday_popup_payment_note'
    | 'holiday_popup_payment_note_enabled'
    | 'holiday_popup_button_label'
    | 'holiday_popup_start'
    | 'holiday_popup_end'
  >
>;

export type HolidayPopupFormErrors = Partial<Record<keyof HolidayPopupFormValues, string>>;

export type HolidayPopupValidation =
  | { ok: true; updates: HolidayPopupSettingsFields }
  | { ok: false; errors: HolidayPopupFormErrors };

type CopyField = keyof HolidayPopupCopy;

export const HOLIDAY_POPUP_DEFAULT_COPY: Readonly<HolidayPopupCopy> = {
  eyebrow: 'Merry Christmas',
  title: 'Hello guys, it’s Ber Months time naaa!',
  message: 'So as a small gift, I’m doing a promo till the year ends!',
  offer: `Up to ${HOLIDAY_SALE_HEADLINE_PCT}% off`,
  paymentNote: 'QRPh is now available — order now, pay later with selected banks.',
  buttonLabel: 'Shop Now',
};

export const HOLIDAY_POPUP_MAX_LENGTH: Readonly<Record<CopyField, number>> = {
  eyebrow: 40,
  title: 90,
  message: 240,
  offer: 40,
  paymentNote: 140,
  buttonLabel: 24,
};

const COPY_SETTING_KEYS = {
  eyebrow: 'holiday_popup_eyebrow',
  title: 'holiday_popup_title',
  message: 'holiday_popup_message',
  offer: 'holiday_popup_offer',
  paymentNote: 'holiday_popup_payment_note',
  buttonLabel: 'holiday_popup_button_label',
} as const satisfies Record<CopyField, keyof SiteSettings>;

const COPY_FIELDS = Object.keys(COPY_SETTING_KEYS) as CopyField[];

const PH_UTC_OFFSET = '+08:00';
const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DATE_TIME_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const OFFER_FIGURE_PATTERN = /^(.*?)(\d+(?:\.\d+)?\s?%)(.*)$/;

interface SettingRow {
  id: string;
  value: string;
}

/** Pull the holiday popup keys out of raw `site_settings` rows. */
export function readHolidayPopupSettings(rows: readonly SettingRow[]): HolidayPopupSettingsFields {
  const valueOf = (id: string): string => rows.find((row) => row.id === id)?.value ?? '';
  return {
    // Default on: the popup shows (inside its window) unless an admin turns it off.
    holiday_popup_enabled: valueOf('holiday_popup_enabled') !== 'false',
    holiday_popup_eyebrow: valueOf(COPY_SETTING_KEYS.eyebrow),
    holiday_popup_title: valueOf(COPY_SETTING_KEYS.title),
    holiday_popup_message: valueOf(COPY_SETTING_KEYS.message),
    holiday_popup_offer: valueOf(COPY_SETTING_KEYS.offer),
    holiday_popup_payment_note: valueOf(COPY_SETTING_KEYS.paymentNote),
    // Default on, like the popup itself: hiding the note is an explicit choice.
    holiday_popup_payment_note_enabled: valueOf('holiday_popup_payment_note_enabled') !== 'false',
    holiday_popup_button_label: valueOf(COPY_SETTING_KEYS.buttonLabel),
    holiday_popup_start: valueOf('holiday_popup_start'),
    holiday_popup_end: valueOf('holiday_popup_end'),
  };
}

const parseInstant = (raw: string | undefined): Date | null => {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveWindow = (settings: Partial<SiteSettings>): Pick<HolidayPopupConfig, 'start' | 'end'> => {
  const start = parseInstant(settings.holiday_popup_start) ?? HOLIDAY_SALE_START;
  const end = parseInstant(settings.holiday_popup_end) ?? HOLIDAY_SALE_END;
  // A backwards window would silently hide the popup forever — use the code window.
  if (end.getTime() <= start.getTime()) return { start: HOLIDAY_SALE_START, end: HOLIDAY_SALE_END };
  return { start, end };
};

/** Resolve stored settings (or none, e.g. after a failed load) into what the popup shows. */
export function resolveHolidayPopupConfig(settings: Partial<SiteSettings> | null | undefined): HolidayPopupConfig {
  const source = settings ?? {};
  const copy = Object.fromEntries(
    COPY_FIELDS.map((field) => {
      const text = (source[COPY_SETTING_KEYS[field]] ?? '').trim();
      // Cap on read too: the stored value is external data.
      return [field, text ? text.slice(0, HOLIDAY_POPUP_MAX_LENGTH[field]) : HOLIDAY_POPUP_DEFAULT_COPY[field]];
    }),
  ) as unknown as HolidayPopupCopy;

  return {
    ...copy,
    paymentNoteEnabled: source.holiday_popup_payment_note_enabled !== false,
    enabled: source.holiday_popup_enabled !== false,
    ...resolveWindow(source),
  };
}

/** Enabled AND now within [start, end). */
export function isHolidayPopupLive(config: HolidayPopupConfig, now: Date = new Date()): boolean {
  return (
    config.enabled &&
    now.getTime() >= config.start.getTime() &&
    now.getTime() < config.end.getTime()
  );
}

/** Format an instant as a Philippine wall-clock `datetime-local` value. */
export function toPhilippineDateTimeInput(date: Date): string {
  return new Date(date.getTime() + PH_UTC_OFFSET_MS).toISOString().slice(0, 16);
}

/** Read a `datetime-local` value as Philippine time. Null when empty or invalid. */
export function fromPhilippineDateTimeInput(value: string): Date | null {
  const match = DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(`${value}:00${PH_UTC_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject rolled-over values such as Feb 30 by round-tripping.
  return toPhilippineDateTimeInput(date) === value ? date : null;
}

const validateWindow = (
  values: HolidayPopupFormValues,
): { errors: HolidayPopupFormErrors; start: Date | null; end: Date | null } => {
  const start = fromPhilippineDateTimeInput(values.start);
  const end = fromPhilippineDateTimeInput(values.end);
  const errors: HolidayPopupFormErrors = {};
  if (!start) errors.start = 'Pick a start date and time.';
  if (!end) errors.end = 'Pick an end date and time.';
  if (start && end && end.getTime() <= start.getTime()) errors.end = 'End must be after the start.';
  return { errors, start, end };
};

/** Validate the admin form and turn it into the `site_settings` values to save. */
export function validateHolidayPopupForm(values: HolidayPopupFormValues): HolidayPopupValidation {
  const trimmed = Object.fromEntries(
    COPY_FIELDS.map((field) => [field, values[field].trim()]),
  ) as unknown as HolidayPopupCopy;

  const textErrors = Object.fromEntries(
    COPY_FIELDS.filter((field) => trimmed[field].length > HOLIDAY_POPUP_MAX_LENGTH[field]).map(
      (field) => [field, `Keep it to ${HOLIDAY_POPUP_MAX_LENGTH[field]} characters or fewer.`],
    ),
  ) as HolidayPopupFormErrors;

  const { errors: windowErrors, start, end } = validateWindow(values);
  const errors = { ...textErrors, ...windowErrors };

  if (Object.keys(errors).length > 0 || !start || !end) return { ok: false, errors };

  return {
    ok: true,
    updates: {
      holiday_popup_enabled: values.enabled,
      holiday_popup_eyebrow: trimmed.eyebrow,
      holiday_popup_title: trimmed.title,
      holiday_popup_message: trimmed.message,
      holiday_popup_offer: trimmed.offer,
      holiday_popup_payment_note: trimmed.paymentNote,
      holiday_popup_payment_note_enabled: values.paymentNoteEnabled,
      holiday_popup_button_label: trimmed.buttonLabel,
      holiday_popup_start: start.toISOString(),
      holiday_popup_end: end.toISOString(),
    },
  };
}

/** Build the admin form's starting values from stored settings. */
export function toHolidayPopupFormValues(settings: Partial<SiteSettings> | null | undefined): HolidayPopupFormValues {
  const source = settings ?? {};
  const { start, end, enabled, paymentNoteEnabled } = resolveHolidayPopupConfig(source);
  return {
    enabled,
    paymentNoteEnabled,
    eyebrow: source.holiday_popup_eyebrow ?? '',
    title: source.holiday_popup_title ?? '',
    message: source.holiday_popup_message ?? '',
    offer: source.holiday_popup_offer ?? '',
    paymentNote: source.holiday_popup_payment_note ?? '',
    buttonLabel: source.holiday_popup_button_label ?? '',
    start: toPhilippineDateTimeInput(start),
    end: toPhilippineDateTimeInput(end),
  };
}

export interface OfferFigure {
  before: string;
  figure: string;
  after: string;
}

/** Split "Up to 50% off" so the percentage can be set large. Null if no percentage. */
export function splitOfferFigure(offer: string): OfferFigure | null {
  const match = OFFER_FIGURE_PATTERN.exec(offer);
  if (!match) return null;
  return { before: match[1], figure: match[2], after: match[3] };
}
