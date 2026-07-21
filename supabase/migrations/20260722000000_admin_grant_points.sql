-- Admin manual points grant.
--
-- Lets an admin credit a customer's points balance and name what the points are
-- for. points_ledger has no client INSERT policy (only service role / SECURITY
-- DEFINER writes), so the grant goes through this function, which mirrors the
-- security model of award_review_points / admin_approve_pending_points:
--   * caller must be an admin (public.is_admin())
--   * amount must be a positive integer within a sane ceiling
--   * label (the "what for") must be non-empty; it is stored in notes
--   * credited as immediately-available (status='available', available_at=now())
--     with reason='admin_adjust' — the reason the admin UI already labels as
--     "Admin adjustment" and the balance view counts right away
--
-- Returns the ledger row id of the grant.

create or replace function public.admin_grant_points(
  p_user_id uuid,
  p_amount integer,
  p_label text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_id    uuid;
begin
  -- Only admins may grant points.
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  -- The customer must exist.
  if not exists (select 1 from user_profiles where id = p_user_id) then
    raise exception 'customer not found';
  end if;

  -- Positive whole amount within a sane ceiling (1 point = P1, so guard the
  -- fat-finger case). Mirrors the client-side validateGrantPoints bounds.
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;
  if p_amount > 1000000 then
    raise exception 'amount exceeds the maximum grant';
  end if;

  -- The admin must name what the points are for.
  if v_label = '' then
    raise exception 'a reason is required';
  end if;

  insert into points_ledger
    (user_id, delta, reason, status, available_at, notes)
  values
    (p_user_id, p_amount, 'admin_adjust', 'available', now(), v_label)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_grant_points(uuid, integer, text) to authenticated;
