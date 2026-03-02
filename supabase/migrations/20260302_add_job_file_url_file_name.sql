-- Add legacy file_url and file_name columns for job attachments
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text;
