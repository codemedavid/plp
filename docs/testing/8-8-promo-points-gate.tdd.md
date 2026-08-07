# TDD Evidence: 8.8 Sitewide Promo + Points Redemption Gate

**Date:** 2026-08-07
**Branch:** `feat/blog-post-6-why-others-lose-more`
**Source plan:** none on disk — journeys were derived during this TDD run from the
request "all products apply 50% off as our 8.8 promo and if user have points
balance they should spend atleast 3,999 after promo total to use their points".

## Decisions taken before implementation

| Decision | Choice |
|---|---|
| Stacking | Promo applies to **base price only**; bundle-quantity discounts and per-product sale prices are **suspended** during the window. Deepest possible discount is 50%. |
| Gate basis | Post-promo subtotal **after** promo code, **before** shipping. |
| Control | Hardcoded date window in `bundlePricing.ts`, auto-expiring with no deploy. |
| Window | Started at Aug 7 → Aug 11; **subsequently narrowed to Aug 7 00:00 → Aug 10 00:00 PHT (Aug 9 is the last selling day)** in commit `379ae84`, with the customer email corrected to match in `b887428`. |

Two assumptions were stated and left in place: free shipping at 3+ bottles stays
active during the promo (it keys off cart quantity, not price), and the flat
`KIT_UPGRADE_PRICE` add-on is not discounted (matching prior treatment).

## Pre-implementation data verification

Checked against the live database before writing code, because the stacking
decision is only safe if the promo never raises a price:

- All 12 available products and all 5 with `bundle_tiers` are **cheaper** under
  the flat 50% than under their best existing price. Worst case checked:
  PLP-Slim 15mg x3 tier P8,500 -> promo P5,998.50.
- Only one product has `discount_active = true` (PLP Slim & Glow Bundle,
  P7,499 -> P6,999); promo price P3,750 is deeper, so no regression.
- A `Math.min` floor guard was still implemented as insurance, since catalog
  data can change mid-window.

## User journeys

1. As a shopper, I see 50% off every product during the promo window.
2. As a shopper, the catalog grid, product page, cart and checkout all show the
   same price.
3. As a member with points, I can redeem only when the post-promo subtotal
   reaches P3,999, and otherwise I see how much more to spend.
4. As the business, the promo expires on its own with no deploy.
5. As the business, the server rejects redemptions that break the gate or
   exceed the customer's balance.

## Task report

### Task 1 — Promo pricing engine (`src/lib/bundlePricing.ts`)

Added `PROMO_88_RATE`, the window constants, `isPromo88Active()` and
`getPromoUnitPrice()`; `getEffectiveUnitPrice`/`getBundleSavings` gained an
injectable `now`. `getRegularUnitPrice` was deliberately left as the *pre-promo
list price* so the strikethrough has something to strike.

- **RED:** `npx vitest run src/test/bundlePricing.test.ts src/test/pointsRedemption.test.ts`
  -> `16 failed | 23 passed`. Representative failure:
  `AssertionError: expected 15 to be 50` — the bundle quantity discount was
  still applying where the promo must replace it.
- **GREEN:** same command -> `54 passed`.
- **Guarantee:** during the window every product is exactly 50% off list,
  regardless of quantity or admin tier price, and never priced above an
  already-deeper clearance price.

### Task 2 — Points gate helper (`src/lib/pointsRedemption.ts`)

- **RED:** compile-time —
  `Error: Failed to resolve import "../lib/pointsRedemption" from "src/test/pointsRedemption.test.ts"`.
- **GREEN:** `54 passed` (combined run above).
- **Guarantee:** redemption is zero below P3,999 and otherwise capped by both
  balance and order value, with NaN/negative inputs treated as zero.

### Task 3 — Unify catalog display

`MenuItemCard` and `ProductDetailModal` each re-implemented the
`discount_active ? discount_price : base_price` rule inline rather than calling
`bundlePricing`. Left alone, the promo would have halved cart and checkout
prices while the grid and PDP still showed full list price.

- **RED:** `npx vitest run src/test/MenuItemCard.test.tsx` -> `3 failed | 19 passed`.
- **GREEN:** `npx vitest run src/test/MenuItemCard.test.tsx src/test/bundlePricing.test.ts src/test/pointsRedemption.test.ts`
  -> `76 passed`.
- **Guarantee:** one pricing source feeds card, PDP, cart and checkout.

### Task 4 — Checkout gate wiring (`src/components/Checkout.tsx`)

Replaced the inline cap at line 143. Also fixed a latent bug found while wiring:
`pointsToRedeem` was clamped on change but never on recompute, so editing the
cart down after applying points left a stale redemption applied. A reset effect
now follows the cap.

- **GREEN:** `npx vitest run` -> `489 passed | 1 failed` (pre-existing).
- **Guarantee:** points cannot be applied below threshold, and cannot survive a
  cart edit that closes the gate.

### Task 5 — Server-side enforcement (`supabase/migrations/`)

`20260807000000_points_min_order.sql` adds a `BEFORE INSERT` trigger enforcing
the threshold and, closing a **pre-existing security hole**, rejecting
redemptions exceeding the customer's balance — `debit_points_for_order()`
previously wrote a ledger debit straight from `orders.points_redeemed` with no
balance check. The gate basis is recomputed from `order_items` rather than
trusting client-supplied `total_price`.

`20260807000001_checkin_debit_points_trigger.sql` checks in
`debit_points_for_order()` itself, which ran in production but appeared in no
migration (verified via `pg_trigger` / `pg_get_functiondef`).

**Neither migration has been applied to the remote project.** They are checked
in only — see Known gaps.

### Task 6 — Merchandising (`src/components/PromoBanner.tsx`)

Added an 8.8 slide, filtered out by `isPromo88Active()` so the banner stops
advertising the sale the moment it ends.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Promo inactive before the window, active from Aug 7 00:00 PHT, expires without a deploy | `bundlePricing.test.ts:isPromo88Active` | unit | PASS |
| 2 | Every product is 50% off list during the window | `bundlePricing.test.ts:getPromoUnitPrice` | unit | PASS |
| 3 | Quantity discounts do NOT stack (no 57.5% off at 3 bottles) | `bundlePricing.test.ts:getEffectiveUnitPrice (during the 8.8 promo)` | unit | PASS |
| 4 | Admin-pinned tier prices are suspended during the promo | same block | unit | PASS |
| 5 | Live PLP-Slim 15mg tier prices are all beaten by the promo | same block, real-data regression | unit | PASS |
| 6 | The promo never raises an already-deeper clearance price | `getPromoUnitPrice:never raises a price` | unit | PASS |
| 7 | Strikethrough shows the full 50% saving | `getBundleSavings (during the 8.8 promo)` | unit | PASS |
| 8 | Free shipping still unlocks at 3+ bottles during the promo | `free shipping during the 8.8 promo` | unit | PASS |
| 9 | Points locked at P3,998, unlocked at P3,999 | `pointsRedemption.test.ts:getMaxRedeemablePoints` | unit | PASS |
| 10 | Gate measured after promo code, not before | same block | unit | PASS |
| 11 | Redemption capped by balance and by order value; NaN/negative safe | same block | unit | PASS |
| 12 | Shortfall nudge reports the correct remaining amount | `getPointsGateShortfall` | unit | PASS |
| 13 | Card price halves during promo and reverts after | `MenuItemCard.test.tsx:8.8 promo pricing` | component | PASS |
| 14 | Card shows a 50% Off badge during the promo | same block | component | PASS |

Commands: `npx vitest run` · `npx tsc --noEmit -p tsconfig.app.json` · `npm run build`

## Coverage and known gaps

Final full run: **493 passed | 1 failed (494)**, up from a **448 passed | 1 failed**
baseline — 45 tests added, all passing.

- **Pre-existing failure, not introduced here:** `ResearchBlog.test.tsx > renders
  the library hero heading` fails at baseline (verified before any change) and
  still fails. Untouched by this work.
- **Type errors unchanged:** `tsc --noEmit` reports 50 errors both before and
  after (verified by stashing). All are prior tech debt — unused-variable
  `TS6133` noise and incomplete test fixtures. `npm run build` is `vite build`
  and does not type-check, so these do not block deploys.
- **Migrations not applied.** Both SQL files are checked in but not run against
  the remote project. Until they are, the P3,999 gate is client-side only and
  the balance hole in `debit_points_for_order()` remains open.
- **No E2E coverage.** The checkout gate is covered by unit tests on the pure
  helper, not by a browser run through a real order. A Playwright journey at
  P3,998 vs P4,000 would be the natural next step.
- **Threshold duplicated.** `POINTS_MIN_ORDER_TOTAL` (TS) and `v_min_order`
  (SQL) must be changed together; there is no shared source.
- **Merchandising consequence, not a defect:** at 50% off, only PLP-Slim 2.0
  (P4,750) clears the P3,999 gate as a single item. PLP Slim & Glow Bundle lands
  at P3,750 — P249 short.

## Merge evidence

Checkpoint commits on this branch, in order:

| Commit | Stage |
|---|---|
| `14bbc0a` | RED — reproducers added, 16 failed \| 23 passed |
| `1cb9ae0` | GREEN — promo engine + points helper, 54 passed |
| `b94b2d1` | GREEN — catalog display unified, 76 passed |
| `6050e7b` | GREEN — checkout gate wired, 489 passed \| 1 pre-existing |
| `03d5d8b` | GREEN — server-side validation + banner, 493 passed \| 1 pre-existing |

If these are squashed, this report is the surviving RED/GREEN record.
