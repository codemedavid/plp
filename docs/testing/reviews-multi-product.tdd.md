# TDD Evidence: Reviews ↔ Multiple Products

**Feature:** One review can be linked to multiple products (true many-to-many),
replacing the previous per-product duplicate-row workaround.

**Source plan:** Journeys derived during this TDD run from the request
*"i want the review to be able to connect with multiple products"*.

## User Journeys

1. As an admin, I post one review and link it to several products, so the same
   review (and its rating) appears on every chosen product page.
2. As an admin, I edit a review and change which products it links to, so the
   change is reflected everywhere at once (no duplicate rows).
3. As a customer, I review a delivered item and the order page marks that item
   (and any product the review links to) as already reviewed.

## Approach

The bug-prone logic — aggregating a review's product ids from joined junction
rows, and computing the minimal add/remove set when links change — was extracted
into pure functions (`src/lib/reviews.ts`) and driven by tests. Database wiring,
hook, and component changes are integration-level and verified by typecheck +
build + the proven helpers.

## RED → GREEN

| Stage | Command | Result |
|---|---|---|
| RED | `npx vitest run src/test/reviews.test.ts` | FAIL — `Cannot resolve ../lib/reviews` (module not yet created; compile-time RED) |
| GREEN | `npx vitest run src/test/reviews.test.ts` | PASS — 11/11 after implementing `src/lib/reviews.ts` |
| Full suite | `npx vitest run` | PASS — 223/223 (18 files) |
| Typecheck | `npx tsc --noEmit` | PASS — exit 0 |
| Build | `npx vite build` | PASS — built in ~2.9s |

## Test Specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Product ids are read from junction rows | `reviews.test.ts › extractProductIds › returns product ids from the junction rows` | unit | PASS |
| 2 | Duplicate junction ids are deduped | `extractProductIds › dedupes repeated junction product ids` | unit | PASS |
| 3 | Falls back to legacy `product_id` when no junction rows | `extractProductIds › falls back to the legacy single product_id` | unit | PASS |
| 4 | Falls back when `review_products` missing entirely | `extractProductIds › falls back ... when review_products is missing` | unit | PASS |
| 5 | Empty when neither junction nor legacy id exist | `extractProductIds › returns an empty array ...` | unit | PASS |
| 6 | Junction rows take priority over legacy id | `extractProductIds › prefers junction rows over the legacy product_id` | unit | PASS |
| 7 | Added products computed on update | `diffProductLinks › detects products to add` | unit | PASS |
| 8 | Removed products computed on update | `diffProductLinks › detects products to remove` | unit | PASS |
| 9 | No-op when link sets are identical (order-insensitive) | `diffProductLinks › reports no changes ...` | unit | PASS |
| 10 | All-add when current is empty | `diffProductLinks › adds everything when current is empty` | unit | PASS |
| 11 | All-remove when next is empty | `diffProductLinks › removes everything when next is empty` | unit | PASS |

## Database

- Migration `supabase/migrations/20260628000000_reviews_multi_product.sql`
  creates `review_products(review_id, product_id, created_at, PK(review_id, product_id))`
  with cascade FKs and indexes, and backfills from `reviews.product_id`.
- Applied to the live project; backfill verified: `reviews_with_legacy_product = 1`,
  `junction_rows = 1`.
- Rollback: `drop table public.review_products;` (the legacy `reviews.product_id`
  column is untouched).

## Known Gaps / Notes

- The pure link helpers are unit-tested. The hook query wiring and admin/customer
  UI were verified by typecheck + build, not by automated DB/component tests
  (Supabase query-builder mocking carries low signal here). Manual verification of
  journeys 1–3 in the admin panel / product page is the remaining check.
- Pre-existing duplicated reviews (created by the old per-product workaround)
  remain separate single-product rows; they are not auto-merged.
- **Security:** `reviews`, `products`, and 10 other tables have RLS **disabled**
  project-wide (Supabase advisory `rls_disabled`, level critical). The new
  `review_products` table matches that posture intentionally. Enabling RLS with
  policies is a separate, project-wide decision and was not changed here.
