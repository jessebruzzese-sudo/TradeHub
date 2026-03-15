/*
  # Add receive_trade_alerts to users

  ## Overview
  Premium-gated preference for job/tender alerts matching the user's trade.
  When enabled, users receive notifications when new jobs or tenders matching
  their trade(s) are listed.

  ## Changes
  - `receive_trade_alerts` (boolean): Whether to receive alerts for new jobs/tenders in user's trade (default false)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'receive_trade_alerts'
  ) THEN
    ALTER TABLE users ADD COLUMN receive_trade_alerts boolean DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN users.receive_trade_alerts IS 'Premium: receive alerts when new jobs/tenders matching user trade are listed';
