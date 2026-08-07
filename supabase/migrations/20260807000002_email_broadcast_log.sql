-- ============================================================================
-- Broadcast send log
--
-- Records one row per (campaign, recipient) so a broadcast can be retried
-- safely. Without this, re-running send-promo-blast after a partial failure
-- would email everyone who already received it a second time.
--
-- The unique index is on lower(email) because auth.users addresses are not
-- case-normalised, and the same person must not be counted twice.
--
-- Written only by the send-promo-blast edge function using the service-role
-- key. RLS is enabled with no policies, so anon/authenticated clients cannot
-- read the recipient list -- it is a marketing send history, not public data.
-- ============================================================================

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
