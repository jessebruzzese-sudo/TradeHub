-- Fix ambiguous get_jobs_visible_to_viewer: drop 3-param overload if it exists
-- The 4-param version (with offset_count) is the canonical one
DROP FUNCTION IF EXISTS public.get_jobs_visible_to_viewer(uuid, text, int);
