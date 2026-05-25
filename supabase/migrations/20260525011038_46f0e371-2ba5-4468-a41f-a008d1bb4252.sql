
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "verif_docs_user_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "verif_docs_user_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "verif_docs_user_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "verif_docs_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);
