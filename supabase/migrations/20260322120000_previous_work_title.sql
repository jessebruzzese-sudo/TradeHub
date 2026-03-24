-- Short headline for completed-work posts (description remains in caption).

ALTER TABLE public.previous_work
  ADD COLUMN IF NOT EXISTS title text;

UPDATE public.previous_work
SET title = left(trim(caption), 100)
WHERE title IS NULL;

UPDATE public.previous_work
SET title = 'Completed work'
WHERE trim(coalesce(title, '')) = '';

ALTER TABLE public.previous_work
  ALTER COLUMN title SET NOT NULL;

COMMENT ON COLUMN public.previous_work.title IS 'Short headline for portfolio item; caption holds full description.';
