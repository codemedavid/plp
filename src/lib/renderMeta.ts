// Pure HTML <head> meta injection for server-side social previews.
// The Vercel `api/render` function fetches the built index.html and rewrites
// its title/description/OG/Twitter/canonical per URL so non-JS scrapers
// (Facebook, WhatsApp, Telegram) get an accurate link preview. React still
// hydrates the returned HTML normally. All logic here is pure + testable.

import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME } from './seo.js';
import { slugify } from './slug.js';
import type { Article } from '../data/researchArticles.js';

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Replace the `content` of a <meta> tag identified by an attribute (name/property). */
function setMetaContent(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const re = new RegExp(
    `(<meta[^>]*\\b${attr}=["']${key}["'][^>]*\\bcontent=["'])[^"']*(["'])`,
    'i',
  );
  return html.replace(re, `$1${escapeAttr(value)}$2`);
}

export function injectMeta(html: string, meta: PageMeta): string {
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);
  out = setMetaContent(out, 'name', 'description', meta.description);
  out = setMetaContent(out, 'property', 'og:title', meta.title);
  out = setMetaContent(out, 'property', 'og:description', meta.description);
  out = setMetaContent(out, 'property', 'og:url', meta.url);
  out = setMetaContent(out, 'property', 'og:image', meta.image);
  out = setMetaContent(out, 'name', 'twitter:title', meta.title);
  out = setMetaContent(out, 'name', 'twitter:description', meta.description);
  out = setMetaContent(out, 'name', 'twitter:image', meta.image);

  const canonicalTag = `<link rel="canonical" href="${escapeAttr(meta.url)}" />`;
  if (/<link[^>]*\brel=["']canonical["']/i.test(out)) {
    out = out.replace(/(<link[^>]*\brel=["']canonical["'][^>]*\bhref=["'])[^"']*(["'])/i, `$1${escapeAttr(meta.url)}$2`);
  } else {
    out = out.replace('</head>', `    ${canonicalTag}\n</head>`);
  }
  return out;
}

export function metaForArticle(article: Pick<Article, 'title' | 'slug' | 'metaDescription'>): PageMeta {
  return {
    title: `${article.title} — ${SITE_NAME}`,
    description: article.metaDescription,
    url: absoluteUrl(`/research/${article.slug}`),
    image: DEFAULT_OG_IMAGE,
  };
}

export interface ProductMetaInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
}

export function metaForProduct(product: ProductMetaInput): PageMeta {
  return {
    title: `${product.name} — ${SITE_NAME}`,
    description: product.description || DEFAULT_DESCRIPTION,
    url: absoluteUrl(`/products/${slugify(product.name)}`),
    image: product.image_url ? absoluteUrl(product.image_url) : DEFAULT_OG_IMAGE,
  };
}
