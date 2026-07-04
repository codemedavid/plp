import { Helmet } from 'react-helmet-async';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME } from '../../lib/seo';

export interface SeoProps {
  /** Full <title> text for the page. */
  title: string;
  description?: string;
  /** Route path used for the canonical + og:url (e.g. "/faq"). */
  path?: string;
  /** Absolute or relative share image; falls back to the brand hero. */
  image?: string;
  /** Open Graph type — "website" (default) or "article". */
  type?: 'website' | 'article';
  /** Keep the page out of the index (profile, checkout, etc.). */
  noindex?: boolean;
  /** One or more JSON-LD objects to embed as structured data. */
  jsonLd?: object | object[];
}

/**
 * Per-route <head> manager: title, description, canonical, Open Graph,
 * Twitter cards, robots, and optional JSON-LD. Backed by react-helmet-async so
 * tags update cleanly as the user navigates between routes.
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}: SeoProps) {
  const canonical = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
