-- Previous Work: profile portfolio (images + caption + optional location).
-- Trade is not stored; display uses users.primary_trade / user_trades at render time.
-- Storage bucket is private; app serves images via signed URLs (service role).
-- Idempotent: safe to re-run in SQL Editor if policies already exist.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.previous_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  caption text NOT NULL,
  location text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_previous_work_user_created
  ON public.previous_work (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.previous_work_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_work_id uuid NOT NULL REFERENCES public.previous_work(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_previous_work_images_work_sort
  ON public.previous_work_images (previous_work_id, sort_order ASC);

COMMENT ON TABLE public.previous_work IS 'Portfolio items for subcontractor profiles; trade comes from user profile.';
COMMENT ON TABLE public.previous_work_images IS 'Image paths in previous-work storage bucket; signed URLs generated in app.';

-- ---------------------------------------------------------------------------
-- updated_at trigger (previous_work only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_previous_work_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_previous_work_updated_at ON public.previous_work;
CREATE TRIGGER trigger_previous_work_updated_at
  BEFORE UPDATE ON public.previous_work
  FOR EACH ROW
  EXECUTE FUNCTION update_previous_work_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (direct client access optional; API uses service role for reads with signed URLs)
-- ---------------------------------------------------------------------------

ALTER TABLE public.previous_work ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "previous_work_select_visible" ON public.previous_work;
CREATE POLICY "previous_work_select_visible"
  ON public.previous_work FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = previous_work.user_id
        AND u.is_public_profile IS TRUE
    )
  );

DROP POLICY IF EXISTS "previous_work_insert_own" ON public.previous_work;
CREATE POLICY "previous_work_insert_own"
  ON public.previous_work FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "previous_work_update_own" ON public.previous_work;
CREATE POLICY "previous_work_update_own"
  ON public.previous_work FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "previous_work_delete_own" ON public.previous_work;
CREATE POLICY "previous_work_delete_own"
  ON public.previous_work FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.previous_work_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "previous_work_images_select_visible" ON public.previous_work_images;
CREATE POLICY "previous_work_images_select_visible"
  ON public.previous_work_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.previous_work pw
      WHERE pw.id = previous_work_images.previous_work_id
        AND (
          pw.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = pw.user_id
              AND u.is_public_profile IS TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS "previous_work_images_insert_own" ON public.previous_work_images;
CREATE POLICY "previous_work_images_insert_own"
  ON public.previous_work_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.previous_work pw
      WHERE pw.id = previous_work_images.previous_work_id
        AND pw.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "previous_work_images_delete_own" ON public.previous_work_images;
CREATE POLICY "previous_work_images_delete_own"
  ON public.previous_work_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.previous_work pw
      WHERE pw.id = previous_work_images.previous_work_id
        AND pw.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket (uploads + signed URLs via service role in API)
-- Path pattern: {user_id}/{previous_work_id}/{uuid}.ext
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'previous-work',
  'previous-work',
  false,
  10485760, -- 10 MB per object
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload previous work images" ON storage.objects;
CREATE POLICY "Users can upload previous work images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'previous-work'
    AND (storage.foldername(name))[1] = auth.uid()::text
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
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
