// ─────────────────────────────────────────────────────
// Payment-method surcharge (e.g. QRPh 3%)
//
// Each payment_methods row carries surcharge_pct (0-10, 0 = no fee), edited
// from the admin Payment Methods screen. The fee is charged on the amount the
// customer actually pays: items + shipping - promo discount - points.
//
// The server (place_order RPC) recomputes the fee from the table and is the
// source of truth; this module only drives the live checkout preview, the
// admin input, and labels. Rounding uses integer centavos so it matches
// Postgres round(numeric, 2) (half away from zero) instead of drifting on
// binary floating point.
// ─────────────────────────────────────────────────────

/** Mirrors the payment_methods_surcharge_pct_range CHECK constraint. */
export const MAX_SURCHARGE_PCT = 10;
/** Granularity of the admin "Payment fee (%)" input. */
export const SURCHARGE_PCT_STEP = 0.5;

const toCentavos = (amount: number): number => Math.round(amount * 100);
const toBasisPoints = (pct: number): number => Math.round(pct * 100);

/** Coerce whatever the API returned (number, numeric string, null) into a valid percent. */
export function normalizeSurchargePct(value: unknown): number {
    const parsed = typeof value === 'string' ? Number(value.trim()) : value;
    if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, MAX_SURCHARGE_PCT);
}

/** Fee in pesos (2 decimals) for `pct` percent of `payable`. 0 when there is no fee. */
export function computePaymentFee(payable: number, pct: number): number {
    const rate = normalizeSurchargePct(pct);
    if (rate === 0 || !Number.isFinite(payable) || payable <= 0) return 0;
    const feeCentavos = Math.round((toCentavos(payable) * toBasisPoints(rate)) / 10000);
    return feeCentavos / 100;
}

/** "3" for 3, "2.5" for 2.5 -- no trailing zeros. */
export function formatSurchargePct(pct: number): string {
    return String(Number(normalizeSurchargePct(pct).toFixed(2)));
}

/** Checkout / order line label, e.g. "QRPh fee (3%)". */
export function getPaymentFeeLabel(methodName: string | null | undefined, pct: number): string {
    const name = methodName?.trim() || 'Payment';
    return `${name} fee (${formatSurchargePct(pct)}%)`;
}

export type SurchargePctValidation =
    | { ok: true; value: number }
    | { ok: false; error: string };

/** Validate the admin input. Empty means 0 (no fee). */
export function validateSurchargePctInput(raw: string): SurchargePctValidation {
    const trimmed = raw.trim();
    if (trimmed === '') return { ok: true, value: 0 };

    const error = `Enter a fee between 0 and ${MAX_SURCHARGE_PCT}% in steps of ${SURCHARGE_PCT_STEP} (0 = no fee).`;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error };

    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0 || value > MAX_SURCHARGE_PCT) return { ok: false, error };

    const steps = value / SURCHARGE_PCT_STEP;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) return { ok: false, error };

    return { ok: true, value };
}
