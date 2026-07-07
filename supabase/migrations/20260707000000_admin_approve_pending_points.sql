-- Admin fast-approval of pending referral points.
--
-- Referral payouts land in points_ledger with status='pending'. Normally they
-- wait before becoming spendable. This RPC lets an admin approve them
-- immediately so the referrer doesn't have to wait.
--
-- Security model mirrors award_review_points: a SECURITY DEFINER function that
-- bypasses the points_ledger RLS (which has no UPDATE policy) but is fully gated
-- server-side:
--   * caller must be an admin (public.is_admin())
--   * only 'pending' rows are touched
--   * p_ledger_id (optional) approves a single entry; otherwise every pending
--     entry for p_user_id is approved
--   * available_at is stamped to now() so the balance view counts it right away
--   * returns the number of ledger rows flipped
--
-- Idempotent: re-running approves nothing new (no pending rows left).

create or replace function public.admin_approve_pending_points(
  p_user_id uuid,
  p_ledger_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Only admins may approve points.
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  with approved as (
    update points_ledger
    set status = 'available',
        available_at = now()
    where user_id = p_user_id
      and status = 'pending'
      and (p_ledger_id is null or id = p_ledger_id)
    returning id
  )
  select count(*) into v_count from approved;

  return v_count;
end;
$$;

grant execute on function public.admin_approve_pending_points(uuid, uuid) to authenticated;
