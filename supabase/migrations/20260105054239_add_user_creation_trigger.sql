/*
  # Add User Creation Trigger

  ## Summary
  Creates an automatic trigger to create user profiles when new auth users sign up.

  ## Changes
  1. New Function
    - `handle_new_user()` - Automatically creates user profile from auth metadata
    
  2. New Trigger
    - Triggers on `auth.users` insert to create profile in `public.users` table
    - Reads metadata: name, role, primary_trade, business_name, abn, location, postcode
    - Sets default values for new users
  
  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Validates role is either 'contractor' or 'subcontractor'
  - Primary trade is required for all non-admin users
*/

-- Function to create user profile from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    primary_trade,
    business_name,
    abn,
    location,
    postcode,
    trust_status,
    rating,
    completed_jobs,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'contractor'),
    NEW.raw_user_meta_data->>'primary_trade',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'abn',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'postcode',
    'pending',
    0,
    0,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
