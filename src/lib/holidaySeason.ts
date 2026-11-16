// ─────────────────────────────────────────────────────
// Ber-months / Christmas sale window
//
// Drives the festive theme: the holiday popup, the hero slide, the banner
// slide and the snowfall. The window is half-open — active from START up to,
// but not including, END — so New Year's Eve is a full selling day and every
// holiday surface switches itself off at Jan 1 00:00 PHT with no deploy.
//
// This only controls what the site SAYS. The actual sale prices live on each
// product row (discount_price / discount_active) and are managed in admin.
// ─────────────────────────────────────────────────────

export const HOLIDAY_SALE_START = new Date('2026-11-01T00:00:00+08:00');
export const HOLIDAY_SALE_END = new Date('2027-01-01T00:00:00+08:00');

// Headline figure used in the copy ("up to 55% off") — the deepest live sale
// price (PLP-Slim 2.0 at 55%); NAD is 50% and most of the shop is 40% off.
export const HOLIDAY_SALE_HEADLINE_PCT = 55;

export const isHolidaySaleActive = (now: Date = new Date()): boolean =>
  now.getTime() >= HOLIDAY_SALE_START.getTime() &&
  now.getTime() < HOLIDAY_SALE_END.getTime();
