// Central SEO constants and structured-data builders.
// Pure and side-effect-free so they can be unit-tested and reused by both the
// client <Seo> component and the serverless sitemap function.

export const SITE_URL = 'https://peptidelifestyleprogram.com';
export const SITE_NAME = 'Peptide Lifestyle Program';
export const DEFAULT_TITLE = 'Peptide Lifestyle Program — Premium Peptides for Better Living';
export const DEFAULT_DESCRIPTION =
  'Peptide Lifestyle Program: premium peptide sets and protocols crafted to support your wellness journey.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/hero-plp-slim.png`;
export const CURRENCY = 'PHP';

/** Resolve a path (or already-absolute URL) to a canonical absolute URL. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path || path === '/') return SITE_URL;
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${withSlash}`.replace(/\/$/, '');
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-plp.png`,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ProductSchemaInput {
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  price?: number;
  available?: boolean;
}

export function productSchema(product: ProductSchemaInput) {
  const url = absoluteUrl(`/products/${product.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || DEFAULT_DESCRIPTION,
    image: product.image ? absoluteUrl(product.image) : DEFAULT_OG_IMAGE,
    url,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url,
      price: product.price ?? 0,
      priceCurrency: CURRENCY,
      availability:
        product.available === false
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
  };
}
