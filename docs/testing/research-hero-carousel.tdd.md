# TDD Evidence Report — Research Page Hero Carousel

**Feature:** Convert the research page's static text hero into a 2-slide carousel, adding the imported `Research Hero.dc.html` design as a new slide.
**Date:** 2026-07-05
**Source design:** claude.ai/design project `92449f24…` → `Research Hero.dc.html` (imported via DesignSync MCP).
**Source plan:** Inline `/ecc:plan` output (this session); journeys derived below.

## User Journeys

1. A research visitor lands on `/research` and can page through a hero carousel — an intro slide ("Peptide Research & Education") and a "science behind every protocol" slide with key stats and quick links to the latest guides.
2. The visitor moves between slides with next/prev buttons and dots; the active dot reflects the current slide.
3. Slide 2 shows 3 outcome stats, a "Latest Research" card linking the non-featured guides, and an "Explore all research" CTA that scrolls to the full index.
4. Controls are labelled; auto-advance is paused under `prefers-reduced-motion`.

## Task Report

| Task | Summary | Validation command | RED → GREEN |
|---|---|---|---|
| `getResearchHeroPosts` helper | Pure mapper: non-featured articles → hero-card view model (zero-padded num, uppercased category, SPA href) | `npx vitest run src/test/researchHelpers.test.ts` | RED: `TypeError: getResearchHeroPosts is not a function` → GREEN: 4 new specs pass |
| `ResearchHero` carousel component | Two-slide carousel (intro + science design) with labelled arrows/dots, auto-advance, reduced-motion guard | `npx vitest run src/test/ResearchHero.test.tsx` | RED: module not found (compile-time) → GREEN: 7 specs pass |
| Wire into `ResearchBlog` | Replace static hero `<section>` with `<ResearchHero onExploreResearch={scrollToLatest} />`; grid gets a ref/anchor | `npx vitest run src/test/ResearchBlog.test.tsx` | GREEN: existing 5 specs still pass (no regression) |

## Test Specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Hero posts = one per non-featured article | `researchHelpers.test.ts:getResearchHeroPosts › returns one hero post per non-featured article` | unit | PASS |
| 2 | Featured article is excluded from the hero card | `researchHelpers.test.ts:getResearchHeroPosts › excludes the featured article` | unit | PASS |
| 3 | Posts numbered `01`,`02`… zero-padded sequential | `researchHelpers.test.ts:getResearchHeroPosts › numbers posts as zero-padded sequential strings` | unit | PASS |
| 4 | Category uppercased, href is `/research/${slug}` | `researchHelpers.test.ts:getResearchHeroPosts › uppercases the category and links to the SPA article route` | unit | PASS |
| 5 | Intro slide renders as the page `h1` | `ResearchHero.test.tsx:renders the intro slide as the page h1` | component | PASS |
| 6 | Science slide heading present | `ResearchHero.test.tsx:renders the science-library slide heading` | component | PASS |
| 7 | Three outcome stats shown (20.9% / 28.3% / 80+) | `ResearchHero.test.tsx:shows the three outcome stats` | component | PASS |
| 8 | Card links each non-featured guide via SPA route | `ResearchHero.test.tsx:lists the latest non-featured research guides with SPA links` | component | PASS |
| 9 | Labelled prev/next + dots; slide 1 active initially | `ResearchHero.test.tsx:exposes labelled prev/next controls and slide dots` | component | PASS |
| 10 | Next advances active slide/dot | `ResearchHero.test.tsx:advances to the next slide when Next is clicked` | component | PASS |
| 11 | CTA fires the explore-research callback | `ResearchHero.test.tsx:fires the explore-research callback from the science slide CTA` | component | PASS |
| 12 | Existing blog index unchanged (hero h1, featured, grid, count, newsletter) | `ResearchBlog.test.tsx` (5 specs) | component | PASS |

## Evidence (commands run)

- `npx vitest run src/test/researchHelpers.test.ts src/test/ResearchHero.test.tsx` — RED (4 failed / 11 passed) before implementation.
- `npx vitest run …` (post-impl) — 27 passed across the 3 research files.
- `npx tsc --noEmit` — exit 0 (clean).
- `npx vitest run` — **390 passed / 36 files**, no regressions.
- `npm run build` — built in ~6s; `ResearchBlog` chunk 16.72 kB (4.78 kB gzip), within the landing-page budget.

## Coverage & Known Gaps

- New logic (`getResearchHeroPosts`) fully unit-covered; `ResearchHero` behavior covered via RTL.
- **Auto-advance timing** and **reduced-motion pause** are guarded in code but not asserted with fake timers (kept out to avoid flaky timeout-based tests, per web testing rules). The reduced-motion branch is exercised indirectly (jsdom lacks `matchMedia`, so the guard returns `false`).
- **Visual regression** (breakpoints 320/375/768/1024/1440) recommended as a follow-up via Playwright screenshots; manual dev-server checks were performed this session at 1440px (both slides) and 375px (mobile stacking).
- **Refactor (Step 6):** the viewport is sized to the *active* slide's measured height (via `ResizeObserver`, guarded for jsdom) so the shorter intro slide no longer inherits the taller slide's height — this removed a large empty gap seen on mobile during verification. All tests remained green after the change.
