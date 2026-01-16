/*
  # Add ABN Verification and Subcontractor Availability

  1. ABN Verification
    - Add ABN verification status fields to users table
    - Create enum type for ABN status
    - Add verification tracking fields

  2. Subcontractor Availability
    - Create subcontractor_availability table
    - One row per available date per subcontractor
    - Support description field for availability notes

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users to manage their own availability
*/

-- Create ABN status enum type
DO $$ BEGIN
  CREATE TYPE abn_verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add ABN verification fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_status'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_status abn_verification_status DEFAULT 'UNVERIFIED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_verified_by'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_verified_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_rejection_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_submitted_at'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_submitted_at timestamptz;
  END IF;
END $$;

-- Create subcontractor_availability table
CREATE TABLE IF NOT EXISTS subcontractor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subcontractor_availability_user_date
  ON subcontractor_availability(user_id, date);

-- Enable RLS
ALTER TABLE subcontractor_availability ENABLE ROW LEVEL SECURITY;

-- Policies for subcontractor_availability
CREATE POLICY "Users can view own availability"
  ON subcontractor_availability FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own availability"
  ON subcontractor_availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability"
  ON subcontractor_availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability"
  ON subcontractor_availability FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all availability
CREATE POLICY "Admins can view all availability"
  ON subcontractor_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create updated_at trigger for subcontractor_availability
CREATE OR REPLACE FUNCTION update_subcontractor_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcontractor_availability_updated_at
  BEFORE UPDATE ON subcontractor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontractor_availability_updated_at();