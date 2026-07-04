import { describe, it, expect } from 'vitest';
import { injectMeta, metaForArticle, metaForProduct } from '../lib/renderMeta';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../lib/seo';
import { ARTICLES } from '../data/researchArticles';

const BASE_HTML = `<!doctype html><html><head>
<title>Peptide Lifestyle Program — Premium Peptides for Better Living</title>
<meta name="description" content="default desc" />
<meta property="og:title" content="default og title" />
<meta property="og:description" content="default og desc" />
<meta property="og:url" content="https://peptidelifestyleprogram.com/" />
<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
<meta name="twitter:title" content="default tw title" />
<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
</head><body><div id="root"></div></body></html>`;

const META = {
  title: 'PLP Slim 2.0 — Peptide Lifestyle Program',
  description: 'Tirzepatide + Cagrilintide weight management.',
  url: `${SITE_URL}/products/plp-slim-2-0`,
  image: 'https://cdn.example.com/slim.png',
};

describe('injectMeta', () => {
  it('rewrites the document title', () => {
    expect(injectMeta(BASE_HTML, META)).toContain(`<title>${META.title}</title>`);
  });

  it('rewrites og:title and og:image content', () => {
    const out = injectMeta(BASE_HTML, META);
    expect(out).toContain(`<meta property="og:title" content="${META.title}"`);
    expect(out).toContain(`<meta property="og:image" content="${META.image}"`);
  });

  it('rewrites the meta description and og:url', () => {
    const out = injectMeta(BASE_HTML, META);
    expect(out).toContain(`<meta name="description" content="${META.description}"`);
    expect(out).toContain(`<meta property="og:url" content="${META.url}"`);
  });

  it('adds a canonical link when none exists', () => {
    const out = injectMeta(BASE_HTML, META);
    expect(out).toContain(`<link rel="canonical" href="${META.url}"`);
  });

  it('does not leave the default og:image behind', () => {
    const out = injectMeta(BASE_HTML, META);
    expect(out).not.toContain(`<meta property="og:image" content="${DEFAULT_OG_IMAGE}"`);
  });

  it('escapes double quotes in injected values', () => {
    const out = injectMeta(BASE_HTML, { ...META, title: 'A "quoted" name' });
    expect(out).toContain('&quot;quoted&quot;');
  });
});

describe('metaForArticle / metaForProduct', () => {
  it('builds article meta with the branded title and canonical', () => {
    const a = ARTICLES[0];
    const meta = metaForArticle(a);
    expect(meta.title).toContain(a.title);
    expect(meta.url).toBe(`${SITE_URL}/research/${a.slug}`);
    expect(meta.description).toBe(a.metaDescription);
  });

  it('builds product meta with the product image and price-page url', () => {
    const meta = metaForProduct({
      name: 'PLP Slim 2.0',
      description: 'desc',
      image_url: 'https://cdn.example.com/slim.png',
    });
    expect(meta.title).toContain('PLP Slim 2.0');
    expect(meta.url).toBe(`${SITE_URL}/products/plp-slim-2-0`);
    expect(meta.image).toBe('https://cdn.example.com/slim.png');
  });

  it('falls back to the default image when a product has none', () => {
    const meta = metaForProduct({ name: 'X', description: null, image_url: null });
    expect(meta.image).toBe(DEFAULT_OG_IMAGE);
  });
});
