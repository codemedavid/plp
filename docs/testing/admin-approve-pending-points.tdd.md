# TDD Evidence — Admin Fast-Approve of Pending Referral Points

**Source plan:** derived inline from `/ecc:plan` output (admin fast-approval of pending referral points) + follow-up scope "pending approvals management also".
**Date:** 2026-07-07

## User Journeys
1. As an admin, I approve a single pending points entry for a user, so it becomes spendable immediately.
2. As an admin, I approve *all* pending points for one user in one click.
3. As an admin, I see a **Pending Approvals** queue of every user with pending points program-wide and approve from there.

## What was built
- **DB:** `supabase/migrations/20260707000000_admin_approve_pending_points.sql` — `admin_approve_pending_points(p_user_id uuid, p_ledger_id uuid default null)`, `SECURITY DEFINER`, gated by existing `is_admin()`, flips `points_ledger` rows `pending → available` and stamps `available_at = now()`. Mirrors `award_review_points`.
- **Util:** `src/utils/pendingApprovals.ts` — pure `groupPendingByUser()`.
- **UI:** `src/components/PendingApprovalsTab.tsx` (new admin queue) wired as a "Pending Approvals" tab in `ReferralManager.tsx`; per-entry + "Approve all pending" controls added to the points-history modal in `UserLookupManager.tsx`.

## RED → GREEN
- **RED:** `npx vitest run src/test/pendingApprovals.test.ts src/test/PendingApprovalsTab.test.tsx src/test/UserLookupManager.test.tsx` → new util/tab specs failed to import (modules absent); 2 new lookup specs failed. Confirmed before writing production code.
- **GREEN:** same command → all pass after implementing the util, tab, and modal controls.

## Test specification
| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | Pending rows group per user; positive deltas summed; empty→[] | `pendingApprovals.test.ts` | unit | PASS |
| 2 | Name falls back nickname→full_name→email→short id; frozen carried; sorted by total desc | `pendingApprovals.test.ts` | unit | PASS |
| 3 | Queue renders one row per user with peso total; empty state | `PendingApprovalsTab.test.tsx` | component | PASS |
| 4 | Frozen users flagged in the queue | `PendingApprovalsTab.test.tsx` | component | PASS |
| 5 | Approving a user calls `admin_approve_pending_points({p_user_id})` and removes them; RPC error keeps them + shows message | `PendingApprovalsTab.test.tsx` | component | PASS |
| 6 | Modal shows Approve only on pending rows; single approve calls RPC with `{p_user_id, p_ledger_id}` | `UserLookupManager.test.tsx` | component | PASS |
| 7 | "Approve all pending" calls RPC with `{p_user_id}` only | `UserLookupManager.test.tsx` | component | PASS |

## Validation commands run
- `npx vitest run src/test/pendingApprovals.test.ts src/test/PendingApprovalsTab.test.tsx src/test/UserLookupManager.test.tsx` → **3 files / 25 tests pass**.
- `npx vitest run` (full) → 412 pass; **4 pre-existing failures** in `ResearchBlog`/`WelcomePopup`/`AuthModal` belong to a separate in-progress "100-point welcome bonus" WIP in the working tree (`src/lib/rewards.ts`, `WelcomePopup.tsx`), unrelated to this change.
- `npx vite build` → **built successfully**.
- `tsc` is not part of the repo build; my four files add no new type errors beyond the repo-wide unused-`React`-import pattern shared by every test file.

## Known gaps / follow-ups
- **Migration not yet applied to the live DB.** The RPC exists only as a migration file; the feature is inert until `admin_approve_pending_points` is deployed to Supabase. Deploying to prod was left for explicit approval.
- **Auto-settle gap (pre-existing, discovered):** the monthly payout function inserts pending rows without `source_order_id`/`available_at`, so `settle_referral_points()` never settles them — admin approval is currently the *only* path to make referral points spendable. Not fixed here; flagged for a decision.
- No E2E/visual coverage added; component behavior covered via RTL.
