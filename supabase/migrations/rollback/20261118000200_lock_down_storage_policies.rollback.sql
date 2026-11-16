-- Rollback for 20261118000200_lock_down_storage_policies.sql
-- WARNING: this restores the previous INSECURE state (anon can upload to /
-- overwrite objects in every bucket and list every bucket). Use only as an
-- emergency revert.


DROP POLICY IF EXISTS "storage_admin_all" ON storage.objects;

CREATE POLICY "Public Insert" ON storage.objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public Select" ON storage.objects FOR SELECT TO public USING (true);
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can upload protocol files" ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'protocol-files');
CREATE POLICY "Anyone can update protocol files" ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'protocol-files');
CREATE POLICY "Anyone can delete protocol files" ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'protocol-files');
CREATE POLICY "Public can read protocol files" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'protocol-files');

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

UPDATE storage.buckets
   SET public = true,
       file_size_limit = 10485760,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
 WHERE id = 'payment-proofs';

