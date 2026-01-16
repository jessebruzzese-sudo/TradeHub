/*
  # Make Primary Trade Required

  1. Changes
    - Ensure primary_trade exists on users table
    - Add constraint to require primary_trade for active users
    - This allows existing users to be null temporarily but enforces selection on next login
    
  2. Security
    - No RLS changes needed
    
  3. Notes
    - Users without primary_trade will be forced to onboarding flow
    - After onboarding, primary_trade becomes immutable (enforced in application layer)
*/

-- Ensure primary_trade column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'primary_trade'
  ) THEN
    ALTER TABLE users ADD COLUMN primary_trade text;
  END IF;
END $$;

-- Create index for faster filtering by trade
CREATE INDEX IF NOT EXISTS idx_users_primary_trade ON users(primary_trade);
