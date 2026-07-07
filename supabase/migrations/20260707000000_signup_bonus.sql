-- Signup welcome bonus
--
-- New members earn a one-time welcome bonus (default 100 points = ₱100) once
-- their email is confirmed. Mirrors award_review_points:
--   * credited through a SECURITY DEFINER path so it bypasses points_ledger RLS
--     while staying fully validated server-side
--   * gated on a confirmed email (abuse guard against throwaway signups)
--   * credited at most once per user (idempotent via partial unique index)
--   * status = 'available' so it counts toward the redeemable balance immediately
--     and can be applied at checkout on the first order
--   * amount + on/off switch live in referral_config so admin can tune/disable it
--
-- 1 pt = ₱1. Points can only be *withdrawn* after a monthly order (existing rule),
-- so farmed bonuses cannot be cashed out — they can only offset a real purchase.

-- ============================================================================
-- 1. Config: amount + toggle (admin-editable, single-row referral_config)
-- ============================================================================
alter table public.referral_config
  add column if not exists signup_bonus_points  int     not null default 100,
  add column if not exists signup_bonus_enabled boolean not null default true;

-- ============================================================================
-- 2. One welcome bonus per user (idempotency guard for double-fired triggers)
-- ============================================================================
create unique index if not exists idx_points_ledger_signup_uniq
  on public.points_ledger(user_id)
  where reason = 'signup_bonus';

-- ============================================================================
-- 3. Award function — validated, idempotent credit
-- ============================================================================
create or replace function public.award_signup_bonus(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmed boolean;
  v_points    int;
  v_enabled   boolean;
  v_awarded   int;
begin
  if p_user is null then
    return 0;
  end if;

  -- Abuse gate: only credit a real, email-confirmed account.
  select (email_confirmed_at is not null) into v_confirmed
    from auth.users where id = p_user;
  if not coalesce(v_confirmed, false) then
    return 0;
  end if;

  select signup_bonus_points, signup_bonus_enabled
    into v_points, v_enabled
    from referral_config where id = 1;

  if not coalesce(v_enabled, false) or coalesce(v_points, 0) <= 0 then
    return 0;
  end if;

  -- Credit once. The partial unique index makes repeat calls no-ops.
  insert into points_ledger
    (user_id, delta, reason, status, available_at, notes)
  values
    (p_user, v_points, 'signup_bonus', 'available', now(), 'Signup welcome bonus')
  on conflict (user_id) where reason = 'signup_bonus'
  do nothing
  returning delta into v_awarded;

  return coalesce(v_awarded, 0);
end;
$$;

-- ============================================================================
-- 4. Trigger — award when the email becomes confirmed
--    Fires on the confirmation UPDATE (confirm-required flow) and on INSERT
--    when the row is already confirmed (confirm-disabled / admin-created).
--    Failure is non-fatal so it can never block account creation.
-- ============================================================================
create or replace function public.trg_award_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform public.award_signup_bonus(new.id);
  end if;
  return new;
exception when others then
  raise warning 'award_signup_bonus trigger failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signup_bonus on auth.users;
create trigger on_auth_user_signup_bonus
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.trg_award_signup_bonus();
