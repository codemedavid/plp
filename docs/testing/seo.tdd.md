# TDD Evidence — Site SEO

**Source plan:** inline `/ecc:plan` output ("make the website SEO friendly"), Phases 1–4 confirmed with `continue`.
**Date:** 2026-07-04
**Base URL:** `https://peptidelifestyleprogram.com`

## User journeys
1. As a search engine, I want a unique title/description/canonical per route so pages index distinctly.
2. As a search engine, I want structured data (Organization, WebSite, Product) so results show rich info.
3. As a crawler, I want a robots.txt and a sitemap listing all public URLs (static + research + products).
4. As a social scraper (non-JS), I want a brand-level link preview on any shared URL.

## RED → GREEN
- **RED:** `test: add reproducers for SEO helpers, sitemap, and Seo component (RED)` — the 3 new test files failed on missing modules (`src/lib/seo`, `src/lib/sitemap`, `src/components/seo/Seo`).
- **GREEN:** `feat: SEO head component, structured-data + sitemap builders (GREEN)` + wiring commits. 19 new tests pass; full suite **283 passing**; `npm run build` green.
- **End-to-end verified in a real browser** (not just jsdom): home route emits title/canonical/description/OG/Twitter + Organization & WebSite JSON-LD; product route emits product title + Product JSON-LD (name, ₱3899, PHP, InStock, product URL) with exactly **1 canonical** = the product URL and **1 robots** tag after removing the static duplicates from `index.html`.

## Test specification
| # | Guarantee | Test | Type | Result |
|---|-----------|------|------|--------|
| 1 | `absoluteUrl` normalizes root/relative/trailing-slash/absolute inputs | `seo.test.ts` | unit | PASS |
| 2 | Organization/WebSite/Product schemas have correct @type & fields; availability flips In/OutOfStock | `seo.test.ts` | unit | PASS |
| 3 | `STATIC_PATHS` covers public routes, never `/admin` or `/user` | `sitemap.test.ts` | unit | PASS |
| 4 | `researchEntries` yields one absolute entry per article | `sitemap.test.ts` | unit | PASS |
| 5 | `buildSitemapXml` produces urlset/loc/lastmod and escapes `&` | `sitemap.test.ts` | unit | PASS |
| 6 | `<Seo>` sets title, description, canonical | `Seo.test.tsx` | component | PASS |
| 7 | `<Seo>` emits Open Graph + Twitter tags | `Seo.test.tsx` | component | PASS |
| 8 | `<Seo>` renders JSON-LD when provided; sets robots noindex on request | `Seo.test.tsx` | component | PASS |

## What shipped (Phases 1–4)
- `react-helmet-async` + `<Seo>` component + `HelmetProvider` (`src/main.tsx`).
- `src/lib/seo.ts` (constants, `absoluteUrl`, Organization/WebSite/Product schema), `src/lib/sitemap.ts` (pure builders).
- Per-route `<Seo>`: home (Org+WebSite JSON-LD), product pages (Product JSON-LD), FAQ, protocols; research pages already emit full head/JSON-LD.
- `public/robots.txt`; dynamic `api/sitemap.ts` (static + research + available products) with `/sitemap.xml` → `/api/sitemap` rewrite in `vercel.json`.
- `index.html`: default OG/Twitter/theme-color for non-JS social crawlers; canonical + robots removed so Helmet owns them per-route (no duplicates).

## Coverage & known gaps
- Full suite: `npx vitest run` → **283 passed / 25 files**. New behavior covered by 19 targeted tests + browser verification.
- **Per-page social previews (was Phase 5): DONE via server-side meta injection.** `src/lib/renderMeta.ts` (`injectMeta`/`metaForArticle`/`metaForProduct`, 9 unit tests) + `api/render.ts` fetch the built `index.html` and rewrite its `<head>` per URL; `vercel.json` routes `/products/*` and `/research/*` to it. Non-JS scrapers get accurate per-page previews; React still hydrates. `injectMeta`'s regex verified against the real built `index.html` tag format. **Requires a Vercel deploy to verify end-to-end** (validate with the Facebook Sharing Debugger / OG preview on a product + a research URL) — the function cannot run under `vite dev`/jsdom.
- **All public routes now carry per-page `<Seo>`:** home, products, research, faq, protocols, track-order, shipping-returns, terms, privacy, calculator.
- **Accessibility:** image `alt` audit — every customer-facing image already had a descriptive `alt` (the earlier "15 missing" was a line-based grep false positive on multi-line JSX). Remaining CWV item: hero/product image compression (hero is 708 KB) — not yet done.
- `api/sitemap.ts` uses `any` for the handler req/res, matching the existing `api/keepalive.ts` convention.
