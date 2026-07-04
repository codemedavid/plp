-- Review points reward
--
-- Customers earn 50 points (= ₱50) for reviewing a product they purchased.
-- Points are credited through a SECURITY DEFINER RPC so the write bypasses the
-- RLS on points_ledger while still being fully validated server-side:
--   * caller must be signed in (auth.uid())
--   * the order must belong to the caller and be delivered/completed
--   * the product must actually be in that order
--   * a review by the caller for that order+product must exist
--   * credited at most once per (user, order, product) — idempotent
--
-- Guests (order-number lookup without signing in) simply earn nothing; the
-- client nudges them to sign in instead.

-- 1. Track which product a ledger row was earned against (for per-product dedup).
alter table public.points_ledger
  add column if not exists source_product_id uuid references public.products(id) on delete set null;

-- 2. One review reward per (user, order, product).
create unique index if not exists idx_points_ledger_review_uniq
  on public.points_ledger(user_id, source_order_id, source_product_id)
  where reason = 'review';

-- 3. Award function.
create or replace function public.award_review_points(p_order_id uuid, p_product_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_reward  constant int := 50;
  v_awarded int;
begin
  -- Guests can't collect points.
  if v_user is null then
    return 0;
  end if;

  -- The order must belong to the caller and be fulfilled.
  if not exists (
    select 1 from orders o
    where o.id = p_order_id
      and o.user_id = v_user
      and o.order_status in ('delivered', 'completed')
  ) then
    return 0;
  end if;

  -- The product must actually be part of that order.
  if not exists (
    select 1
    from orders o
    cross join lateral jsonb_array_elements(o.order_items) as item
    where o.id = p_order_id
      and (item->>'product_id')::uuid = p_product_id
  ) then
    return 0;
  end if;

  -- A review by this user for this order + product must exist (the thing we reward).
  if not exists (
    select 1 from reviews r
    left join review_products rp on rp.review_id = r.id
    where r.order_id = p_order_id
      and r.user_id = v_user
      and (r.product_id = p_product_id or rp.product_id = p_product_id)
  ) then
    return 0;
  end if;

  -- Credit once. The partial unique index makes repeat calls no-ops.
  insert into points_ledger
    (user_id, delta, reason, source_order_id, source_product_id, status, available_at, notes)
  values
    (v_user, v_reward, 'review', p_order_id, p_product_id, 'available', now(), 'Product review reward')
  on conflict (user_id, source_order_id, source_product_id) where reason = 'review'
  do nothing
  returning delta into v_awarded;

  return coalesce(v_awarded, 0);
end;
$$;

grant execute on function public.award_review_points(uuid, uuid) to authenticated;
