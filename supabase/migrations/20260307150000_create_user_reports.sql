-- User reports for messaging moderation.
-- Reports are separate from blocking; optional "report and block" is supported in the UI.

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'harassment',
    'spam',
    'scam',
    'inappropriate_content',
    'other'
  )),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'reviewed',
    'resolved',
    'dismissed'
  )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (reporter_id != reported_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_id ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at DESC);

-- RLS: reporters can create and view their own reports; admins will use service role
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports (reporter must be self)"
  ON user_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own reports"
  ON user_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());
