-- User blocking for messaging safety.
-- When user A blocks user B: B cannot send new messages to A.
-- Existing thread history remains visible; composer is disabled for B.

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- RLS: users can manage their own blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can create blocks (blocker must be self)"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());
