/*
  # Reliability Tracking and Admin Review System

  ## Overview
  Implements comprehensive reliability tracking, 48-hour job reminders, SMS opt-in prompts,
  and an admin review system for subcontractors with repeated non-fulfillments.

  ## New Tables

  ### 1. reliability_events
  Tracks each instance when a subcontractor fails to fulfill a confirmed job.
  - Used to count non-fulfillments in a rolling 90-day window
  - Triggers admin review flag at 3 events within 90 days
  
  ### 2. admin_review_cases
  Manages manual admin reviews for flagged subcontractors.
  - Created automatically when reliability threshold is breached
  - Tracks admin actions (warning, suspension, cleared)
  - All actions are logged in audit_log

  ## Modified Tables

  ### users
  - Added `sms_opt_in_prompt_shown`: Track if SMS opt-in banner has been displayed
  - Added `sms_opt_in_prompt_dismissed_at`: When user dismissed the prompt
  - Update default alert values: in-app=true, email=true, SMS=false

  ### jobs
  - Added `starts_at`: Job start time for 48h reminder scheduling
  - Added `fulfilled`: Boolean to track if subcontractor completed the job
  - Added `fulfillment_marked_by`: Who marked the fulfillment status
  - Added `fulfillment_marked_at`: When fulfillment was marked

  ## Business Rules

  ### Reliability Tracking
  1. Contractor marks job as "Not fulfilled" → creates ReliabilityEvent
  2. System counts ReliabilityEvents in last 90 days
  3. At 3 events → automatically creates AdminReviewCase
  4. Subcontractor notified (non-punitive wording)
  5. NO automatic suspension

  ### 48-Hour Reminders
  1. Send reminder 48h before job start time for CONFIRMED jobs
  2. Channels: in-app (always), email (if enabled), SMS (only if opted in)
  3. If job confirmed within 48h of start, send immediately
  4. Include warning about reliability reviews for non-fulfillment

  ### SMS Opt-In Prompt
  1. Trigger: After first missed job (job filled before user viewed/applied)
  2. Show banner ONCE if SMS alerts are OFF
  3. Track dismissal to prevent re-showing
  4. Never auto-enable SMS

  ### Admin Review Process
  1. Admin reviews case in dedicated queue
  2. Actions: No action, Warning, Suspension (7/14/30 days), Permanent ban
  3. All actions logged to audit_log
  4. Subcontractor notified of outcome

  ## Security
  - RLS enabled on all tables
  - Contractors can only mark their own jobs as fulfilled/not fulfilled
  - Only admins can access admin_review_cases
  - Subcontractors can view their own reliability events and review status
*/

-- Add reliability tracking fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_opt_in_prompt_shown'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_opt_in_prompt_shown boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_opt_in_prompt_dismissed_at'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_opt_in_prompt_dismissed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_flagged_for_review'
  ) THEN
    ALTER TABLE users ADD COLUMN account_flagged_for_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_suspended'
  ) THEN
    ALTER TABLE users ADD COLUMN account_suspended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspension_ends_at'
  ) THEN
    ALTER TABLE users ADD COLUMN suspension_ends_at timestamptz;
  END IF;
END $$;

-- Update default SMS alert to false (in-app and email remain true)
ALTER TABLE users 
  ALTER COLUMN subcontractor_work_alert_sms SET DEFAULT false;

-- Add job fulfillment tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN starts_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'fulfilled'
  ) THEN
    ALTER TABLE jobs ADD COLUMN fulfilled boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'fulfillment_marked_by'
  ) THEN
    ALTER TABLE jobs ADD COLUMN fulfillment_marked_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'fulfillment_marked_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN fulfillment_marked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'reminder_48h_sent'
  ) THEN
    ALTER TABLE jobs ADD COLUMN reminder_48h_sent boolean DEFAULT false;
  END IF;
END $$;

-- Create reliability_events table
CREATE TABLE IF NOT EXISTS reliability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL CHECK (event_type IN ('NO_SHOW', 'DID_NOT_COMPLETE', 'LATE_CANCELLATION')),
  event_date timestamptz NOT NULL DEFAULT now(),
  contractor_notes text,
  admin_reviewed boolean DEFAULT false,
  admin_reviewed_by uuid REFERENCES users(id),
  admin_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reliability_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Subcontractors can view own reliability events" ON reliability_events;
  DROP POLICY IF EXISTS "Contractors can view events they created" ON reliability_events;
  DROP POLICY IF EXISTS "Admins can view all reliability events" ON reliability_events;
  DROP POLICY IF EXISTS "Contractors can create reliability events" ON reliability_events;
END $$;

-- Subcontractors can view their own events
CREATE POLICY "Subcontractors can view own reliability events"
  ON reliability_events FOR SELECT
  TO authenticated
  USING (auth.uid() = subcontractor_id);

-- Contractors can view events they created
CREATE POLICY "Contractors can view events they created"
  ON reliability_events FOR SELECT
  TO authenticated
  USING (auth.uid() = contractor_id);

-- Admins can view all events
CREATE POLICY "Admins can view all reliability events"
  ON reliability_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Contractors can create events for their jobs
CREATE POLICY "Contractors can create reliability events"
  ON reliability_events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.contractor_id = auth.uid()
    )
  );

-- Create admin_review_cases table
CREATE TABLE IF NOT EXISTS admin_review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('RELIABILITY', 'TRUST_VIOLATION', 'FRAUD', 'OTHER')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'CLEARED', 'WARNING_ISSUED', 'SUSPENDED', 'PERMANENTLY_BANNED')),
  reliability_event_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  resolution_notes text,
  suspension_days integer,
  suspension_ends_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_review_cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Subcontractors can view own review cases" ON admin_review_cases;
  DROP POLICY IF EXISTS "Admins can view all review cases" ON admin_review_cases;
  DROP POLICY IF EXISTS "Admins can create review cases" ON admin_review_cases;
  DROP POLICY IF EXISTS "Admins can update review cases" ON admin_review_cases;
END $$;

-- Subcontractors can view their own cases
CREATE POLICY "Subcontractors can view own review cases"
  ON admin_review_cases FOR SELECT
  TO authenticated
  USING (auth.uid() = subcontractor_id);

-- Admins can view all cases
CREATE POLICY "Admins can view all review cases"
  ON admin_review_cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can create cases
CREATE POLICY "Admins can create review cases"
  ON admin_review_cases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update cases
CREATE POLICY "Admins can update review cases"
  ON admin_review_cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reliability_events_subcontractor 
  ON reliability_events(subcontractor_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_reliability_events_job 
  ON reliability_events(job_id);

CREATE INDEX IF NOT EXISTS idx_admin_review_cases_subcontractor 
  ON admin_review_cases(subcontractor_id);

CREATE INDEX IF NOT EXISTS idx_admin_review_cases_status 
  ON admin_review_cases(status) WHERE status IN ('PENDING', 'IN_REVIEW');

CREATE INDEX IF NOT EXISTS idx_jobs_starts_at 
  ON jobs(starts_at) WHERE starts_at IS NOT NULL AND reminder_48h_sent = false;

-- Add helpful comments
COMMENT ON TABLE reliability_events IS 'Tracks subcontractor non-fulfillments for reliability scoring';
COMMENT ON TABLE admin_review_cases IS 'Manual admin review cases for flagged subcontractors';
COMMENT ON COLUMN users.sms_opt_in_prompt_shown IS 'Whether SMS opt-in banner has been displayed to user';
COMMENT ON COLUMN users.sms_opt_in_prompt_dismissed_at IS 'When user dismissed SMS opt-in prompt (prevents re-showing)';
COMMENT ON COLUMN users.account_flagged_for_review IS 'Account flagged for admin review due to reliability issues';
COMMENT ON COLUMN jobs.starts_at IS 'Job start time for 48h reminder scheduling';
COMMENT ON COLUMN jobs.fulfilled IS 'Whether subcontractor completed the job (true=yes, false=no, null=not marked)';
COMMENT ON COLUMN jobs.reminder_48h_sent IS 'Whether 48h reminder notification has been sent';
