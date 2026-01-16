/*
  # MVP Billing & Admin Features

  ## 1. Complimentary Premium Subscriptions
    - Add `complimentary_premium_until` to users table (nullable timestamptz)
    - Allows admins to grant temporary premium access
    - When date expires, user reverts to normal subscription status
    - Add `complimentary_reason` for internal tracking

  ## 2. Presence Tracking
    - Add `last_seen_at` to users table
    - Tracks when user was last active
    - Used for online status indicators
    - Admin-only visibility

  ## 3. Guest Tender Approval
    - Add `approval_status` to tenders table
    - Add `approval_reason` for admin notes
    - Add `approved_by` foreign key to users
    - Add `approved_at` timestamp

  ## 4. Feature Flags
    - Create `admin_settings` table
    - Store system-wide feature flags
    - Only admins can modify

  ## Security
    - RLS policies enforce admin-only access where needed
    - Complimentary premium fields only visible to user and admins
*/

-- Add complimentary premium fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'complimentary_premium_until'
  ) THEN
    ALTER TABLE users ADD COLUMN complimentary_premium_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'complimentary_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN complimentary_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_seen_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add guest tender approval fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending_admin_review', 'approved', 'rejected', 'changes_requested'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approval_reason'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approval_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approved_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE tenders ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'is_guest_tender'
  ) THEN
    ALTER TABLE tenders ADD COLUMN is_guest_tender boolean DEFAULT false;
  END IF;
END $$;

-- Create admin settings table for feature flags
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin settings
CREATE POLICY "Admins can read admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can update admin settings
CREATE POLICY "Admins can update admin settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can insert admin settings
CREATE POLICY "Admins can insert admin settings"
  ON admin_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default feature flags
INSERT INTO admin_settings (key, value, description)
VALUES
  ('guest_tenders_enabled', 'true', 'Allow guest users to submit tenders for approval')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES
  ('signups_enabled', 'true', 'Allow new user signups')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES
  ('emails_enabled', 'true', 'Enable outgoing email notifications')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES
  ('maintenance_mode', 'false', 'Show maintenance banner to all users')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES
  ('maintenance_message', '"We are performing scheduled maintenance. The platform will be back shortly."', 'Message to show during maintenance')
  ON CONFLICT (key) DO NOTHING;

-- Update tenders RLS to include approval status for public viewing
DROP POLICY IF EXISTS "Contractors can view live tenders" ON tenders;
CREATE POLICY "Contractors can view approved live tenders"
  ON tenders FOR SELECT
  TO authenticated
  USING (
    status = 'LIVE' AND
    approval_status = 'approved' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

-- Add admin access to all tenders
CREATE POLICY "Admins can view all tenders"
  ON tenders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tenders"
  ON tenders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create index for faster approval status queries
CREATE INDEX IF NOT EXISTS idx_tenders_approval_status ON tenders(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_users_complimentary_premium ON users(complimentary_premium_until) WHERE complimentary_premium_until IS NOT NULL;