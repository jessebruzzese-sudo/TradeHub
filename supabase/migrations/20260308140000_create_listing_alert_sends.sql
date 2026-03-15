/*
  # Create listing_alert_sends table

  ## Overview
  Logs email sends for job/tender alerts. Used for duplicate prevention and debugging.

  ## Table: listing_alert_sends
  - id, listing_type, listing_id, recipient_user_id, recipient_email, trade_label
  - status (sent, failed, skipped)
  - provider_message_id, error_message, created_at

  ## Unique constraint
  - (listing_type, listing_id, recipient_user_id) prevents duplicate emails per recipient
*/

CREATE TABLE IF NOT EXISTS public.listing_alert_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type text NOT NULL CHECK (listing_type IN ('job', 'tender')),
  listing_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  trade_label text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_type, listing_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_alert_sends_listing ON public.listing_alert_sends(listing_type, listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_alert_sends_recipient ON public.listing_alert_sends(recipient_user_id);

COMMENT ON TABLE public.listing_alert_sends IS 'Log of email alerts sent for new jobs/tenders; used for duplicate prevention and debugging';

-- RLS: restrict client access; service-role used for server-side writes
ALTER TABLE public.listing_alert_sends ENABLE ROW LEVEL SECURITY;

-- No SELECT for anon/authenticated: server uses service role
CREATE POLICY "Service role only for listing_alert_sends"
  ON public.listing_alert_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users cannot read/write (prevents client from querying all sends)
-- No policy for authenticated = no access
