# TDD Evidence — Research Blog Page

**Source plan:** inline `/ecc:plan` output (Research page implementing the imported `Peptide Blog.dc.html` design), confirmed with `proceed`.
**Date:** 2026-07-04

## User journeys

1. As a visitor, I want to browse a research library so I can find evidence-based peptide articles.
2. As a visitor, I want to open an article and read it with a table of contents, tables, FAQ, and sources.
3. As a visitor on a bad/old article URL, I want to land somewhere sensible (the research index) rather than a broken page.
4. As a search engine, I want per-article canonical URLs and JSON-LD (MedicalWebPage / BreadcrumbList / FAQPage).

## RED → GREEN

- **RED:** `test: add reproducers for research blog page (RED)`. Running the 4 new test files failed at import resolution — the modules under test (`researchArticles`, `researchHelpers`, `ResearchBlog`, `ResearchArticle`) did not exist. Compile-time RED caused by the intended missing implementation.
- **GREEN:** `feat: add research blog page (index + article views) — GREEN`. All 33 new tests pass; full suite 257/257; `npm run build` and `eslint` green. Two brittle fixture assertions were corrected during GREEN (substring-collision on `title.slice(0,20)` → href-based; `/not medical advice/` appeared in both disclaimer and footer → matched the disclaimer's unique phrase). No production behavior was loosened.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Exactly 4 articles, unique slugs, one featured (the guide) | `researchArticles.test.ts` | unit/data | PASS |
| 2 | Every `related` slug resolves; no self-reference | `researchArticles.test.ts` | unit/data | PASS |
| 3 | Every TOC anchor id (except `faq`) exists in the body; every `__TABLE_*__` placeholder has table data | `researchArticles.test.ts` | unit/data | PASS |
| 4 | `buildTable` renders header + one row per data row; empty for undefined | `researchHelpers.test.ts` | unit | PASS |
| 5 | `buildBody` replaces every table placeholder; leaves placeholder-free bodies unchanged | `researchHelpers.test.ts` | unit | PASS |
| 6 | `getArticleBySlug`/`getFeaturedArticle`/`getOtherArticles`/`getRelatedArticles` behave per spec | `researchHelpers.test.ts` | unit | PASS |
| 7 | Index renders hero h1, featured link, all grid links (by href), article count, newsletter control | `ResearchBlog.test.tsx` | component | PASS |
| 8 | Article renders h1, TOC anchor links, FAQ questions, sources, disclaimer | `ResearchArticle.test.tsx` | component | PASS |
| 9 | FAQ accordion toggles `aria-expanded` false→true on click | `ResearchArticle.test.tsx` | component | PASS |
| 10 | Unknown slug redirects to `/research` | `ResearchArticle.test.tsx` | component | PASS |

## Coverage & known gaps

- Full suite: `npx vitest run` → 257 passed / 22 files. New behavior covered by 33 targeted tests.
- Not automated (recommended manual/visual follow-up per web testing rules): visual regression at 320/768/1024/1440, reduced-motion progress-bar suppression, JSON-LD validation in a real browser, and sticky-TOC offset vs. header. `window.scrollTo` is a benign jsdom no-op warning in tests.
- Newsletter form is intentionally a no-op (`preventDefault`), matching the design; wiring to a real subscribe endpoint is a future task.

## Notes / deviations from plan

- Route base is `/research` + `/research/:slug` (matches the RESEARCH nav label). The design's JSON-LD `url` values use `/research/<slug>`.
- Reused the design's own branded header/footer (`ResearchShell`) rather than the app `Header` (which is coupled to cart/auth), consistent with existing standalone pages like `ShippingReturns`.
