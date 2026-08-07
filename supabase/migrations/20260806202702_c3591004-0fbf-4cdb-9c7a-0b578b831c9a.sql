CREATE POLICY "loja_imgs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'loja' AND (storage.foldername(name))[1] = private.current_tenant_id()::text);

CREATE POLICY "loja_imgs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loja' AND (storage.foldername(name))[1] = private.current_tenant_id()::text);

CREATE POLICY "loja_imgs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'loja' AND (storage.foldername(name))[1] = private.current_tenant_id()::text)
  WITH CHECK (bucket_id = 'loja' AND (storage.foldername(name))[1] = private.current_tenant_id()::text);

CREATE POLICY "loja_imgs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'loja' AND (storage.foldername(name))[1] = private.current_tenant_id()::text);