-- ROLLBACK for 20261118001100_admin_grant_points.sql
-- Removes the admin grant RPC. Grants already made stay in points_ledger
-- (reason = 'admin_adjust'); reverse them individually if needed.
DROP FUNCTION IF EXISTS public.admin_grant_points(uuid, integer, text);
