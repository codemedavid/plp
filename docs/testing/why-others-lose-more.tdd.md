# TDD Evidence — Research Blog Post #6: "Why Others Lose More Weight" (GLP-1 variability + plateau myths)

**Feature branch:** `feat/blog-post-6-why-others-lose-more`
**Slug:** `why-others-lose-more-weight` · **Category:** GLP-1 Medications · **Featured:** yes
**Source research:** `~/Downloads/blog-post-6-why-others-lose-more-plateau-myth-2.docx` (bilingual EN/Tagalog, 3 tables)

## Source plan

Derived from the inline `/ecc:plan` output earlier this session (no `*.plan.md` file). The blog is fully data-driven: adding an article = appending one typed `Article` to `src/data/researchArticles.ts` (+ registering two new table placeholders). Routing (`/research/:slug`), per-article SEO (`MedicalWebPage` + `BreadcrumbList` + `FAQPage` JSON-LD, `<title>`, meta description), index cards, sitemap, and `renderMeta` all derive automatically from that object.

## User journeys

1. As a GLP-1 patient searching "why do others lose more weight than me," I land on a dedicated, SEO-optimized article that explains individual variability with cited science.
2. As a Filipino reader, I get the key explanation in Tagalog (`lang="fil"`) so bilingual search/crawlers surface it.
3. As a patient at a plateau, I learn a stall is normal biology and that switching suppliers is not the fix — with an evidence-based break-through checklist.
4. As a crawler/SERP, I read a unique ≤160-char meta description, a keyword cluster, valid JSON-LD, and reciprocal internal links to the existing GLP-1 articles.

## Task report

| Task | Summary | Validation run | Result |
|---|---|---|---|
| Encode guarantees as tests | Updated counts/featured expectations + new SEO block + helper table test | `npx vitest run src/test/researchArticles.test.ts src/test/researchHelpers.test.ts` | RED → 13 failed / 28 passed |
| Extend `Article` type | Added `tableFactors?`, `tableMyths?` (optional, backward-compatible) | `npx tsc --noEmit` | exit 0 |
| Register placeholders | `__TABLE_FACTORS__`, `__TABLE_MYTHS__` in `researchHelpers.ts` | vitest (helpers) | PASS |
| Add article + flip featured | Appended article; `why-glp1-not-working` → `featured:false` + reciprocal `related` | vitest (articles) | GREEN → 41 passed |
| Fix authored bugs | Single-quote apostrophe escaping in `tableMyths`; meta trimmed 163→159 chars | vitest | GREEN |
| Build verification | Production build with new content | `npm run build` | ✓ built in 3.44s |

### RED evidence (before implementation)
```
Test Files  2 failed (2)
     Tests  13 failed | 28 passed (41)
TypeError: Cannot read properties of undefined (reading 'productTie')  // new article absent
TypeError: Cannot read properties of undefined (reading 'body')        // buildBody(undefined)
```

### GREEN evidence (after implementation)
```
npx vitest run src/test/researchArticles.test.ts src/test/researchHelpers.test.ts
Test Files  2 passed (2)
     Tests  41 passed (41)

npx tsc --noEmit        → exit 0
npm run build           → ✓ built in 3.44s
```

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|--------------------|-----------|------|--------|
| 1 | Blog contains exactly 6 articles | `researchArticles.test.ts:contains all six articles` | unit | PASS |
| 2 | Exactly one featured article, and it is the new post | `researchArticles.test.ts:the featured article is the individual-variability / plateau guide` | unit | PASS |
| 3 | New article exists, featured, category "GLP-1 Medications" | `researchArticles.test.ts:individual-variability / plateau article (SEO)` | unit | PASS |
| 4 | Meta description ≤ 160 chars (SERP limit) | same block | unit | PASS |
| 5 | Keyword cluster targets EN + Tagalog ("ozempic", "plateau", "bakit mas malaki ang nabawas sa iba") | same block | unit | PASS |
| 6 | Tagalog content marked `lang="fil"` | same block | unit | PASS |
| 7 | `tableFactors`, `tableDiabetic`, `tableMyths` present and referenced via placeholders | same block | unit | PASS |
| 8 | Reciprocal cross-link with `why-glp1-not-working` | same block | unit | PASS |
| 9 | `buildBody` resolves the new placeholders (no `__TABLE_*__` left; known cells rendered) | `researchHelpers.test.ts:injects the factors and myths tables...` | unit | PASS |
| 10 | Every table placeholder in any body has matching data | `researchArticles.test.ts:every table placeholder...` | unit | PASS |
| 11 | Every non-`faq` TOC anchor id appears in the body | `researchArticles.test.ts:every TOC anchor id...` | unit | PASS |
| 12 | Sitemap emits one entry per article (incl. new) | `sitemap.test.ts` | unit | PASS |
| 13 | `renderMeta` derives correct URL/description per article | `renderMeta.test.ts` | unit | PASS |

## Coverage and known gaps

- Full suite: **431 passed / 432 total**, `tsc` clean, production build succeeds.
- **1 pre-existing failure, unrelated to this change**: `ResearchBlog.test.tsx › renders the library hero heading` (looks for an h1 `/peptide research/i`). Verified failing on the base commit with this change stashed — it is a hero-carousel issue, out of scope for this task. Not introduced here.
- Article body is first-party, inline-styled HTML (existing convention); rendered via the `.prose` renderer, no user input, no new XSS surface.
- Content figures/citations are ported verbatim from the source docx research; no new clinical claims invented.

## Merge evidence (for squash)

- RED: `test: add RED reproducer for blog post #6` (`55fe987`) — 13 tests failing for the intended gap.
- GREEN: `feat: add research blog post #6 …` (`5a5304f`) — 41 research tests passing, tsc clean, build ✓.
