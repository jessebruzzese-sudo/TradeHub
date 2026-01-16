/*
  # Enhanced Location System and Admin Account Review Notifications

  This migration implements:
  1. Structured location data for all users (suburb, postcode, coordinates)
  2. Premium custom search location feature (Tinder-style location override)
  3. Admin notification system for new account reviews

  ## New Tables
    - `admin_account_reviews`
      - Tracks pending account reviews for scam/misconduct prevention
      - Links to users table
      - Stores review status and admin actions
      
  ## Modified Tables
    - `users`
      - Added `postcode` for user's business location postcode
      - Added `location_lat` and `location_lng` for business location coordinates
      - Added `search_location`, `search_postcode`, `search_lat`, `search_lng` for premium search override
      - Added `business_name` to store business name from signup
      - Added `account_reviewed` flag to track admin review status
      
  ## Security
    - RLS enabled on `admin_account_reviews` table
    - Admins can read all reviews
    - Only admins can update review status
    - Users cannot access their own review records

  ## Important Notes
    - Premium users can set a custom search location separate from their business location
    - Distance/radius calculations use search_location if set, otherwise business location
    - Admin reviews are for monitoring only and don't block platform usage
*/

-- Add location fields to users table
DO $$
BEGIN
  -- Add postcode field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'postcode'
  ) THEN
    ALTER TABLE users ADD COLUMN postcode text;
  END IF;

  -- Add location coordinates if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'location_lat'
  ) THEN
    ALTER TABLE users ADD COLUMN location_lat numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'location_lng'
  ) THEN
    ALTER TABLE users ADD COLUMN location_lng numeric;
  END IF;

  -- Add premium search location fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'search_location'
  ) THEN
    ALTER TABLE users ADD COLUMN search_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'search_postcode'
  ) THEN
    ALTER TABLE users ADD COLUMN search_postcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'search_lat'
  ) THEN
    ALTER TABLE users ADD COLUMN search_lat numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'search_lng'
  ) THEN
    ALTER TABLE users ADD COLUMN search_lng numeric;
  END IF;

  -- Add business_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE users ADD COLUMN business_name text;
  END IF;

  -- Add account_reviewed flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_reviewed'
  ) THEN
    ALTER TABLE users ADD COLUMN account_reviewed boolean DEFAULT false;
  END IF;
END $$;

-- Create admin account reviews table
CREATE TABLE IF NOT EXISTS admin_account_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  flag_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewed', 'flagged', 'suspended'))
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_account_reviews_user_id ON admin_account_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_account_reviews_status ON admin_account_reviews(status);
CREATE INDEX IF NOT EXISTS idx_users_account_reviewed ON users(account_reviewed);

-- Enable RLS on admin_account_reviews
ALTER TABLE admin_account_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_account_reviews
CREATE POLICY "Admins can view all account reviews"
  ON admin_account_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert account reviews"
  ON admin_account_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update account reviews"
  ON admin_account_reviews FOR UPDATE
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

-- Function to automatically create account review when new user signs up
CREATE OR REPLACE FUNCTION create_account_review_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_account_reviews (user_id, status)
  VALUES (NEW.id, 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create review record on new user signup
DROP TRIGGER IF EXISTS trigger_create_account_review ON users;
CREATE TRIGGER trigger_create_account_review
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_account_review_on_signup();

-- Add comments for documentation
COMMENT ON COLUMN users.postcode IS 'Postcode of the user business location';
COMMENT ON COLUMN users.location_lat IS 'Latitude of business location';
COMMENT ON COLUMN users.location_lng IS 'Longitude of business location';
COMMENT ON COLUMN users.search_location IS 'Premium feature: Custom search location (overrides business location)';
COMMENT ON COLUMN users.search_postcode IS 'Premium feature: Postcode for custom search location';
COMMENT ON COLUMN users.search_lat IS 'Premium feature: Latitude for custom search location';
COMMENT ON COLUMN users.search_lng IS 'Premium feature: Longitude for custom search location';
COMMENT ON COLUMN users.business_name IS 'Business name provided during signup';
COMMENT ON COLUMN users.account_reviewed IS 'Whether admin has reviewed this account for scams/misconduct';

COMMENT ON TABLE admin_account_reviews IS 'Admin review records for new account monitoring';
COMMENT ON COLUMN admin_account_reviews.status IS 'Review status: pending, reviewed, flagged, suspended';
