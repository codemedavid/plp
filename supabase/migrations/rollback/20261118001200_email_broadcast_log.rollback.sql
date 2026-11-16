-- ROLLBACK for 20261118001200_email_broadcast_log.sql
-- WARNING: drops the send history. A later send-promo-blast retry would then
-- re-email everyone in a campaign. Export the table first if it has rows.
DROP POLICY IF EXISTS email_broadcast_log_admin_select ON public.email_broadcast_log;
DROP TABLE IF EXISTS public.email_broadcast_log;
