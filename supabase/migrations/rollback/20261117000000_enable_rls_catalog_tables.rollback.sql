-- ============================================================================
-- ROLLBACK for 20261117000000_enable_rls_catalog_tables.sql
--
-- Restores the exact pre-migration state: RLS disabled on every table, the new
-- policies dropped, and the original couriers policy recreated (it was inert
-- while RLS was off, and is inert again after this rollback).
--
-- WARNING: running this re-opens all of these tables to anonymous writes.
-- ============================================================================

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_select ON public.products;
DROP POLICY IF EXISTS products_admin_insert ON public.products;
DROP POLICY IF EXISTS products_admin_update ON public.products;
DROP POLICY IF EXISTS products_admin_delete ON public.products;

ALTER TABLE public.product_variations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_variations_public_select ON public.product_variations;
DROP POLICY IF EXISTS product_variations_admin_insert ON public.product_variations;
DROP POLICY IF EXISTS product_variations_admin_update ON public.product_variations;
DROP POLICY IF EXISTS product_variations_admin_delete ON public.product_variations;

ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_public_select ON public.categories;
DROP POLICY IF EXISTS categories_admin_insert ON public.categories;
DROP POLICY IF EXISTS categories_admin_update ON public.categories;
DROP POLICY IF EXISTS categories_admin_delete ON public.categories;

ALTER TABLE public.faqs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faqs_public_select ON public.faqs;
DROP POLICY IF EXISTS faqs_admin_insert ON public.faqs;
DROP POLICY IF EXISTS faqs_admin_update ON public.faqs;
DROP POLICY IF EXISTS faqs_admin_delete ON public.faqs;

ALTER TABLE public.shipping_locations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipping_locations_public_select ON public.shipping_locations;
DROP POLICY IF EXISTS shipping_locations_admin_insert ON public.shipping_locations;
DROP POLICY IF EXISTS shipping_locations_admin_update ON public.shipping_locations;
DROP POLICY IF EXISTS shipping_locations_admin_delete ON public.shipping_locations;

ALTER TABLE public.couriers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS couriers_public_select ON public.couriers;
DROP POLICY IF EXISTS couriers_admin_insert ON public.couriers;
DROP POLICY IF EXISTS couriers_admin_update ON public.couriers;
DROP POLICY IF EXISTS couriers_admin_delete ON public.couriers;

ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_methods_public_select ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_admin_insert ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_admin_update ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_admin_delete ON public.payment_methods;

ALTER TABLE public.coa_reports DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_reports_public_select ON public.coa_reports;
DROP POLICY IF EXISTS coa_reports_admin_insert ON public.coa_reports;
DROP POLICY IF EXISTS coa_reports_admin_update ON public.coa_reports;
DROP POLICY IF EXISTS coa_reports_admin_delete ON public.coa_reports;

ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_select ON public.site_settings;
DROP POLICY IF EXISTS site_settings_admin_insert ON public.site_settings;
DROP POLICY IF EXISTS site_settings_admin_update ON public.site_settings;
DROP POLICY IF EXISTS site_settings_admin_delete ON public.site_settings;

ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_public_select ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_insert ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_update ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_delete ON public.reviews;
DROP POLICY IF EXISTS reviews_customer_insert ON public.reviews;

ALTER TABLE public.review_products DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS review_products_public_select ON public.review_products;
DROP POLICY IF EXISTS review_products_admin_insert ON public.review_products;
DROP POLICY IF EXISTS review_products_admin_update ON public.review_products;
DROP POLICY IF EXISTS review_products_admin_delete ON public.review_products;
DROP POLICY IF EXISTS review_products_customer_insert ON public.review_products;

DROP POLICY IF EXISTS "Allow full access to couriers" ON public.couriers;
CREATE POLICY "Allow full access to couriers" ON public.couriers
  FOR ALL TO public USING (true) WITH CHECK (true);
