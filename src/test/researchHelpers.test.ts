import { describe, it, expect } from 'vitest';
import {
  buildTable,
  buildBody,
  getArticleBySlug,
  getFeaturedArticle,
  getOtherArticles,
  getRelatedArticles,
} from '../components/research/researchHelpers';
import { ARTICLES } from '../data/researchArticles';
import type { Article, TableData } from '../data/researchArticles';

const sampleTable: TableData = {
  head: ['A', 'B'],
  rows: [
    ['1', '2'],
    ['3', '4'],
  ],
};

describe('buildTable', () => {
  it('returns empty string when given no table', () => {
    expect(buildTable(undefined)).toBe('');
  });

  it('renders a header row from head cells', () => {
    const html = buildTable(sampleTable);
    expect(html).toContain('<thead><tr><th>A</th><th>B</th></tr></thead>');
  });

  it('renders one body row per data row', () => {
    const html = buildTable(sampleTable);
    expect(html).toContain('<tr><td>1</td><td>2</td></tr>');
    expect(html).toContain('<tr><td>3</td><td>4</td></tr>');
  });
});

describe('buildBody', () => {
  it('replaces every table placeholder with rendered table markup', () => {
    for (const article of ARTICLES) {
      const html = buildBody(article);
      expect(html).not.toMatch(/__TABLE_[A-Z]+__/);
    }
  });

  it('injects the uses table for the complete peptide guide', () => {
    const guide = ARTICLES.find((a) => a.slug === 'complete-peptide-guide')!;
    const html = buildBody(guide);
    expect(html).toContain('<table>');
    // A known cell from tableUses
    expect(html).toContain('BPC-157');
  });

  it('leaves a body without placeholders unchanged', () => {
    const article = { body: '<p>No tables here</p>' } as Article;
    expect(buildBody(article)).toBe('<p>No tables here</p>');
  });
});

describe('article selectors', () => {
  it('finds an article by slug', () => {
    expect(getArticleBySlug('tirzepatide-faq')?.title).toContain('Tirzepatide');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getArticleBySlug('does-not-exist')).toBeUndefined();
  });

  it('returns the featured article', () => {
    expect(getFeaturedArticle()?.featured).toBe(true);
  });

  it('excludes the featured article from the others list', () => {
    const others = getOtherArticles();
    expect(others.every((a) => !a.featured)).toBe(true);
    expect(others).toHaveLength(ARTICLES.length - 1);
  });

  it('resolves related articles in order and never includes self', () => {
    const guide = getArticleBySlug('complete-peptide-guide')!;
    const related = getRelatedArticles(guide);
    expect(related.map((a) => a.slug)).toEqual(guide.related);
    expect(related.every((a) => a.slug !== guide.slug)).toBe(true);
  });
});
