# TDD Evidence — Admin sale price hidden by the 8.8 promo

**Date:** 2026-08-07
**Branch:** `feat/blog-post-6-why-others-lose-more`
**Checkpoints:** `e05a5c6` (RED) → `dbd1933` (GREEN) → refactor/hardening commit

## Source plan

No `*.plan.md` was used. Journeys were derived during this TDD run from a bug
report: *"i change already the discount price for the plp slim line but it
didnt get updated in the storefront."*

## Diagnosis

The admin edits **did** save. Live `products` rows at the time of the report:

| Product | `base_price` | `discount_price` | `discount_active` | Storefront showed |
|---|---|---|---|---|
| PLP-Slim (Tirzepatide 15mg) | 3999 | 2499 | true | **1999.50** |
| PLP-Slim (Tirzepatide 20mg) | 4499 | 2999 | true | **2249.50** |
| PLP-Slim Tirzepatide 30mg | 4999 | 3999 | true | **2499.50** |
| PLP-Slim 2.0 | 9499 | 5499 | false | **4749.50** |
| PLP Slim & Glow Bundle | 7499 | 4899 | true | **3749.50** |
| PLP-Slim Booster Lipo-C with B12 | 2499 | null | false | **1249.50** |

None of these products have rows in `product_variations`, so product-level
pricing is the only path — no caching or deploy issue was involved.

Root cause: `getPromoUnitPrice` (`src/lib/bundlePricing.ts`) returned
`min(list × PROMO_88_RATE, salePrice)`. The 8.8 promo window (Aug 7 00:00 →
Aug 10 00:00 PHT) was live, and a flat 50% off list is deeper than every
price merchandising had typed, so the promo silently won and the admin edits
were invisible for the whole window. This was intentional, prior behaviour,
locked in by a test named *"ignores a shallower per-product sale price and
halves base instead"*.

## Decision

The user chose: **an active admin sale price wins, and the promo skips that
SKU entirely.** Recorded interpretation of "skips entirely": the SKU prices
exactly as it would outside the promo window, so the bundle-quantity schedule
and admin-pinned tier prices resume for it too. This is asserted directly by
*"resumes the bundle-quantity schedule for an opted-out SKU"*.

## User journeys

1. As merchandising, I want the sale price I type in admin to be the price
   customers see, so my pricing decisions are not silently overridden.
2. As merchandising, I want a sale price I have switched **off** to stay off,
   so a stored-but-inactive price never leaks to the storefront.
3. As a customer, I want SKUs with no sale price to still get the 8.8 promo,
   so the sitewide sale is honoured where nothing more specific applies.
4. As a customer, I want the price on the card, PDP, cart, and checkout to
   agree, so the total never changes as I move through the funnel.

## Task report

### Task 1 — Reproduce the bug as a failing test

Added a fixture mirroring the live PLP-Slim 15mg row (base 3999, sale 2499,
active) plus variation-level, inactive-sale, and quantity cases.

Validation command: `npx vitest run src/test/bundlePricing.test.ts`

RED output (6 failed | 41 passed of 47):

```
> shows the admin sale price for a live PLP-Slim SKU during the promo
  AssertionError: expected 1999.5 to be 2499
> honours an active per-product sale price instead of halving base
  AssertionError: expected 1250 to be 2000
> honours an active sale price set on the chosen variation
  AssertionError: expected 1500 to be 2100
> charges the admin sale price for a single bottle of an opted-out SKU
  AssertionError: expected 1999.5 to be 2499
> resumes the bundle-quantity schedule for an opted-out SKU
  AssertionError: expected 1999.5 to be close to 2249.1
> claims no extra saving on a single bottle of an opted-out SKU
  AssertionError: expected 1999.5 to be 2499
```

All six failures are the intended business-logic gap — no syntax, setup, or
dependency errors.

### Task 2 — Minimal fix

Added a non-exported `hasActiveSalePrice(product, variation)` predicate and
used it in two places:

- `getPromoUnitPrice` returns the regular unit price when the SKU has a live
  sale price, instead of `min()`-ing against half of list.
- `getEffectiveUnitPrice` only takes the promo branch when the SKU is not
  opted out, so opted-out SKUs fall through to the regular path.

The predicate is evaluated against the **chosen variation** when one is
given, since the variation — not its parent product — is what is bought.

The old `min()` floor guard became redundant: a clearance SKU priced deeper
than half of list is honoured by the same opt-out branch, still proven by
*"never raises a price above an already-deeper sale price"*.

GREEN output: `47 passed (47)`.

### Task 3 — Update consumer tests to the new spec

`src/test/useCart.test.ts` and `src/test/MenuItemCard.test.tsx` each encoded
the old precedence and failed against the new spec. Both were rewritten to
assert the new behaviour (they were not weakened to pass — the assertions
changed because the specification changed, per the decision above).

### Task 4 — Coverage hardening

Added two cases found by branch inspection rather than by failure:

- Sale toggle on with **no** price typed (`discount_active: true`,
  `discount_price: null`) — not a usable price, so the promo still applies.
- An `it.each` table pinned to all six real PLP-Slim rows, asserting the
  exact storefront price for each.

Both passed on first run, as expected — they guard already-correct branches.

## Test specification

| # | What is guaranteed | Test file / name | Type | Result | Evidence |
|---|---|---|---|---|---|
| 1 | A live admin sale price is what the storefront charges during the promo | `src/test/bundlePricing.test.ts:shows the admin sale price for a live PLP-Slim SKU during the promo` | unit | PASS | `npx vitest run src/test/bundlePricing.test.ts` |
| 2 | A shallower sale price is honoured, not undercut by the flat 50% | `bundlePricing.test.ts:honours an active per-product sale price instead of halving base` | unit | PASS | same |
| 3 | A sale price on the chosen variation opts that variation out | `bundlePricing.test.ts:honours an active sale price set on the chosen variation` | unit | PASS | same |
| 4 | A parent's sale price does not leak onto a variation being bought | `bundlePricing.test.ts:still halves the variation price when only the parent product is on sale` | unit | PASS | same |
| 5 | A stored but switched-off sale price does not opt the SKU out | `bundlePricing.test.ts:still halves base when a stored sale price is switched off` | unit | PASS | same |
| 6 | A sale toggle with no price typed does not opt the SKU out | `bundlePricing.test.ts:still halves base when the sale toggle is on but no price was typed` | unit | PASS | same |
| 7 | A clearance price deeper than 50% is never raised by the promo | `bundlePricing.test.ts:never raises a price above an already-deeper sale price` | unit | PASS | same |
| 8 | SKUs with no sale price still get the flat 50% | `bundlePricing.test.ts:halves the base price during the promo` | unit | PASS | same |
| 9 | An opted-out SKU resumes the bundle-quantity schedule (10% / 15%) | `bundlePricing.test.ts:resumes the bundle-quantity schedule for an opted-out SKU` | unit | PASS | same |
| 10 | An opted-out SKU shows no bogus 0% saving badge | `bundlePricing.test.ts:claims no extra saving on a single bottle of an opted-out SKU` | unit | PASS | same |
| 11 | All six live PLP-Slim rows price exactly as tabulated above | `bundlePricing.test.ts:live PLP-Slim line during the 8.8 promo` (`it.each`, 6 cases) | unit | PASS | same |
| 12 | The promo still expires on its own at Aug 10 00:00 PHT with no deploy | `bundlePricing.test.ts:expires at Aug 10 00:00 PHT without a deploy` | unit | PASS | same |
| 13 | The cart charges the admin sale price for an opted-out SKU | `src/test/useCart.test.ts:charges the admin sale price rather than halving base` | integration | PASS | `npx vitest run` |
| 14 | The kit upgrade fee is added undiscounted on top of an opted-out price | `useCart.test.ts:adds the kit upgrade fee undiscounted on top of the promo price` | integration | PASS | same |
| 15 | The product card renders the admin sale price and a correct % badge | `src/test/MenuItemCard.test.tsx:shows the admin sale price rather than halving base` | component | PASS | same |
| 16 | Free shipping still unlocks at 3+ bottles (perk, not a price discount) | `bundlePricing.test.ts:still unlocks at 3+ bottles` | unit | PASS | same |

## Coverage and known gaps

Full suite: `npx vitest run` → **Test Files 1 failed | 46 passed (47)**,
**Tests 1 failed | 522 passed (523)**.

Production build verified: `npx vite build` → `✓ built in 3.25s`.

Known gaps, stated rather than papered over:

- **No coverage percentage was measured.** `npx vitest run --coverage` fails
  with `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`. The
  dependency was not installed, since adding one was outside what was asked.
  Every branch of the changed code is covered by a named test above (rows
  1–11), but the 80% threshold is unverified numerically for this run.
- **One pre-existing unrelated failure:** `ResearchBlog index > renders the
  library hero heading`. Confirmed failing on the clean tree via `git stash`
  *before* this change, so it is not a regression from this work. Untouched
  and still failing.
- **Pre-existing type errors in test fixtures.** `npx tsc --noEmit -p
  tsconfig.app.json` reports drift in several `src/test/*` files (missing
  `cost`, `description_font_family`, and similar `Product` fields, plus unused
  `React` imports). None are in `src/lib/bundlePricing.ts` and none were
  introduced here. Not fixed.
- **Not verified against the deployed storefront.** Correctness rests on the
  unit/integration tests plus the live-row table in test #11, not on a browser
  check of production.

## Merge evidence

If these checkpoints are squashed, preserve:

- **RED** (`e05a5c6`): 6 failed | 41 passed — admin sale price 2499 rendered
  as 1999.50 for the live PLP-Slim 15mg row.
- **GREEN** (`dbd1933`): bundlePricing 47/47; full suite 515/516 with the one
  pre-existing `ResearchBlog` failure.
- **Hardening**: +7 tests (empty-sale-price branch, six-row live table);
  bundlePricing 54/54; full suite 522/523.
