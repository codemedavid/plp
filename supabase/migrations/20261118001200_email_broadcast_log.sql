-- ============================================================================
-- APPLIED to the live DB on 2026-11-17 (migration "email_broadcast_log").
-- Originally written as 20260807000002_email_broadcast_log.sql but never
-- applied. Renamed here so it is not applied twice.
--
-- Changes vs the original repo file:
--   * Added an admin-only SELECT policy (send history visible to is_admin()).
--     The original had RLS on with no policies (service-role only).
--   * Table privileges revoked from anon entirely and narrowed to SELECT for
--     authenticated, so even a future permissive policy cannot expose writes.
--   * No INSERT/UPDATE/DELETE policies: only the send-promo-blast edge function
--     writes, using the service-role key (bypasses RLS).
--
-- Rollback: supabase/migrations/rollback/20261118001200_email_broadcast_log.rollback.sql
-- ============================================================================
--
-- Broadcast send log
--
-- Records one row per (campaign, recipient) so a broadcast can be retried
-- safely. Without this, re-running send-promo-blast after a partial failure
-- would email everyone who already received it a second time.
--
-- The unique index is on lower(email) because auth.users addresses are not
-- case-normalised, and the same person must not be counted twice.

CREATE TABLE IF NOT EXISTS public.email_broadcast_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  text        NOT NULL,
  email        text        NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_broadcast_log_campaign_email
  ON public.email_broadcast_log (campaign_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_email_broadcast_log_campaign
  ON public.email_broadcast_log (campaign_id);

ALTER TABLE public.email_broadcast_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_broadcast_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.email_broadcast_log TO authenticated;

DROP POLICY IF EXISTS email_broadcast_log_admin_select ON public.email_broadcast_log;
CREATE POLICY email_broadcast_log_admin_select
  ON public.email_broadcast_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
