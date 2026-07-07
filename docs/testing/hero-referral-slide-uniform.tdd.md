# TDD Evidence — Uniform Hero Referral Slide

**Date:** 2026-07-07
**Task:** Make the hero carousel referral slide uniform in size across devices — it was taking the whole screen on mobile.
**Files changed:** `src/components/Hero.tsx`, `src/test/Hero.test.tsx`
**Source plan:** derived inline via `/ecc:plan` (conversational mode; no `*.plan.md` artifact).

## User Journey

> As a visitor on a small device, when the hero carousel reaches the referral slide,
> I want it to be the same size as the other slides (not full-screen),
> so the hero feels consistent.

## Root Cause

The carousel pins its viewport height to whichever slide is active (`Hero.tsx` measure
effect + `ResizeObserver`). The referral slide was the only slide with a **second column** —
a 260–320px decorative gift illustration (`ReferralGift`) stacked *above* a full text block
via `flex-col-reverse` on mobile — plus heavy padding. That made it far taller than the
image / assessment / research slides, so the hero visibly ballooned to full-screen height
when the carousel reached it.

## Fix

- Deleted the `ReferralGift` component and the unused `Gift` lucide import.
- Rebuilt the referral slide as a **centered single-column card** using the exact layout
  the assessment/research slides already use
  (`flex flex-col items-center justify-center gap-4 sm:gap-5 px-6 py-10 sm:py-16 text-center`).
- Preserved all referral content and links (eyebrow, heading, divider, description,
  "Share Your Code" → `/user/profile`, Sign In / Sign Up line) and the height-measuring `ref`.

Result: the referral slide is now structurally identical to its sibling content slides, so it
measures to a comparable height and no longer takes the whole screen on mobile.

## RED → GREEN

| Stage | Command | Result |
|-------|---------|--------|
| RED  | `npx vitest run src/test/Hero.test.tsx` | 1 failed / 7 passed — new test found `Lifestyle Program` (gift) still in the DOM |
| GREEN | `npx vitest run src/test/Hero.test.tsx` | 8 passed |

RED excerpt:
```
× does not render the oversized decorative gift illustration
expected document not to contain element, found <span ...>Lifestyle Program</span> instead
```

## Test Specification

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|--------------------|------|------|--------|----------|
| 1 | The decorative gift illustration (`Lifestyle Program` / `PEPTIDE`) is not rendered | `Hero.test.tsx > does not render the oversized decorative gift illustration` | unit | PASS | `npx vitest run src/test/Hero.test.tsx` |
| 2 | Referral heading "Share Your Referral Code" still renders | `Hero.test.tsx > shows the referral pitch heading` | unit | PASS | same |
| 3 | "Share Your Code" CTA links to `/user/profile` | `Hero.test.tsx > links the share-your-code CTA to the user profile` | unit | PASS | same |
| 4 | Sign In / Sign Up links target `/user/profile` | `Hero.test.tsx > links sign in and sign up to the user profile` | unit | PASS | same |
| 5 | A carousel dot exists for the referral slide | `Hero.test.tsx > adds a slide dot for the referral slide` | unit | PASS | same |

## Additional Verification

- **Full suite:** `npx vitest run` → 416 passed / 1 failed. The single failure is
  `src/test/ResearchBlog.test.tsx` (unrelated file, unchanged by this task, fails in isolation
  → pre-existing).
- **Type check:** `npx tsc --noEmit -p tsconfig.app.json` → no `Hero.tsx` errors.
- **Production build:** `npm run build` → built in 3.65s, no errors.
- **Visual (real browser, chrome-devtools MCP @ 375×812):** navigated to the referral slide
  with auto-advance disabled. Referral renders as a compact centered card sitting in the same
  frame envelope as the assessment and research slides — no full-screen blowout, no gift.

## Known Gaps

- No coverage-threshold run: the project has no `test:coverage` script and coverage tooling is
  not installed. Hero behavior is covered by 8 unit tests.
- Layout uniformity is asserted structurally (gift removed + shared layout classes) and
  confirmed by manual browser screenshot, not by an automated visual-regression baseline.
