/*
  # MVP Billing & Admin Features

  ## 1. Complimentary Premium Subscriptions
  ## 2. Presence Tracking
  ## 3. Feature Flags (admin_settings)
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

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_users_complimentary_premium ON users(complimentary_premium_until) WHERE complimentary_premium_until IS NOT NULL;
