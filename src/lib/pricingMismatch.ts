/**
 * orders.pricing_mismatch is written by place_order() (migration
 * 20261118000300) when the client's claimed subtotal/shipping differed from
 * the server's by more than ₱0.01. The customer may have paid a different
 * amount than the stored total, so admins should double-check the payment.
 */

export interface PricingMismatch {
  clientSubtotal: number | null;
  serverSubtotal: number | null;
  clientShipping: number | null;
  serverShipping: number | null;
  detectedAt: string | null;
}

function toAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Null/undefined → not flagged. Any other value (even malformed) → flagged,
 * with unreadable fields as null, so a bad record is shown rather than hidden.
 */
export function parsePricingMismatch(raw: unknown): PricingMismatch | null {
  if (raw === null || raw === undefined) return null;
  const record: Record<string, unknown> =
    typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    clientSubtotal: toAmount(record.client_subtotal),
    serverSubtotal: toAmount(record.server_subtotal),
    clientShipping: toAmount(record.client_shipping_fee),
    serverShipping: toAmount(record.server_shipping_fee),
    detectedAt: typeof record.detected_at === 'string' ? record.detected_at : null,
  };
}
