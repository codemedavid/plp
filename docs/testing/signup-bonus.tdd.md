# TDD Evidence — Signup Welcome Bonus (100 points)

**Date:** 2026-07-07
**Source plan:** inline `/ecc:plan` output (this session) — "push users to sign up; award 100 points on signup"
**Scope:** award a one-time, email-confirmation-gated 100-point (₱100) welcome bonus and surface the offer to logged-out visitors.

## User journeys

1. As a logged-out visitor, the welcome popup offers me **100 points (₱100) for signing up**, with a CTA that opens the auth modal — so I have a concrete reason to convert.
2. As a signed-in member, the welcome popup keeps the existing **referral-share** pitch (no regression).
3. As a visitor switching to sign-up in the auth modal, I see the **100-point welcome bonus** promoted.
4. As a newly **email-confirmed** user, my balance shows **exactly 100 points, once**, redeemable at checkout.

## Task report

### Frontend copy (journeys 1–3) — unit, Vitest
- **Summary:** Added `src/lib/rewards.ts` (single source for the number), made `WelcomePopup` auth-aware, added a signup-bonus banner to `AuthModal`.
- **RED:** `npx vitest run rewards WelcomePopup AuthModal` → `3 failed | 2 passed` (bonus copy + auth branching absent; failures caused by missing implementation, not setup).
- **GREEN:** same command → `3 files / 7 tests passed`.
- **Full suite:** `npx vitest run` → `415 passed | 1 failed`. The 1 failure is pre-existing `src/test/ResearchBlog.test.tsx` ("renders the library hero heading"), unrelated — fails in isolation and imports only `components/research/ResearchBlog`.
- **Build:** `npm run build` → exit 0.
- **Guarantee:** logged-out users are shown the 100/₱100 offer and can open auth; signed-in users still get the referral pitch; auth modal promotes the bonus only in sign-up mode.

### DB award (journey 4) — integration, isolated transaction (branch unavailable in session)
- **Summary:** `award_signup_bonus()` + `on_auth_user_signup_bonus` trigger credit 100 pts as `available` once, after email confirmation, gated by `referral_config.signup_bonus_enabled`.
- **Why not a branch:** Supabase branch creation needs a `confirm_cost` step whose tool is not exposed in this MCP session, so the migration + a full test scenario were run inside a single `BEGIN … ROLLBACK` transaction on the prod connection (nothing committed).
- **Validation run** (unconfirmed insert → confirm → re-touch):

  | Assertion | Expected | Actual |
  |---|---|---|
  | bonus rows after full scenario | 1 | 1 |
  | bonus points | 100 | 100 |
  | ledger status | available | available |
  | redeemable balance | 100 | 100 |

  → unconfirmed insert did **not** award; confirmation awarded exactly 100; re-touch stayed **idempotent** (not 200).
- **Isolation proof:** post-run check of `information_schema.columns` / `pg_indexes` / `pg_proc` / `pg_trigger` / `auth.users` / `points_ledger` all returned `false` — the ROLLBACK fully took; production unchanged.

## Test specification

| # | What is guaranteed | Test file / command | Type | Result | Evidence |
|---|--------------------|---------------------|------|--------|----------|
| 1 | Default bonus is 100 pts = ₱100 | `src/test/rewards.test.ts` | unit | PASS | `vitest run rewards.test.ts` |
| 2 | Logged-out popup offers 100 pts and opens auth | `src/test/WelcomePopup.test.tsx` | unit | PASS | `vitest run WelcomePopup.test.tsx` |
| 3 | Signed-in popup keeps referral pitch, hides bonus | `src/test/WelcomePopup.test.tsx` | unit | PASS | same |
| 4 | Auth modal promotes bonus only in sign-up mode | `src/test/AuthModal.test.tsx` | unit | PASS | `vitest run AuthModal.test.tsx` |
| 5 | Confirmed user awarded exactly 100 pts, once, redeemable | dry-run transaction via Supabase MCP | integration | PASS | assertion table above |
| 6 | Unconfirmed signup awards nothing (abuse gate) | dry-run transaction | integration | PASS | bonus rows = 1 (only after confirm) |

## Coverage & known gaps
- Vitest coverage not separately collected (no `test:coverage` script); new logic is covered by tests 1–6.
- Pre-existing failing `ResearchBlog.test.tsx` and pre-existing `tsc` errors in unrelated test files (`posthog-events`, `useCart`, `types`, `MetricCard`, …) are **not** introduced by this change and are out of scope.
- **Not yet applied to production.** Migration `supabase/migrations/20260707000000_signup_bonus.sql` is written and dry-run-verified but awaiting explicit approval to apply to the live DB.

## Files changed
- `src/lib/rewards.ts` (new)
- `src/components/WelcomePopup.tsx`
- `src/components/AuthModal.tsx`
- `src/test/rewards.test.ts`, `src/test/WelcomePopup.test.tsx`, `src/test/AuthModal.test.tsx` (new)
- `supabase/migrations/20260707000000_signup_bonus.sql` (new — pending apply)
