-- Ensure Completed Works storage exists on hosted projects (bucket + policies).
-- Safe to re-run: upserts bucket and replaces named policies.
--
-- Code expects bucket id/name: previous-work
-- Object paths: {user_id}/{previous_work_id}/{filename} (see API upload + isPreviousWorkStorageObjectKey)
--
-- Note: Server-side uploads use the Supabase service role, which bypasses storage RLS.
--       Policies below matter for any future direct client uploads and for defence in depth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'previous-work',
  'previous-work',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path check: first segment must equal auth.uid() (same intent as original foldername()[1]).
DROP POLICY IF EXISTS "Users can upload previous work images" ON storage.objects;
CREATE POLICY "Users can upload previous work images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'previous-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated can read previous work images" ON storage.objects;
CREATE POLICY "Authenticated can read previous work images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'previous-work');

DROP POLICY IF EXISTS "Users can delete own previous work images" ON storage.objects;
CREATE POLICY "Users can delete own previous work images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'previous-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
