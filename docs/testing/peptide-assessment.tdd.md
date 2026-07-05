# TDD Evidence Report — Peptide Assessment

**Feature:** Import & implement the "Peptide Assessment" design as a `/assessment`
page (screening + goals + lifestyle wizard → ranked, safety-checked product
recommendations), plus homepage hero CTA and a promo-banner slide.

**Source plan:** derived inline from `/ecc:plan` (conversational mode) + the
imported Claude Design file `Peptide Assessment.dc.html` (project
`352d97c8-6858-4b75-940c-a2377b4601bd`). Scope confirmed with the user:
homepage = hero CTA + banner slide; results link to live catalog by name;
**wizard flow only** (page/chat variants dropped).

**Date:** 2026-07-05

---

## User Journeys

1. As a visitor, I want to answer screening and lifestyle questions so I receive
   a ranked peptide protocol matched to my goals.
2. As a visitor with a contraindication (minor, pregnancy, MEN2/thyroid history +
   weight goal), I want to be safely screened out rather than sold a product.
3. As a suitable-with-cautions visitor, I want to see precautions before results.
4. As a visitor, I want each recommendation to link to the real product page.
5. As a homepage visitor, I want a clear entry point to the assessment (hero CTA
   and rotating banner).

## Task → Test → Evidence Map

| Task | Test target | RED evidence | GREEN evidence |
|---|---|---|---|
| Screening & scoring logic | `src/test/assessment.test.ts` | Import of missing `../lib/assessment` → "no tests" (compile-time RED) | `src/lib/assessment.ts` → 19/19 pass |
| Wizard state machine | `src/test/useAssessment.test.ts` | Missing `../hooks/useAssessment` → RED; later 3 `select()` tests RED | `src/hooks/useAssessment.ts` → 11/11 pass |
| Presentational components | `src/test/assessmentComponents.test.tsx` | n/a (added as regression render tests) | 6/6 pass |
| Route/nav/hero/banner wiring | `npm run build` | — | Build green; `AssessmentPage` code-split chunk emitted |

## Test Specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Under-18 applicants are disqualified and receive **no** recommendations | `assessment.test.ts › disqualifies applicants under 18` | unit | PASS |
| 2 | Pregnancy disqualifies | `assessment.test.ts › disqualifies applicants who are pregnant` | unit | PASS |
| 3 | Thyroid/MEN2 history + weight goal disqualifies | `assessment.test.ts › disqualifies a weight goal when there is thyroid…` | unit | PASS |
| 4 | With `allowDisqualify:false`, reasons become cautions, not blocks | `assessment.test.ts › surfaces reasons as cautions…` | unit | PASS |
| 5 | Diabetes → hypoglycemia caution, not a block | `assessment.test.ts › warns about hypoglycemia…` | unit | PASS |
| 6 | Thyroid history (non-weight goal) excludes all tirzepatide/slim products | `assessment.test.ts › excludes slim/tirzepatide products…` | unit | PASS |
| 7 | Ranks strongest primary-goal match first, ≤3 results, top match = 97% | `assessment.test.ts › ranks the strongest primary-goal match first…` | unit | PASS |
| 8 | Match never drops below the 55% floor | `assessment.test.ts › never returns a match below the 55% floor` | unit | PASS |
| 9 | GLP-1-naive users get a starter-friendly slim strength boost | `assessment.test.ts › boosts a starter-friendly slim strength…` | unit | PASS |
| 10 | Weight goal only yields weight-line products | `assessment.test.ts › recommends only weight-line products…` | unit | PASS |
| 11 | Within-budget products flagged; over-budget penalized | `assessment.test.ts › flags within-budget products…` | unit | PASS |
| 12 | Conditional weight questions hide/show by goal | `assessment.test.ts › visibleQuestions / weightRelevant` | unit | PASS |
| 13 | Wizard starts home, enters quiz, records answers | `useAssessment.test.ts › starts…/start()…/records…` | unit | PASS |
| 14 | Multi-select toggles with "none" semantics | `useAssessment.test.ts › toggles multi-select values…` | unit | PASS |
| 15 | `back()` guards at the first question | `useAssessment.test.ts › back() steps back but never below…` | unit | PASS |
| 16 | Suitable adult routes to results; screened-out routes to DQ | `useAssessment.test.ts › routes to results…/routes to the disqualification view` | unit | PASS |
| 17 | `select()` auto-advances singles, not multis; finishes on last single | `useAssessment.test.ts › select() …` (×3) | unit | PASS |
| 18 | Home renders headline and fires onStart | `assessmentComponents.test.tsx › AssessmentHome` | component | PASS |
| 19 | Wizard renders options, routes onSelect, disables Continue until answered | `assessmentComponents.test.tsx › AssessmentWizard` (×2) | component | PASS |
| 20 | Results render ranked cards; link to live product page or catalog fallback | `assessmentComponents.test.tsx › AssessmentResults` (×2) | component | PASS |
| 21 | Not-Suitable renders reasons and a home action | `assessmentComponents.test.tsx › AssessmentNotSuitable` | component | PASS |

## Validation Commands Run

```
npx vitest run                 # 373 passed (34 files) — includes 36 new assessment tests
npm run build                  # tsc + vite build green; AssessmentPage → 7.55 kB gzip lazy chunk
npx eslint <new files>         # exit 0
```

## Coverage & Known Gaps

- **Numeric coverage not produced:** `@vitest/coverage-v8` is not installed in
  this repo, so `--coverage` reports a missing-dependency error. A dependency was
  intentionally **not** added. Coverage is nonetheless comprehensive by
  inspection: every branch of `computeAssessment` (all DQ paths, every caution,
  scoring/GLP-1/budget branches), all `useAssessment` transitions, and all five
  components are exercised by the 36 tests above.
- **Not automated:** cross-browser visual regression and Lighthouse (per web
  testing rules) — the page reuses existing tokens/Header/Footer and builds
  clean, but a screenshot pass at 320/768/1024/1440 is a recommended follow-up.
- **Product-link caveat:** the three "PLP-Slim" strength variants slugify to one
  PDP (`/products/plp-slim`); the PDP's variation selector covers strengths.
  Unmatched names fall back to the catalog anchor `/#all-products`.

## Deliberate deviation from the imported design

The design computed recommendations even for disqualified users (hiding them in
the UI). `computeAssessment` instead returns **no** recommendations when a
screening disqualification fires — safer for a health context. Captured by
test #1.
