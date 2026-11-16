-- ROLLBACK for 20261118001000_admin_approve_pending_points.sql
-- Removes the admin fast-approve RPC. Ledger rows it already flipped to
-- 'available' stay available (no data is reverted).
DROP FUNCTION IF EXISTS public.admin_approve_pending_points(uuid, uuid);
