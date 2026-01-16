/*
  # Update Subcontractor Alert System

  ## Overview
  Separates work alerts (Free + Pro) from availability broadcasts (Pro only).
  Free users can now receive work alerts via in-app, email, and SMS.
  Availability broadcasts remain Pro-only.

  ## Changes

  ### New Columns Added to `users` table
  - `subcontractor_work_alerts_enabled` (boolean): Master toggle for work alerts (default true)
  - `subcontractor_work_alert_in_app` (boolean): In-app work alerts (default true)
  - `subcontractor_work_alert_email` (boolean): Email work alerts (default true)
  - `subcontractor_work_alert_sms` (boolean): SMS work alerts (default true)
  - `subcontractor_availability_broadcast_enabled` (boolean): Pro-only availability broadcast (default false)

  ## Business Rules Updated

  ### Work Alerts (Free + Pro)
  - Free users: Can enable in-app, email, and SMS alerts for new work postings
  - Pro users: Same as Free for work alerts
  - At least one alert channel must remain enabled
  - Effective radius still applies: Free = 15km, Pro = up to 999km

  ### Availability Broadcast (Pro Only)
  - Only Pro users can enable availability broadcasts
  - When enabled, contractors are notified when subcontractor marks availability
  - Free users cannot enable this feature

  ## Notes
  - Old alert fields (subcontractor_alerts_enabled, etc.) are kept for backwards compatibility
  - New fields provide clearer separation between alert types
*/

-- Add work alert columns to users table
DO $$
BEGIN
  -- Work alerts master toggle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_work_alerts_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_work_alerts_enabled boolean DEFAULT true;
  END IF;

  -- Work alert channels (available to Free + Pro)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_work_alert_in_app'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_work_alert_in_app boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_work_alert_email'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_work_alert_email boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_work_alert_sms'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_work_alert_sms boolean DEFAULT true;
  END IF;

  -- Availability broadcast (Pro only)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subcontractor_availability_broadcast_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN subcontractor_availability_broadcast_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN users.subcontractor_work_alerts_enabled IS 'Master toggle for work alerts (Free + Pro). At least one channel must stay enabled.';
COMMENT ON COLUMN users.subcontractor_work_alert_in_app IS 'In-app notifications for new work postings (Free + Pro)';
COMMENT ON COLUMN users.subcontractor_work_alert_email IS 'Email alerts for new work postings (Free + Pro)';
COMMENT ON COLUMN users.subcontractor_work_alert_sms IS 'SMS alerts for new work postings (Free + Pro)';
COMMENT ON COLUMN users.subcontractor_availability_broadcast_enabled IS 'Availability broadcast to contractors (Pro only)';
