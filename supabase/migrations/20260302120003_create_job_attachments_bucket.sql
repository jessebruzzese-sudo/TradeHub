/*
  # Create job-attachments storage bucket

  1. New Storage Bucket
    - `job-attachments` bucket for job files (plans, photos, specs)
    - Private bucket (use signed URLs for access)
    - 50MB file size limit
    - Path structure: jobs/{userId}/{jobId}/{uuid}-{filename}

  2. Security
    - Authenticated users can upload to their own folder (jobs/{user_id}/...)
    - Authenticated users can read (for signed URL generation)
*/

-- Create job-attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-attachments',
  'job-attachments',
  false,
  52428800, -- 50MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to jobs/{their_user_id}/...
CREATE POLICY "Users can upload job attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-attachments' AND
  (storage.foldername(name))[1] = 'jobs' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read job attachments (for signed URL)
CREATE POLICY "Authenticated can read job attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-attachments');
