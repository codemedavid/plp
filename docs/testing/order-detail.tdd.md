# TDD Evidence — Order Detail Screen (Admin)

**Source design:** `Order Detail.dc.html` (Claude Design project `6e7274cf…`), imported via the design MCP.
**Plan:** Reskin the admin order-detail view to the new design; replace the inline `OrderDetailsView` in `OrdersManager.tsx` with an extracted, redesigned component. No backend/schema changes.

## User Journeys
- As an admin, I open an order and see its number, customer, items, and totals.
- As an admin, I copy any customer/address field (or all of it) to paste into a courier booking.
- As an admin, I set courier + tracking number + note and save it.
- As an admin, I confirm a new order (deduct stock) or change its status.

## Task Report
| Task | Summary | Validation | Result |
|---|---|---|---|
| Extract types | Moved `Order`/`OrderItem` to `src/components/orders/types.ts` | `tsc --noEmit` | PASS (no errors in changed files) |
| Clipboard helpers | `copyText`, `buildAddressText`, `buildBookingText` | `vitest run src/test/orderClipboard.test.ts` | RED (module missing) → GREEN 6/6 |
| OrderDetailsView | Redesigned component to match design, preserving all handlers | `vitest run src/test/OrderDetailsView.test.tsx` | RED (component missing) → GREEN 9/9 |
| Wire-up | Removed 333-line inline view; imported new component | full suite + build | GREEN 212/212, build ✓ |

### RED evidence
- `orderClipboard.test.ts`: `Failed to resolve import ".../orderClipboard"` → 1 file failed, no tests.
- `OrderDetailsView.test.tsx`: `Failed to resolve import ".../OrderDetailsView"` → 1 file failed, no tests.

### GREEN evidence
- `orderClipboard.test.ts`: 6 passed.
- `OrderDetailsView.test.tsx`: 9 passed (after switching clipboard assertions to a `copyText` module spy — `userEvent.setup()` installs its own `navigator.clipboard`).
- Full suite: **17 files, 212 tests passed**. `npm run build`: ✓ built in ~3s.

## Test Specification
| # | Guarantee | Test | Type | Result |
|---|---|---|---|---|
| 1 | Address text joins street/barangay/city/postal/region, omitting empty lines | `orderClipboard.test.ts` | unit | PASS |
| 2 | Booking text includes name, phone, email, address | `orderClipboard.test.ts` | unit | PASS |
| 3 | `copyText` resolves true/false on success/failure/unavailable clipboard | `orderClipboard.test.ts` | unit | PASS |
| 4 | Renders order number, customer, item | `OrderDetailsView.test.tsx` | component | PASS |
| 5 | Back button calls `onBack` | `OrderDetailsView.test.tsx` | component | PASS |
| 6 | Per-field + "copy all for booking" copy the right text | `OrderDetailsView.test.tsx` | component | PASS |
| 7 | Save Tracking calls `onSaveTracking(id, tracking, provider, note)` | `OrderDetailsView.test.tsx` | component | PASS |
| 8 | Confirm calls `onConfirm`; status change calls `onUpdateStatus` | `OrderDetailsView.test.tsx` | component | PASS |
| 9 | Payment method/paid badge/total + discount/points rows render | `OrderDetailsView.test.tsx` | component | PASS |

## Known Gaps / Notes
- Pre-existing `tsc` errors in unrelated test fixtures (`cost` field, unused `React` imports across `MenuItemCard`, `posthog-events`, `useCart`, etc.) — not introduced here; build does not run `tsc`.
- Pre-existing lint error `OrdersManager.tsx` `catch (error: any)` in untouched `handleConfirmOrder` (present in HEAD) — left as-is to keep scope tight.
- Visual/responsive regression (320/768/1440) not automated — recommend a manual pass at `/admin → Orders → View Details`.
- Palette implemented faithfully to the design (blue `#2f6fc0` / green `#1f9d57`), which differs from the storefront's gold/navy admin theme.
