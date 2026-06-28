import type { Order } from './types';

/**
 * Copy a string to the clipboard. Resolves true on success, false when the
 * Clipboard API is unavailable (non-secure context, older browser) or denied.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator?.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(String(value));
    return true;
  } catch {
    return false;
  }
}

/** Multi-line shipping address block, omitting empty barangay/region lines. */
export function buildAddressText(order: Order): string {
  const lines = [order.shipping_address];
  if (order.shipping_barangay) lines.push(order.shipping_barangay);
  lines.push(`${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip_code}`.trim());
  if (order.shipping_country) lines.push(order.shipping_country);
  if (order.shipping_location) lines.push(order.shipping_location);
  return lines.filter(Boolean).join('\n');
}

/** Customer + address block formatted for pasting into a courier booking. */
export function buildBookingText(order: Order): string {
  const header = [order.customer_name, order.customer_phone, order.customer_email]
    .filter(Boolean)
    .join('\n');
  return `${header}\n\n${buildAddressText(order)}`;
}
