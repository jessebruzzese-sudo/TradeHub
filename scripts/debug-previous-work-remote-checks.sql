-- Run in Supabase SQL Editor (hosted project) — Completed Works sanity checks.
-- 1) Tables exist
SELECT to_regclass('public.previous_work') AS previous_work_table,
       to_regclass('public.previous_work_images') AS previous_work_images_table;

-- 2) previous_work has expected columns (title migration applied)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'previous_work'
ORDER BY ordinal_position;

-- 3) Storage bucket id matches code (PREVIOUS_WORK_STORAGE_BUCKET = 'previous-work')
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'previous-work';

-- 4) Recent rows (optional; trim if noisy)
SELECT id, user_id, left(title, 40) AS title_preview, created_at
FROM public.previous_work
ORDER BY created_at DESC
LIMIT 5;

SELECT i.id, i.previous_work_id, left(i.image_path, 60) AS path_preview, i.sort_order
FROM public.previous_work_images i
ORDER BY i.id DESC
LIMIT 10;
