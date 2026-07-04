import { describe, it, expect } from 'vitest';
import { STATIC_PATHS, researchEntries, buildSitemapXml } from '../lib/sitemap';
import { SITE_URL } from '../lib/seo';
import { ARTICLES } from '../data/researchArticles';

describe('static paths', () => {
  it('includes the key public routes', () => {
    expect(STATIC_PATHS).toContain('/');
    expect(STATIC_PATHS).toContain('/research');
    expect(STATIC_PATHS).toContain('/protocols');
  });

  it('never exposes private/admin routes', () => {
    expect(STATIC_PATHS).not.toContain('/admin');
    expect(STATIC_PATHS.some((p) => p.startsWith('/user'))).toBe(false);
  });
});

describe('researchEntries', () => {
  it('produces one absolute entry per article', () => {
    const entries = researchEntries();
    expect(entries).toHaveLength(ARTICLES.length);
    expect(entries[0].loc).toBe(`${SITE_URL}/research/${ARTICLES[0].slug}`);
  });
});

describe('buildSitemapXml', () => {
  it('wraps entries in a urlset with loc elements', () => {
    const xml = buildSitemapXml([{ loc: `${SITE_URL}/` }, { loc: `${SITE_URL}/research` }]);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain(`<loc>${SITE_URL}/research</loc>`);
  });

  it('includes lastmod when provided', () => {
    const xml = buildSitemapXml([{ loc: `${SITE_URL}/x`, lastmod: '2026-06-18' }]);
    expect(xml).toContain('<lastmod>2026-06-18</lastmod>');
  });

  it('escapes XML-special characters in the loc', () => {
    const xml = buildSitemapXml([{ loc: `${SITE_URL}/a?b=1&c=2` }]);
    expect(xml).toContain('&amp;');
    expect(xml).not.toContain('c=2&c'); // sanity: raw ampersand not left dangling
  });
});
