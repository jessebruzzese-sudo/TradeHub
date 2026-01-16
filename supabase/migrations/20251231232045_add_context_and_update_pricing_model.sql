/*
  # Add Context Submission and Update Pricing Model

  ## Changes

  ### 1. Reliability Events - Add Context Submission
  - `subcontractor_context`: Optional explanation from subcontractor (admin-only)
  - `subcontractor_context_submitted_at`: Timestamp of context submission
  - `context_window_expires_at`: Auto-calculated 72 hours from event creation

  ### 2. Users - Update Subscription Model
  - Replace old subscription fields with new unified model
  - `active_plan`: NONE, BUSINESS_PRO_20, SUBCONTRACTOR_PRO_10, ALL_ACCESS_PRO_26
  - `subscription_status`: NONE, ACTIVE, PAST_DUE, CANCELED
  - `subscription_renews_at`: Next renewal date
  - Remove deprecated fields: subcontractorPlan, subcontractorSubStatus, subcontractorSubRenewsAt

  ### 3. Capability-Based Access
  - Capabilities derived from active_plan:
    - BUSINESS_PRO_20 → Builder + Contractor premium
    - SUBCONTRACTOR_PRO_10 → Subcontractor premium
    - ALL_ACCESS_PRO_26 → All capabilities
  - Only ONE active subscription per user

  ## Business Rules

  ### Context Submission
  - Subcontractors have 72 hours from reliability event creation
  - Context can only be submitted once per event
  - Context visible to admins only, not contractors
  - Context does NOT remove the reliability event

  ### Pricing & Subscriptions
  - Business Pro ($20/month): Builder + Contractor tools
  - Subcontractor Pro ($10/month): Subcontractor premium tools
  - All-Access Pro ($26/month): Everything
  - Users can upgrade/downgrade between plans
  - Cancel returns user to FREE capabilities

  ## Security
  - RLS policies updated to reflect new subscription model
  - Subcontractors can only submit context for their own events
  - Context visible only to admins and the subcontractor who submitted it
*/

-- Add context submission fields to reliability_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reliability_events' AND column_name = 'subcontractor_context'
  ) THEN
    ALTER TABLE reliability_events ADD COLUMN subcontractor_context text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reliability_events' AND column_name = 'subcontractor_context_submitted_at'
  ) THEN
    ALTER TABLE reliability_events ADD COLUMN subcontractor_context_submitted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reliability_events' AND column_name = 'context_window_expires_at'
  ) THEN
    ALTER TABLE reliability_events ADD COLUMN context_window_expires_at timestamptz;
  END IF;
END $$;

-- Auto-set context window expiry (72 hours from creation)
CREATE OR REPLACE FUNCTION set_context_window_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.context_window_expires_at := NEW.created_at + INTERVAL '72 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_context_window_expiry_trigger'
  ) THEN
    CREATE TRIGGER set_context_window_expiry_trigger
      BEFORE INSERT ON reliability_events
      FOR EACH ROW
      EXECUTE FUNCTION set_context_window_expiry();
  END IF;
END $$;

-- Update existing events to have context window
UPDATE reliability_events
SET context_window_expires_at = created_at + INTERVAL '72 hours'
WHERE context_window_expires_at IS NULL;

-- Add RLS policy for subcontractors to update their own context
DO $$
BEGIN
  DROP POLICY IF EXISTS "Subcontractors can submit context for own events" ON reliability_events;
END $$;

CREATE POLICY "Subcontractors can submit context for own events"
  ON reliability_events FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = subcontractor_id
    AND subcontractor_context IS NULL
    AND now() < context_window_expires_at
  )
  WITH CHECK (
    auth.uid() = subcontractor_id
    AND subcontractor_context IS NOT NULL
  );

-- Add new subscription model fields to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'active_plan'
  ) THEN
    ALTER TABLE users ADD COLUMN active_plan text DEFAULT 'NONE' CHECK (active_plan IN ('NONE', 'BUSINESS_PRO_20', 'SUBCONTRACTOR_PRO_10', 'ALL_ACCESS_PRO_26'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status text DEFAULT 'NONE' CHECK (subscription_status IN ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_renews_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_renews_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_started_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_canceled_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_canceled_at timestamptz;
  END IF;
END $$;

-- Migrate existing subscription data
UPDATE users
SET
  active_plan = CASE
    WHEN subcontractor_plan = 'PRO_10' THEN 'SUBCONTRACTOR_PRO_10'
    ELSE 'NONE'
  END,
  subscription_status = CASE
    WHEN subcontractor_sub_status = 'ACTIVE' THEN 'ACTIVE'
    WHEN subcontractor_sub_status = 'PAST_DUE' THEN 'PAST_DUE'
    WHEN subcontractor_sub_status = 'CANCELED' THEN 'CANCELED'
    ELSE 'NONE'
  END,
  subscription_renews_at = subcontractor_sub_renews_at
WHERE subcontractor_plan IS NOT NULL OR subcontractor_sub_status IS NOT NULL;

-- Add billing history table for admin audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('SUBSCRIBED', 'UPGRADED', 'DOWNGRADED', 'RENEWED', 'CANCELED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED')),
  from_plan text,
  to_plan text,
  amount_cents integer,
  currency text DEFAULT 'AUD',
  payment_provider text,
  payment_provider_ref text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription history
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own subscription history" ON subscription_history;
END $$;

CREATE POLICY "Users can view own subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all subscription history
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all subscription history" ON subscription_history;
END $$;

CREATE POLICY "Admins can view all subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add usage tracking table for billing transparency
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN (
    'TENDER_POSTED',
    'JOB_POSTED',
    'QUOTE_RECEIVED',
    'APPLICATION_SUBMITTED',
    'AVAILABILITY_BROADCAST',
    'RADIUS_USED_KM'
  )),
  metric_value integer DEFAULT 1,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage metrics
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own usage metrics" ON usage_metrics;
END $$;

CREATE POLICY "Users can view own usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reliability_events_context_expiry
  ON reliability_events(context_window_expires_at) 
  WHERE subcontractor_context IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_date
  ON subscription_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date
  ON usage_metrics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_active_plan
  ON users(active_plan) WHERE active_plan != 'NONE';

-- Add helpful comments
COMMENT ON COLUMN reliability_events.subcontractor_context IS 'Optional context provided by subcontractor within 72 hours (admin-only visibility)';
COMMENT ON COLUMN reliability_events.context_window_expires_at IS 'Deadline for context submission (72 hours from event creation)';
COMMENT ON COLUMN users.active_plan IS 'Current subscription plan: NONE, BUSINESS_PRO_20, SUBCONTRACTOR_PRO_10, or ALL_ACCESS_PRO_26';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status: NONE, ACTIVE, PAST_DUE, or CANCELED';
COMMENT ON TABLE subscription_history IS 'Complete audit trail of all subscription changes and payments';
COMMENT ON TABLE usage_metrics IS 'Usage tracking for billing transparency and smart upgrade recommendations';
