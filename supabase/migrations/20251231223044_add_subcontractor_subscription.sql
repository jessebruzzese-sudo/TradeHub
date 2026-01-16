/*
  # Add Subcontractor Subscription Tiers

  ## Overview
  Adds support for subcontractor subscription plans (Free and Pro tiers).
  Pro tier ($10/month) provides enhanced reach, alerts, and tools without lead-selling.

  ## New Columns Added to `users` table

  ### Plan & Subscription Status
  - `subcontractor_plan` (enum): NONE, PRO_10
  - `subcontractor_sub_status` (enum): NONE, ACTIVE, PAST_DUE, CANCELED
  - `subcontractor_sub_renews_at` (timestamptz): Next renewal date

  ### Pro Feature Controls
  - `subcontractor_preferred_radius_km` (int): Desired radius (default 15km)
  - `subcontractor_alerts_enabled` (boolean): Master alert toggle (default false)
  - `subcontractor_alert_channel_in_app` (boolean): In-app notifications (default true)
  - `subcontractor_alert_channel_email` (boolean): Email alerts (default false, Pro only)
  - `subcontractor_alert_channel_sms` (boolean): SMS alerts (default false, Pro only)
  - `subcontractor_availability_horizon_days` (int): Availability calendar range (Free: 14, Pro: 60)

  ## Business Rules

  ### Free Tier (Default)
  - Cost: $0/month
  - Effective radius: max 15km
  - Alerts: In-app only
  - Availability horizon: 14 days

  ### Pro Tier ($10/month)
  - Cost: $10/month
  - Effective radius: up to 999km
  - Alerts: In-app, Email, SMS
  - Availability horizon: 60 days
  - Pro badge visible on profile

  ## Notes
  - No lead-selling: Pro is for reach and alerts, not per-lead access
  - All job/tender details remain visible to Free users
  - Contractor/builder billing fields unchanged
*/

-- Create enum types for subcontractor subscription
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subcontractor_plan_type') THEN
    CREATE TYPE subcontractor_plan_type AS ENUM ('NONE', 'PRO_10');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subcontractor_subscription_status') THEN
    CREATE TYPE subcontractor_subscription_status AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');
  END IF;
END $$;

-- Add subcontractor subscription columns to users table
DO $$
BEGIN
  -- Plan and subscription status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_plan'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_plan subcontractor_plan_type DEFAULT 'NONE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_sub_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_sub_status subcontractor_subscription_status DEFAULT 'NONE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_sub_renews_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_sub_renews_at timestamptz;
  END IF;

  -- Pro feature controls - radius and alerts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_preferred_radius_km'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_preferred_radius_km int DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_alerts_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_alerts_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_alert_channel_in_app'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_alert_channel_in_app boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_alert_channel_email'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_alert_channel_email boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_alert_channel_sms'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_alert_channel_sms boolean DEFAULT false;
  END IF;

  -- Availability horizon
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_availability_horizon_days'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_availability_horizon_days int DEFAULT 14;
  END IF;
END $$;

-- Create indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subcontractor_plan
  ON users(subcontractor_plan)
  WHERE role = 'subcontractor';

CREATE INDEX IF NOT EXISTS idx_users_subcontractor_sub_status
  ON users(subcontractor_sub_status)
  WHERE role = 'subcontractor';

-- Add helpful comments
COMMENT ON COLUMN users.subcontractor_plan IS 'Subcontractor subscription plan: NONE (Free), PRO_10 ($10/month)';
COMMENT ON COLUMN users.subcontractor_sub_status IS 'Subscription status: NONE, ACTIVE, PAST_DUE, CANCELED';
COMMENT ON COLUMN users.subcontractor_preferred_radius_km IS 'Desired search radius. Free: capped at 15km, Pro: up to 999km';
COMMENT ON COLUMN users.subcontractor_alerts_enabled IS 'Master toggle for all alert channels';
COMMENT ON COLUMN users.subcontractor_alert_channel_in_app IS 'In-app notifications (available to all tiers)';
COMMENT ON COLUMN users.subcontractor_alert_channel_email IS 'Email alerts (Pro only)';
COMMENT ON COLUMN users.subcontractor_alert_channel_sms IS 'SMS alerts (Pro only)';
COMMENT ON COLUMN users.subcontractor_availability_horizon_days IS 'How far ahead availability can be set. Free: 14 days, Pro: 60 days';
