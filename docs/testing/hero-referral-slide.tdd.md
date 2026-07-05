# TDD Evidence: Hero "Share Your Referral Code" Slide

**Date:** 2026-07-05
**Branch:** `feat/hero-referral-slide`
**Component:** `src/components/Hero.tsx`
**Tests:** `src/test/Hero.test.tsx`

## Source plan

Derived during the `/ecc:plan` → `/ecc:tdd-workflow` session (no `*.plan.md` file). The
confirmed plan: add a two-column "Share Your Referral Code" slide to the hero
carousel, recreating the reference banner in code (CSS + SVG gift-box illustration,
no external asset). Always-on, placed second-to-last (before the research slide).
`SHARE YOUR CODE` and `Sign In` / `Sign Up` link to `/user/profile` (where the
existing `ShareBlock` lives).

Decisions confirmed via AskUserQuestion:
- Layout: **recreate the two-column illustrated design**.
- Behavior: **always-on**, buttons link to `/user/profile`.

## User journeys

1. As a visitor, I want to see a referral invite in the hero carousel, so that I
   know I can earn rewards by sharing my code.
2. As a visitor, I want a clear "Share Your Code" action, so that I can reach the
   page where my referral code and share tools live (`/user/profile`).
3. As a signed-out visitor, I want "Sign In" / "Sign Up" links, so that I can
   create an account before sharing (`/user/profile` prompts sign-in when logged out).
4. As a keyboard/screen-reader user, I want a carousel dot for the referral slide,
   so that I can navigate to it directly.

## Task report

**Summary:** Extended the `HeroSlide` union with `{ kind: 'referral' }`, inserted the
slide before the research slide, rendered a two-column layout (text column + CSS/SVG
`ReferralGift` illustration), and added a `referral` case to the dot `aria-label`.

- **Validation command:** `npx vitest run src/test/Hero.test.tsx`
- **RED evidence:** After adding the 4 referral tests (before implementation):
  `Tests 4 failed | 3 passed (7)` — the 3 pre-existing research-slide tests still
  passed; the 4 new referral tests failed with `Unable to find` element errors
  (missing implementation). Committed as `4c3703b test: add reproducer for hero referral slide`.
- **GREEN evidence:** After implementation: `Tests 7 passed (7)`. Committed as
  `56caa05 feat: add share-your-referral-code hero slide`.
- **Type check:** `npx tsc --noEmit` → clean (no output).
- **Lint:** `npx eslint src/components/Hero.tsx src/test/Hero.test.tsx` → clean.
- **Build:** `npm run build` → `✓ built in 6.18s`.
- **Guarantees:** The carousel always renders a referral slide whose CTA and
  sign-in/sign-up links target `/user/profile`, with an accessible heading and a
  navigation dot.

### Accessibility fix during GREEN

The heading was initially built as `Share Your<br /><em>Referral Code</em>` with no
whitespace node between the two runs, producing the accessible name
`"Share YourReferral Code"` (one run-on word). Added `{' '}` after the `<br />` so
the accessible name reads `"Share Your Referral Code"` — mirrors the existing
research slide's `{' '}` pattern. This is a real a11y correction, verified via the
`getByRole('heading', { name: /share your referral code/i })` query.

## Test specification

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|--------------------|------|------|--------|----------|
| 1 | Referral slide renders an accessible heading "Share Your Referral Code" | `Hero.test.tsx > shows the referral pitch heading` | unit | PASS | `npx vitest run src/test/Hero.test.tsx` |
| 2 | "Share Your Code" CTA links to `/user/profile` | `Hero.test.tsx > links the share-your-code CTA to the user profile` | unit | PASS | same |
| 3 | "Sign In" and "Sign Up" links target `/user/profile` | `Hero.test.tsx > links sign in and sign up to the user profile` | unit | PASS | same |
| 4 | A carousel dot exists for the referral slide | `Hero.test.tsx > adds a slide dot for the referral slide` | unit | PASS | same |

## Visual verification (chrome-devtools MCP)

Drove the live dev server (`http://localhost:5175/`) and captured the referral slide:

- **Desktop (~1280px):** Two-column layout matches the reference — gold "EARN MONTHLY"
  eyebrow, navy "Share Your" + gold serif "Referral Code", gold rule, body with bold
  "earn rewards", navy "SHARE YOUR CODE →" pill, "SIGN IN / SIGN UP" line; right column
  shows the navy gift box with gold ribbon + bow, cream circle backdrop, PEPTIDE brand
  mark, reward coin, and gold sprig.
- **Mobile (375px):** Stacks via `flex-col-reverse` — illustration on top, centered
  text below. No horizontal overflow.

## Coverage and known gaps

- Referral-slide behavior (heading, both link targets, dot) is fully covered by the
  4 new tests. The illustration is decorative (`aria-hidden="true"`) and verified
  visually rather than by DOM assertions, per the web testing rule that visual
  regression carries more signal than brittle markup assertions for highly visual
  components.

## Pre-existing issue (out of scope)

`src/test/ResearchBlog.test.tsx > renders the library hero heading` fails when run in
the same worker as **any** other test file (reproduced with unrelated `useCart.test.ts`
and with `ResearchHero.test.tsx`); it passes in isolation. This is a pre-existing
test-isolation defect in the prior session's uncommitted work (`ResearchBlog.tsx` /
`ResearchHero.tsx` are modified/untracked in the working tree) and is unrelated to the
referral slide. The referral change touches only `Hero.tsx` / `Hero.test.tsx`, and
`Hero.test.tsx` is isolation-clean.

## Merge evidence (for squash)

- RED: `4c3703b` — 4 referral tests fail, 3 research tests pass.
- GREEN: `56caa05` — 7/7 Hero tests pass; tsc, eslint, and `npm run build` all clean.
- Refactor: none required (component is small and idiomatic).
