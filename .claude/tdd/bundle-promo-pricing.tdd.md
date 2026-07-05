# TDD Evidence: Automatic Bundle Promo Pricing

**Date:** 2026-07-05
**Source plan:** inline `/ecc:plan` output (approved in-session), implemented via `/ecc:tdd-workflow`

## User journeys
1. As a shopper, when I add 2 bottles of a product I automatically pay 10% less, without the admin configuring a bundle price.
2. As a shopper, when I add 3+ bottles I automatically pay 15% less.
3. As a shopper, when my cart holds 3+ bottles total, shipping is free at checkout.
4. As a shopper below 3 bottles, the cart nudges me: "Add N more products to get your free shipping."
5. As an admin, I no longer type bundle prices; an entered price still overrides the automatic discount.

## Behavior change (RED → GREEN)
- **RED:** `npx vitest run src/test/bundlePricing.test.ts src/test/useCart.test.ts` → 19 failed / 38 passed. New pricing functions absent; `useCart` totals still `7500`/`7650` (old no-discount spec) vs new `6375`/`7150`.
- **GREEN (after implementing `src/lib/bundlePricing.ts`):** same command → 57/57 passed.
- **Full suite:** `npx vitest run` → 334/334 passed. `npx tsc --noEmit` → 0 errors. `npm run build` → built successfully.

## Test specification
| # | Guarantee | Test | Type | Result |
|---|-----------|------|------|--------|
| 1 | Discount schedule: 1→0%, 2→10%, 3+→15% (open-ended) | `bundlePricing.test.ts:getBundleDiscountRate` | unit | PASS |
| 2 | Per-unit price applies auto discount; sale price stacks; kit fee added after | `bundlePricing.test.ts:getEffectiveUnitPrice` | unit | PASS |
| 3 | Admin tier price overrides auto discount | `bundlePricing.test.ts:...override the auto discount` | unit | PASS |
| 4 | Savings totals + % for strikethrough display | `bundlePricing.test.ts:getBundleSavings` | unit | PASS |
| 5 | Free shipping unlocks at 3 bottles cart-wide | `bundlePricing.test.ts:qualifiesForFreeShipping` | unit | PASS |
| 6 | Cart totals reflect auto bundle discount | `useCart.test.ts:getTotalPrice` | unit | PASS |

## Files changed
- `src/lib/bundlePricing.ts` — `getBundleDiscountRate`, `getBundleSavings`, `qualifiesForFreeShipping`, `FREE_SHIPPING_MIN_QTY`; auto discount in `getEffectiveUnitPrice` (admin price still wins).
- `src/components/ProductDetailModal.tsx` — per-tier auto price + SAVE% + "+ FREE SHIPPING" on 3+.
- `src/components/Cart.tsx` — shared savings helper; free-shipping progress nudge.
- `src/components/Checkout.tsx` — waive shipping fee at 3+; "FREE"/"Free shipping unlocked" indicators.
- `src/components/AdminDashboard.tsx` — price field placeholder/tooltip: blank = automatic.
- `src/test/bundlePricing.test.ts` (new), `src/test/useCart.test.ts` (updated expectations).

## Coverage / gaps
No coverage script configured; the new pricing module is fully unit-covered (all exported functions + branches). UI wiring verified via tsc + build; no automated visual/E2E added this pass — a manual/Playwright check of the PDP box, cart nudge, and checkout ₱0 shipping is the recommended follow-up.
