import { describe, it, expect } from 'vitest';
import { ARTICLES, AUTHOR } from '../data/researchArticles';

describe('researchArticles data', () => {
  it('contains all five articles', () => {
    expect(ARTICLES).toHaveLength(5);
  });

  it('has unique slugs', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('marks exactly one article as featured', () => {
    expect(ARTICLES.filter((a) => a.featured)).toHaveLength(1);
  });

  it('the featured article is the GLP-1 non-responder guide', () => {
    const featured = ARTICLES.find((a) => a.featured);
    expect(featured?.slug).toBe('why-glp1-not-working');
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
      __TABLE_RESPONSE__: 'tableResponse',
      __TABLE_DIABETIC__: 'tableDiabetic',
      __TABLE_TIMELINE__: 'tableTimeline',
      __TABLE_MEDS__: 'tableMeds',
      __TABLE_WORKUP__: 'tableWorkup',
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

  describe('GLP-1 non-responder article (SEO)', () => {
    const article = ARTICLES.find((a) => a.slug === 'why-glp1-not-working');

    it('exists and is the featured article', () => {
      expect(article).toBeDefined();
      expect(article?.featured).toBe(true);
    });

    it('keeps its meta description within the ~155-char SERP limit', () => {
      expect(article!.metaDescription.length).toBeGreaterThan(0);
      expect(article!.metaDescription.length).toBeLessThanOrEqual(160);
    });

    it('targets the non-responder / insulin-resistance keyword cluster', () => {
      const kw = article!.keywords.toLowerCase();
      expect(kw).toContain('ozempic');
      expect(kw).toContain('non-responder');
      expect(kw).toContain('insulin resistance');
    });

    it('marks its Tagalog sections with lang="fil" for bilingual crawling', () => {
      expect(article!.body).toContain('lang="fil"');
    });

    it('renders every data table it references', () => {
      expect(article!.tableResponse).toBeTruthy();
      expect(article!.tableDiabetic).toBeTruthy();
      expect(article!.tableTimeline).toBeTruthy();
      expect(article!.tableMeds).toBeTruthy();
      expect(article!.tableWorkup).toBeTruthy();
    });

    it('cross-links to and from the existing GLP-1 articles', () => {
      expect(article!.related.length).toBeGreaterThanOrEqual(3);
      const backlinks = ARTICLES.filter((a) => a.related.includes('why-glp1-not-working'));
      expect(backlinks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
