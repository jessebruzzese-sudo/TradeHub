/*
  # Add is_public_profile for Discovery Feature

  Adds a boolean column to users table for privacy controls:
  - When true, user appears in "Trades near you" discovery lists
  - When false, user is excluded from discovery (default for safety)
*/

-- Add is_public_profile to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_public_profile IS 'When true, profile appears in Trades near you discovery. Default false for privacy.';
