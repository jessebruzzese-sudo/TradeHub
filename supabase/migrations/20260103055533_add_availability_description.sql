/*
  # Add availability description column

  1. Changes
    - Add `availability_description` column to `users` table
      - Text field for describing subcontracting availability
      - Optional field (nullable)
      - Used to surface spare capacity information

  2. Purpose
    - Allow users to describe their subcontracting availability
    - Example: "Have two 2nd-year apprentices available for two weeks"
    - Helps inform market rate insights without exposing individual pricing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'availability_description'
  ) THEN
    ALTER TABLE users ADD COLUMN availability_description text;
  END IF;
END $$;
