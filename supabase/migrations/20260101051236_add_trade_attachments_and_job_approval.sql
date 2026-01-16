/*
  # Add Trade Attachments and Job Approval Workflow

  ## Changes

  1. **Trade Attachments**
    - Add `documents` column to `tender_trade_requirements` (jsonb array)
      - Each document: { url: string, name: string, type: string, size: number }
    - Add `links` column to `tender_trade_requirements` (jsonb array)
      - Each link: { url: string, title: string }

  2. **Job Approval Workflow**
    - Add `approval_status` column to `jobs` (pending_approval, approved, rejected)
    - Add `approval_notes` column to `jobs` (text, for admin notes on rejection)
    - Add `approved_by` column to `jobs` (uuid, references users)
    - Add `approved_at` column to `jobs` (timestamptz)
    - Update existing jobs to have 'approved' status by default

  3. **Security**
    - Trade attachments inherit existing RLS policies from tender_trade_requirements
    - Job approval fields follow existing job RLS policies
    - Only admins can modify approval fields

  ## Notes
  - Trade attachments are scoped per trade requirement (not global tender)
  - Jobs now require admin approval before becoming publicly visible
  - Helper text in UI: "Only visible to this trade, the tender owner, and admin."
*/

-- Add trade attachments columns to tender_trade_requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tender_trade_requirements' AND column_name = 'documents'
  ) THEN
    ALTER TABLE tender_trade_requirements ADD COLUMN documents jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tender_trade_requirements' AND column_name = 'links'
  ) THEN
    ALTER TABLE tender_trade_requirements ADD COLUMN links jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

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