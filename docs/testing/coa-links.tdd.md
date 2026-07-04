# TDD Evidence: COA links for products (Tirzepatide 30mg)

**Source plan:** inline `/ecc:plan` output (multiple COA links, admin-managed). Journeys derived during this TDD run.
**Date:** 2026-07-05

## User journeys
1. As a shopper, I want to open a product's Certificate of Analysis documents (Purity Test, Heavy Metal Testing) so I can verify quality.
2. As an admin, I want to add / edit / remove named COA links per product so the COA button points to the right documents.
3. As the store, existing products with a single legacy `coa_url` must keep working unchanged.

## RED → GREEN cycle
- **RED:** `npx vitest run src/test/coa.test.ts src/test/CoaButton.test.tsx` → 2 files failed: `Failed to resolve import "../lib/coa"` and `../components/ui/CoaButton` (modules not yet implemented). Commit `9642b15`.
- **GREEN (units):** implemented `CoaLink` type, `src/lib/coa.ts`, `src/components/ui/CoaButton.tsx` → same command 12/12 pass. Commit `7f60c98`.
- **GREEN (wiring):** wired into `MenuItemCard`, `ProductDetailModal`, `AdminDashboard`, `useMenu`, `supabase.ts` types, migration + card integration test → full suite 337/337 pass, `npm run build` OK, `npx tsc --noEmit` clean. Commit `f8a223d`.

## Test specification
| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | `isSafeUrl` accepts http/https, rejects `javascript:`/`data:`/malformed | `src/test/coa.test.ts` | unit | PASS |
| 2 | `getCoaLinks` returns named links, trims, drops empty-label/unsafe-url rows | `src/test/coa.test.ts` | unit | PASS |
| 3 | `getCoaLinks` falls back to legacy `coa_url` as one labeled link; empty when none | `src/test/coa.test.ts` | unit | PASS |
| 4 | `getCoaLinks` tolerates a missing `coa_links` field (legacy cached rows) | `src/test/coa.test.ts` | unit | PASS |
| 5 | `CoaButton` 0 links → disabled control | `src/test/CoaButton.test.tsx` | component | PASS |
| 6 | `CoaButton` 1 link → direct `target=_blank rel=noopener noreferrer` anchor | `src/test/CoaButton.test.tsx` | component | PASS |
| 7 | `CoaButton` 2+ links → menu revealing each labeled document href on click | `src/test/CoaButton.test.tsx` | component | PASS |
| 8 | Card shows no COA control when product has no COA | `src/test/MenuItemCard.test.tsx` | component | PASS |
| 9 | Card renders single legacy COA link and multi-link COA menu | `src/test/MenuItemCard.test.tsx` | component | PASS |

## Validation commands (actually run)
- `npm test` → Test Files 32 passed, Tests 337 passed.
- `npm run build` → built in ~3.6s, no errors.
- `npx tsc --noEmit` → 0 errors.

## Known gaps / follow-ups
- **Migration not yet applied to the remote Supabase DB.** `supabase/migrations/20260705000000_add_coa_links.sql` adds the `coa_links jsonb` column and seeds Tirzepatide 30mg (`WHERE name ILIKE '%tirzepatide%30%mg%'`). Until applied, the storefront/admin will not show the seeded links. Verify the exact product name matches before applying.
- No E2E/visual-regression added; covered by component tests + manual admin check.
