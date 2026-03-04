/*
  # Create tender-attachments storage bucket

  1. New Storage Bucket
    - `tender-attachments` bucket for tender files (plans, specs)
    - Private bucket (use signed URLs for access)
    - Path structure: tenders/{tenderId}/{folder}/{filename}

  2. Security
    - Tender builders can upload to their own tenders (tenders/{tender_id}/...)
    - Authenticated users can read (for signed URL generation when viewing tenders)
*/

-- Create tender-attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tender-attachments',
  'tender-attachments',
  false,
  52428800, -- 50MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Tender builders can upload to their own tenders
DROP POLICY IF EXISTS "Builders can upload tender attachments" ON storage.objects;
CREATE POLICY "Builders can upload tender attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tender-attachments'
  AND (storage.foldername(name))[1] = 'tenders'
  AND EXISTS (
    SELECT 1 FROM public.tenders
    WHERE id::text = (storage.foldername(name))[2]
    AND builder_id = auth.uid()
  )
);

-- Authenticated users can read (for signed URLs when viewing tender details)
DROP POLICY IF EXISTS "Authenticated can read tender attachments" ON storage.objects;
CREATE POLICY "Authenticated can read tender attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tender-attachments');
