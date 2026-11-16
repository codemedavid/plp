-- ============================================================================
-- Phase 1 RLS lockdown: storefront catalog / config tables + reviews
--
-- Before this migration these tables had RLS DISABLED, so anyone holding the
-- public anon key (shipped in the browser bundle) could INSERT/UPDATE/DELETE
-- them -- e.g. swap payment_methods account numbers, rewrite prices, or wipe
-- the catalog.
--
-- After this migration:
--   * anon + authenticated can SELECT (the storefront, api/*.ts and the
--     orders triggers compute_order_total_cost / compute_order_referral_qualifying
--     read these tables as the inserting role, so SELECT stays USING (true)).
--   * INSERT / UPDATE / DELETE require public.is_admin() (user_profiles.role =
--     'admin'; role changes are guarded by prevent_role_change_trigger).
--   * reviews / review_products additionally allow the customer review flow
--     (WriteReviewModal -> submitCustomerReview): guests and signed-in
--     customers may INSERT a non-admin review for themselves (user_id NULL or
--     auth.uid()) and link it to the review's own product.
--
-- Compatible with the code at git HEAD and the current working tree: every
-- non-admin access to these tables is a read, except the review insert above.
-- Admin writes come from AdminDashboard, which is gated on useIsAdmin()
-- (a real Supabase session whose user_profiles.role = 'admin').
--
-- is_admin() is wrapped in (select ...) so Postgres evaluates it once per
-- statement (initPlan) instead of once per row.
--
-- Rollback: supabase/migrations/rollback/20261117000000_enable_rls_catalog_tables.rollback.sql
-- ============================================================================

-- couriers had a permissive ALL/true policy (inert while RLS was off).
-- It would keep the table world-writable once RLS is on, so drop it.
DROP POLICY IF EXISTS "Allow full access to couriers" ON public.couriers;

-- ---------------------------------------------------------------- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_public_select ON public.products;
CREATE POLICY products_public_select ON public.products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS products_admin_insert ON public.products;
CREATE POLICY products_admin_insert ON public.products
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS products_admin_update ON public.products;
CREATE POLICY products_admin_update ON public.products
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_admin_delete ON public.products
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- product_variations
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variations_public_select ON public.product_variations;
CREATE POLICY product_variations_public_select ON public.product_variations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_variations_admin_insert ON public.product_variations;
CREATE POLICY product_variations_admin_insert ON public.product_variations
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS product_variations_admin_update ON public.product_variations;
CREATE POLICY product_variations_admin_update ON public.product_variations
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS product_variations_admin_delete ON public.product_variations;
CREATE POLICY product_variations_admin_delete ON public.product_variations
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_public_select ON public.categories;
CREATE POLICY categories_public_select ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS categories_admin_insert ON public.categories;
CREATE POLICY categories_admin_insert ON public.categories
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS categories_admin_update ON public.categories;
CREATE POLICY categories_admin_update ON public.categories
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS categories_admin_delete ON public.categories;
CREATE POLICY categories_admin_delete ON public.categories
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- faqs
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faqs_public_select ON public.faqs;
CREATE POLICY faqs_public_select ON public.faqs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS faqs_admin_insert ON public.faqs;
CREATE POLICY faqs_admin_insert ON public.faqs
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS faqs_admin_update ON public.faqs;
CREATE POLICY faqs_admin_update ON public.faqs
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS faqs_admin_delete ON public.faqs;
CREATE POLICY faqs_admin_delete ON public.faqs
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- shipping_locations
ALTER TABLE public.shipping_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_locations_public_select ON public.shipping_locations;
CREATE POLICY shipping_locations_public_select ON public.shipping_locations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS shipping_locations_admin_insert ON public.shipping_locations;
CREATE POLICY shipping_locations_admin_insert ON public.shipping_locations
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS shipping_locations_admin_update ON public.shipping_locations;
CREATE POLICY shipping_locations_admin_update ON public.shipping_locations
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS shipping_locations_admin_delete ON public.shipping_locations;
CREATE POLICY shipping_locations_admin_delete ON public.shipping_locations
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- couriers
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS couriers_public_select ON public.couriers;
CREATE POLICY couriers_public_select ON public.couriers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS couriers_admin_insert ON public.couriers;
CREATE POLICY couriers_admin_insert ON public.couriers
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS couriers_admin_update ON public.couriers;
CREATE POLICY couriers_admin_update ON public.couriers
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS couriers_admin_delete ON public.couriers;
CREATE POLICY couriers_admin_delete ON public.couriers
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_methods_public_select ON public.payment_methods;
CREATE POLICY payment_methods_public_select ON public.payment_methods
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS payment_methods_admin_insert ON public.payment_methods;
CREATE POLICY payment_methods_admin_insert ON public.payment_methods
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS payment_methods_admin_update ON public.payment_methods;
CREATE POLICY payment_methods_admin_update ON public.payment_methods
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS payment_methods_admin_delete ON public.payment_methods;
CREATE POLICY payment_methods_admin_delete ON public.payment_methods
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- coa_reports
ALTER TABLE public.coa_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coa_reports_public_select ON public.coa_reports;
CREATE POLICY coa_reports_public_select ON public.coa_reports
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS coa_reports_admin_insert ON public.coa_reports;
CREATE POLICY coa_reports_admin_insert ON public.coa_reports
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS coa_reports_admin_update ON public.coa_reports;
CREATE POLICY coa_reports_admin_update ON public.coa_reports
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS coa_reports_admin_delete ON public.coa_reports;
CREATE POLICY coa_reports_admin_delete ON public.coa_reports
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_select ON public.site_settings;
CREATE POLICY site_settings_public_select ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS site_settings_admin_insert ON public.site_settings;
CREATE POLICY site_settings_admin_insert ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS site_settings_admin_update ON public.site_settings;
CREATE POLICY site_settings_admin_update ON public.site_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS site_settings_admin_delete ON public.site_settings;
CREATE POLICY site_settings_admin_delete ON public.site_settings
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public sees approved reviews; a signed-in customer also sees their own;
-- admins see everything (ReviewManager lists unapproved ones too).
-- submitCustomerReview does insert(...).select() and always sends
-- is_approved = true, so the inserted row is visible to the inserter.
DROP POLICY IF EXISTS reviews_public_select ON public.reviews;
CREATE POLICY reviews_public_select ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (
    is_approved IS NOT FALSE
    OR (user_id IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR (SELECT public.is_admin())
  );

-- Customer review submission (guest or signed-in). Cannot impersonate another
-- user or post as admin, and must reference an order.
DROP POLICY IF EXISTS reviews_customer_insert ON public.reviews;
CREATE POLICY reviews_customer_insert ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    COALESCE(admin_posted, false) = false
    AND order_id IS NOT NULL
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS reviews_admin_insert ON public.reviews;
CREATE POLICY reviews_admin_insert ON public.reviews
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reviews_admin_update ON public.reviews;
CREATE POLICY reviews_admin_update ON public.reviews
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reviews_admin_delete ON public.reviews;
CREATE POLICY reviews_admin_delete ON public.reviews
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------- review_products
ALTER TABLE public.review_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_products_public_select ON public.review_products;
CREATE POLICY review_products_public_select ON public.review_products
  FOR SELECT TO anon, authenticated USING (true);

-- submitCustomerReview mirrors the review's single product into the junction.
-- Only allow linking a customer review to the product it already names.
DROP POLICY IF EXISTS review_products_customer_insert ON public.review_products;
CREATE POLICY review_products_customer_insert ON public.review_products
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_products.review_id
        AND r.product_id = review_products.product_id
        AND COALESCE(r.admin_posted, false) = false
        AND (r.user_id IS NULL OR r.user_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS review_products_admin_insert ON public.review_products;
CREATE POLICY review_products_admin_insert ON public.review_products
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS review_products_admin_update ON public.review_products;
CREATE POLICY review_products_admin_update ON public.review_products
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS review_products_admin_delete ON public.review_products;
CREATE POLICY review_products_admin_delete ON public.review_products
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
