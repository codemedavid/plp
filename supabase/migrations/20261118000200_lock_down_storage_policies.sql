-- Lock down Supabase Storage (storage.objects) policies.
--
-- Problem: "Public Insert" (WITH CHECK true) / "Public Update" (USING true) on
-- storage.objects let anyone holding the anon key (shipped in the browser
-- bundle) upload into, or overwrite objects in, ANY bucket. "Public Select"
-- (USING true) let anyone LIST every bucket. protocol-files additionally had
-- anon INSERT/UPDATE/DELETE policies.
--
-- Inventory at 6f914a7: the app performs NO Supabase Storage calls. Every
-- upload (product images, payment QR, payment proofs at checkout, hero, logo,
-- guides, avatars) goes to ImageKit via src/hooks/useImageUpload.ts +
-- api/imagekit-auth.ts, and every stored URL (products, orders.payment_proof_url,
-- payment_methods.qr_code_url) is an ImageKit URL. The only live Storage data is
-- 3 legacy objects in `avatars`, 2 of which are referenced from
-- user_profiles.avatar_url via /storage/v1/object/public/avatars/... URLs.
--
-- Design:
--   * No non-admin INSERT / UPDATE / DELETE anywhere (nothing in the app needs it,
--     so guests/customers cannot upload or overwrite anything).
--   * No non-admin SELECT policy. SELECT on storage.objects is what powers
--     LIST and the authenticated download / signed-URL endpoints; it is NOT
--     needed for /object/public/<bucket>/<path> downloads from public buckets
--     (the storage server serves those without consulting RLS). So the 2 legacy
--     avatar URLs keep working, but nobody can enumerate bucket contents.
--   * Admins (public.is_admin()) keep full access to every bucket.
--   * payment-proofs (empty, unused) becomes PRIVATE so that if it is ever used
--     again, proofs are only reachable via admin-issued signed URLs; its
--     allowed types are images + PDF.
--
-- Rollback: supabase/migrations/rollback/20261118000200_lock_down_storage_policies.rollback.sql


DROP POLICY IF EXISTS "Public Insert"                     ON storage.objects;
DROP POLICY IF EXISTS "Public Select"                     ON storage.objects;
DROP POLICY IF EXISTS "Public Update"                     ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload protocol files"  ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update protocol files"  ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete protocol files"  ON storage.objects;
DROP POLICY IF EXISTS "Public can read protocol files"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read"               ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_insert"               ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update"               ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete"               ON storage.objects;

-- is_admin() wrapped in (select ...) so it is evaluated once per statement.
CREATE POLICY "storage_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

UPDATE storage.buckets
   SET public = false,
       file_size_limit = 10485760, -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
 WHERE id = 'payment-proofs';

