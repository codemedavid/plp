import type { CoaLink, Product } from '../types';

const SAFE_SCHEMES = ['http:', 'https:'];

const LEGACY_COA_LABEL = 'Certificate of Analysis';

/**
 * Returns true only for absolute http(s) URLs. Blocks javascript:, data:, and
 * other schemes that could execute when placed in an anchor href.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

type CoaSource = Pick<Product, 'coa_links' | 'coa_url'>;

/**
 * Resolves the effective list of COA documents for a product.
 *
 * Prefers the admin-managed `coa_links`, dropping any entry with an empty label
 * or unsafe URL and trimming the rest. When no valid named links exist, falls
 * back to the legacy single `coa_url` presented as one "Certificate of Analysis"
 * entry. Returns an empty array when the product has no COA at all.
 */
export function getCoaLinks(product: CoaSource): CoaLink[] {
  const raw = Array.isArray(product.coa_links) ? product.coa_links : [];

  const cleaned = raw
    .filter(
      (link): link is CoaLink =>
        !!link && typeof link.label === 'string' && typeof link.url === 'string',
    )
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label !== '' && isSafeUrl(link.url));

  if (cleaned.length > 0) return cleaned;

  const legacy = typeof product.coa_url === 'string' ? product.coa_url.trim() : '';
  if (legacy !== '' && isSafeUrl(legacy)) {
    return [{ label: LEGACY_COA_LABEL, url: legacy }];
  }

  return [];
}
