// Pure sitemap builders shared by the serverless /api/sitemap function.
// Keeping the XML assembly here (rather than inline in the handler) makes it
// unit-testable and keeps the function thin.

import { ARTICLES } from '../data/researchArticles';
import { absoluteUrl } from './seo';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

/** Public, crawlable routes only — never /admin or /user. */
export const STATIC_PATHS: string[] = [
  '/',
  '/research',
  '/protocols',
  '/calculator',
  '/track-order',
  '/shipping-returns',
  '/terms',
  '/privacy',
];

export function staticEntries(): SitemapEntry[] {
  return STATIC_PATHS.map((path) => ({
    loc: absoluteUrl(path),
    changefreq: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1.0 : 0.7,
  }));
}

export function researchEntries(): SitemapEntry[] {
  return ARTICLES.map((a) => ({
    loc: absoluteUrl(`/research/${a.slug}`),
    lastmod: a.date,
    changefreq: 'monthly',
    priority: 0.6,
  }));
}

/** Build product entries from a list of available products (name → slug). */
export function productEntries(
  products: Array<{ name: string; available?: boolean }>,
  slugify: (name: string) => string,
): SitemapEntry[] {
  return products
    .filter((p) => p.available !== false)
    .map((p) => ({
      loc: absoluteUrl(`/products/${slugify(p.name)}`),
      changefreq: 'weekly',
      priority: 0.8,
    }));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
