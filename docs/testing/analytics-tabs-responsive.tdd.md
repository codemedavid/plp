# TDD Evidence: Responsive Analytics Tab Bar

**Date:** 2026-07-07
**Branch:** main
**Scope:** Fix the Analytics dashboard tab navigation, which overflowed and clipped off the right edge on narrow viewports ("this part is not responsive").

## Source Plan

Derived inline during this session from the `/ecc:plan` output (single-file responsive fix, expanded slightly to extract a presentational `AnalyticsTabs` component so the fix is unit-testable without mocking the Supabase-backed `useAnalytics` hook).

## User Journey

> As an admin viewing the Analytics dashboard on a narrow screen (phone / split window), I want the section tab bar (Sales & Profit, Referrals, Network, Customers, Payout & Liability, Product Profit) to stay fully reachable, so that I can switch sections instead of losing tabs off the clipped right edge.

## Root Cause

`AnalyticsDashboard.tsx` rendered the tab strip inline with `w-fit` + `flex` and **no wrap / no scroll**. Six icon+label pills exceed a narrow viewport width, so the strip extended past the container and was clipped. Tab data tables already had `overflow-x-auto`; the tab bar did not.

## Fix

- Extracted the tab bar into a presentational component `src/components/analytics/AnalyticsTabs.tsx` (container/presentational split; removes duplicated `TABS`/`TabId` from the dashboard).
- Made the strip horizontally scrollable: dropped `w-fit`, added `max-w-full overflow-x-auto`.
- Kept pills intact under width pressure: added `shrink-0 whitespace-nowrap` to each tab button.
- Added `role="tablist"` / `role="tab"` / `aria-selected` for accessibility and stable semantic test queries.

## Task Report

| Step | Summary | Command | Result |
|---|---|---|---|
| RED | New spec imports the not-yet-created `AnalyticsTabs` → compile-time RED (intended missing implementation) | `npx vitest run src/test/AnalyticsTabs.test.tsx` | FAIL — `Failed to resolve import "../components/analytics/AnalyticsTabs"` |
| GREEN | Implemented `AnalyticsTabs.tsx` with scrollable strip | `npx vitest run src/test/AnalyticsTabs.test.tsx` | PASS — 5/5 |
| Refactor | Replaced inline tab markup in `AnalyticsDashboard.tsx` with `<AnalyticsTabs>`, removed dead imports | `npx tsc --noEmit` | PASS — exit 0 |
| Regression | Analytics-touching specs still green | `npx vitest run src/test/AnalyticsTabs.test.tsx src/test/DateRangeFilter.test.tsx` | PASS — 11/11 |

## Test Specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | All six analytics tabs render as tabs with correct labels | `AnalyticsTabs.test.tsx:renders all six analytics tabs` | unit | PASS |
| 2 | The active tab is marked `aria-selected="true"`, others `false` | `AnalyticsTabs.test.tsx:marks the active tab as selected` | unit | PASS |
| 3 | Clicking a tab calls `onSelect` with that tab's id | `AnalyticsTabs.test.tsx:calls onSelect with the tab id when a tab is clicked` | unit | PASS |
| 4 | The strip is horizontally scrollable and not clipped (`overflow-x-auto`, no `w-fit`) | `AnalyticsTabs.test.tsx:renders a horizontally scrollable tab strip that does not clip` | unit | PASS |
| 5 | Each pill resists squish/wrap (`shrink-0` + `whitespace-nowrap`) | `AnalyticsTabs.test.tsx:keeps each tab pill from squishing or wrapping` | unit | PASS |

## Coverage & Known Gaps

- **JSDOM has no layout engine**, so tests 4–5 assert on the structural Tailwind classes that produce scroll-instead-of-clip behavior, not on measured pixel overflow. True visual confirmation across breakpoints (320 / 375 / 768 / 1024 / 1440) should be done with a Playwright screenshot pass if visual regression coverage is desired.
- Pre-existing, unrelated failures in the working tree at the time of this task: `ResearchBlog.test.tsx`, `researchArticles.test.ts`, `researchHelpers.test.ts` (research/blog content from prior uncommitted work). Not touched by this change; `tsc` is clean and all analytics tests pass.

## Merge Evidence

RED (missing `AnalyticsTabs` import) → GREEN (5/5 on `AnalyticsTabs.test.tsx`) → Refactor (dashboard consumes the component, `tsc --noEmit` exit 0, 11/11 analytics tests). No checkpoint commits created — repo commit is deferred to the user per project git convention.
