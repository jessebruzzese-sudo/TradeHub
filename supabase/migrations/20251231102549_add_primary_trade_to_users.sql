/*
  # Add Primary Trade to Users

  1. Changes
    - Add `primary_trade` column to `users` table
      - This field stores the user's selected primary trade category
      - Required for both contractors and subcontractors
      - Used to filter jobs and profiles by relevance
    
  2. Notes
    - Column is optional initially to support existing users
    - Frontend will enforce selection for new profiles
    - Existing users will be prompted to select on next profile edit
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'primary_trade'
  ) THEN
    ALTER TABLE users ADD COLUMN primary_trade text;
  END IF;
END $$;
