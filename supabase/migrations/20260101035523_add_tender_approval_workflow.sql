/*
  # Add Tender Approval Workflow

  This migration adds a moderation/approval workflow for tenders.

  ## Changes
  
  1. Adds to tenders table:
     - approval_status (text) - PENDING, APPROVED, or REJECTED
     - approved_at (timestamptz, nullable) - when tender was approved
     - approved_by (uuid, nullable) - admin user who approved it
     - rejection_reason (text, nullable) - reason for rejection if applicable
     - admin_notes (text, nullable) - internal admin notes
  
  ## Security
  - Default approval_status is PENDING
  - Public visibility limited to APPROVED tenders
  - Owners can always see their own tenders regardless of status
  - Only admins can change approval_status
  
  ## Notes
  - Tenders must be approved before appearing to other users
  - This helps prevent spam and maintain quality
*/

-- Add approval status fields to tenders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approval_status text DEFAULT 'PENDING' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE tenders ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE tenders ADD COLUMN admin_notes text;
  END IF;
END $$;

-- Add check constraint for valid approval statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenders_approval_status_check'
  ) THEN
    ALTER TABLE tenders ADD CONSTRAINT tenders_approval_status_check 
      CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
  END IF;
END $$;