import { ARTICLES } from '../../data/researchArticles';
import type { Article, TableData } from '../../data/researchArticles';

/**
 * Maps the `__TABLE_*__` body placeholders to their typed data field on an
 * Article. Kept in sync with the placeholders authored in the article bodies.
 */
const TABLE_PLACEHOLDERS: Array<[string, keyof Article]> = [
  ['__TABLE_USES__', 'tableUses'],
  ['__TABLE_STORAGE__', 'tableStorage'],
  ['__TABLE_MECH__', 'tableMech'],
  ['__TABLE_RESULTS__', 'tableResults'],
  ['__TABLE_DOSING__', 'tableDosing'],
  ['__TABLE_GLANCE__', 'tableGlance'],
  ['__TABLE_WHICH__', 'tableWhich'],
];

/** Render a typed table into the design's table markup (styled via `.prose`). */
export function buildTable(table?: TableData): string {
  if (!table) return '';
  const th = table.head.map((h) => `<th>${h}</th>`).join('');
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * Return the article body with every table placeholder replaced by rendered
 * table HTML. First-party content only — safe to inject via the prose renderer.
 */
export function buildBody(article: Article): string {
  return TABLE_PLACEHOLDERS.reduce((html, [placeholder, key]) => {
    if (!html.includes(placeholder)) return html;
    return html.replace(placeholder, buildTable(article[key] as TableData | undefined));
  }, article.body);
}

/** Find a single article by its slug. */
export function getArticleBySlug(slug: string, articles: Article[] = ARTICLES): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

/** The one article flagged `featured`, falling back to the first article. */
export function getFeaturedArticle(articles: Article[] = ARTICLES): Article | undefined {
  return articles.find((a) => a.featured) ?? articles[0];
}

/** Every article except the featured one, in source order. */
export function getOtherArticles(articles: Article[] = ARTICLES): Article[] {
  const featured = getFeaturedArticle(articles);
  return articles.filter((a) => a.slug !== featured?.slug);
}

/** Resolve an article's `related` slugs to articles, preserving order, never self. */
export function getRelatedArticles(article: Article, articles: Article[] = ARTICLES): Article[] {
  return article.related
    .filter((slug) => slug !== article.slug)
    .map((slug) => getArticleBySlug(slug, articles))
    .filter((a): a is Article => Boolean(a));
}
