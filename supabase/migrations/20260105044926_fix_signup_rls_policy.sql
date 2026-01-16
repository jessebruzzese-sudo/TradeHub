/*
  # Fix signup RLS policy to allow profile creation

  1. Changes
    - Drop existing restrictive INSERT policy on users table
    - Create new INSERT policy that allows both authenticated and anon users
    - Maintains security by checking auth.uid() = id

  2. Security
    - Still requires the user ID to match the authenticated user's ID
    - Allows signup flow to complete even with email confirmation enabled
    - Does not compromise security as only the user's own profile can be created

  3. Notes
    - This fixes the "Failed to create account" error during signup
    - Email confirmation can remain enabled in Supabase settings
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new policy that allows both authenticated and anon users during signup
CREATE POLICY "Users can insert own profile during signup"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id);
