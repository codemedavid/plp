import { describe, it, expect } from 'vitest';
import { ARTICLES, AUTHOR } from '../data/researchArticles';

describe('researchArticles data', () => {
  it('contains all four ported articles', () => {
    expect(ARTICLES).toHaveLength(4);
  });

  it('has unique slugs', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('marks exactly one article as featured', () => {
    expect(ARTICLES.filter((a) => a.featured)).toHaveLength(1);
  });

  it('the featured article is the complete peptide guide', () => {
    const featured = ARTICLES.find((a) => a.featured);
    expect(featured?.slug).toBe('complete-peptide-guide');
  });

  it('every related slug resolves to a real article', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const article of ARTICLES) {
      for (const rel of article.related) {
        expect(slugs.has(rel)).toBe(true);
      }
    }
  });

  it('no article lists itself as related', () => {
    for (const article of ARTICLES) {
      expect(article.related).not.toContain(article.slug);
    }
  });

  it('every TOC anchor id appears in the article body', () => {
    for (const article of ARTICLES) {
      for (const item of article.toc) {
        // The FAQ section id lives in the component, not the body string.
        if (item.id === 'faq') continue;
        expect(article.body).toContain(`id="${item.id}"`);
      }
    }
  });

  it('every table placeholder in a body has matching table data', () => {
    const placeholderToKey: Record<string, keyof (typeof ARTICLES)[number]> = {
      __TABLE_USES__: 'tableUses',
      __TABLE_STORAGE__: 'tableStorage',
      __TABLE_MECH__: 'tableMech',
      __TABLE_RESULTS__: 'tableResults',
      __TABLE_DOSING__: 'tableDosing',
      __TABLE_GLANCE__: 'tableGlance',
      __TABLE_WHICH__: 'tableWhich',
    };
    for (const article of ARTICLES) {
      for (const [placeholder, key] of Object.entries(placeholderToKey)) {
        if (article.body.includes(placeholder)) {
          expect(article[key], `${article.slug} missing ${key}`).toBeTruthy();
        }
      }
    }
  });

  it('every article carries required metadata fields', () => {
    for (const article of ARTICLES) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(article.metaDescription.length).toBeGreaterThan(0);
      expect(article.dateLabel.length).toBeGreaterThan(0);
      expect(article.readMins).toBeGreaterThan(0);
      expect(article.faqs.length).toBeGreaterThan(0);
      expect(article.sources.length).toBeGreaterThan(0);
    }
  });

  it('exposes an author with a bio', () => {
    expect(AUTHOR.name).toBeTruthy();
    expect(AUTHOR.bio.length).toBeGreaterThan(0);
  });
});
