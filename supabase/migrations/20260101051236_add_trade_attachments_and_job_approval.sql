/*
  # Job approval workflow

  Adds admin approval fields to `jobs` for moderation.
*/

-- Add job approval workflow columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE jobs ADD COLUMN approval_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE jobs ADD COLUMN approved_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Update existing jobs to be approved (grandfathering)
UPDATE jobs SET approval_status = 'approved', approved_at = created_at WHERE approval_status IS NULL OR approval_status = 'approved';

-- Create index for job approval status
CREATE INDEX IF NOT EXISTS idx_jobs_approval_status ON jobs(approval_status);

-- Add policy for admins to update job approval fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' AND policyname = 'Admins can update job approval status'
  ) THEN
    CREATE POLICY "Admins can update job approval status"
      ON jobs
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
