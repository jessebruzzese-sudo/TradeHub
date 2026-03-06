-- Fix job-attachments storage: allow path format jobId/timestamp_uuid.ext
-- (Previous policy required jobs/userId/jobId/... which didn't match)

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can upload job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload job attachments" ON storage.objects;

-- Allow any authenticated user to upload to job-attachments
-- (Job ownership is enforced at application layer when creating/updating jobs)
CREATE POLICY "Authenticated can upload job attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-attachments');
