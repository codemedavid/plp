# TDD Evidence Report — "Why GLP-1 Is Not Effective" research article

**Task:** Add `blog-post-5-why-glp1-not-effective.docx` to the research library as a fifth,
featured article, structured so it inherits all existing SEO machinery, and maximize its
search visibility.

**Source plan:** Inline `/ecc:plan` output (conversational mode), confirmed via
`/ecc:tdd-workflow continue`. Two user decisions: (1) make the new article **featured**;
(2) slug = **`why-glp1-not-working`**.

**Date:** 2026-07-05 · **Branch:** main

---

## User journeys

1. As a person whose GLP-1 medication isn't producing weight loss, I want an evidence-based
   explanation of *why*, so that I can identify and address the real barrier.
2. As a Filipino reader, I want the insulin-resistance and diet guidance in Tagalog, so that
   the "rice factor" advice is actionable for me.
3. As a search engine / crawler, I want a canonical URL, sitemap entry, structured data
   (`MedicalWebPage` + `BreadcrumbList` + `FAQPage`), and correct language markup, so that the
   article ranks for non-responder queries in both English and Tagalog.
4. As a reader of the existing GLP-1 articles, I want cross-links to and from this piece, so
   that related content is discoverable (and link equity flows both ways).

## What was built

Data-driven change only — no new routing or components. Adding one `Article` to `ARTICLES`
auto-produces the route (`/research/:slug`), the sitemap entry (`researchEntries()`), the index
Blog JSON-LD, and the per-article `MedicalWebPage`/`Breadcrumb`/`FAQPage` JSON-LD.

| File | Change |
|---|---|
| `src/data/researchArticles.ts` | Added 5 optional `table*` fields to `Article`; added the featured `why-glp1-not-working` article (bilingual body with `lang="fil"` section, 5 tables, 13 TOC anchors, 6 FAQs, 6 sources); flipped `complete-peptide-guide` `featured`→`false`; added the new slug into 3 existing `related` arrays |
| `src/components/research/researchHelpers.ts` | Registered 5 new `__TABLE_*__` placeholders in `TABLE_PLACEHOLDERS` |
| `src/test/researchArticles.test.ts` | Count 4→5, featured slug assertion, new placeholder keys, new SEO-contract `describe` block |

## RED → GREEN

- **RED:** After updating the test contract (before touching production code),
  `npx vitest run src/test/researchArticles.test.ts` → **8 failed | 8 passed (16)**. Failures
  were the intended reason: article/table fields absent, count still 4, featured still the
  peptide guide (`TypeError: Cannot read properties of undefined (reading 'tableResponse')`,
  `expected 4 to be 5`, etc.). No unrelated failures.
- **GREEN:** After the production edits, `npx vitest run src/test/researchArticles.test.ts` and
  the research/SEO suite → **68 passed (8 files)**. Full suite `npx vitest run` →
  **343 passed (32 files)**. `npm run build` (tsc + vite) → **built in ~3.2s**, no type errors.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Library holds all five articles | `researchArticles.test.ts › contains all five articles` | unit | PASS |
| 2 | Exactly one featured article, and it is the new guide | `› marks exactly one … featured`, `› featured article is the GLP-1 non-responder guide` | unit | PASS |
| 3 | New article exists and is featured | `GLP-1 non-responder article (SEO) › exists and is the featured article` | unit | PASS |
| 4 | Meta description ≤160 chars (SERP-safe) | `› keeps its meta description within the ~155-char SERP limit` | unit | PASS |
| 5 | Targets non-responder / insulin-resistance keyword cluster | `› targets the … keyword cluster` | unit | PASS |
| 6 | Tagalog sections marked `lang="fil"` | `› marks its Tagalog sections with lang="fil"` | unit | PASS |
| 7 | All 5 referenced tables render | `› renders every data table it references` | unit | PASS |
| 8 | Bidirectional internal links exist | `› cross-links to and from the existing GLP-1 articles` | unit | PASS |
| 9 | Every TOC anchor id appears in body | `› every TOC anchor id appears in the article body` | unit | PASS |
| 10 | Every table placeholder has matching data | `› every table placeholder in a body has matching table data` | unit | PASS |
| 11 | Every `related` slug resolves; none self-links | `› every related slug resolves…`, `› no article lists itself as related` | unit | PASS |
| 12 | Sitemap has one entry per article (new URL included) | `sitemap.test.ts › researchEntries` | unit | PASS |
| 13 | Server-side meta prerender covers all article slugs | `renderMeta.test.ts` | unit | PASS |

## SEO surfaces confirmed

- **Canonical route:** `/research/why-glp1-not-working` (dynamic `:slug`, no route change needed).
- **Sitemap:** `/sitemap.xml` → `/api/sitemap` (`vercel.json` rewrite) → `researchEntries()` maps
  every article; new URL auto-included with `lastmod: 2026-07-05`.
- **Structured data:** `MedicalWebPage` + `BreadcrumbList` + `FAQPage` (6 Q&A) via `useArticleSeo`;
  Blog `BlogPosting[]` on the index.
- **On-page:** keyword-optimized slug/title/meta/keywords; Tagalog content in `<section lang="fil">`;
  6 FAQs (incl. one Tagalog) for FAQ rich results; sources list for E-E-A-T; bidirectional
  internal links with 3 existing articles; featured placement on `/research`.

## Coverage & known gaps

- Coverage: no `test:coverage` script is configured (`package.json` exposes `test` / `test:watch`).
  The new behavior is covered by the 13 guarantees above; the article-data module is exercised by
  `researchArticles`, `sitemap`, `renderMeta`, `researchHelpers`, `ResearchArticle`, and
  `ResearchBlog` specs.
- No visual-regression/E2E screenshot added for the rendered article (would need Playwright against
  a running dev server). Recommended follow-up: a smoke E2E that loads `/research/why-glp1-not-working`,
  asserts the H1 and that TOC anchors resolve.

## Merge / checkpoint note

Per the session's git rule (commit only when asked; branch first on `main`), no checkpoint commits
were created. The RED/GREEN evidence above is the durable record. To formalize: branch off `main`,
then `test:` (RED reproducer) + `feat:` (article + GREEN).
