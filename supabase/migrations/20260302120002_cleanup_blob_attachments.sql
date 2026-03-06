-- Optional cleanup: remove invalid blob: URLs from job attachments
-- Run this if you have jobs with blob: URLs saved from before the fix
UPDATE public.jobs
SET attachments = '[]'::jsonb
WHERE attachments::text LIKE '%blob:http%';
