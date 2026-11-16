-- APPLIED 2026-11-17 as migration `referral_config_admin_update`.
-- referral_config had RLS on with only a SELECT policy, so the admin
-- ReferralManager save silently updated 0 rows. Allow admins to update.
create policy rc_admin_update on public.referral_config
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
