-- Harden messages INSERT: block when either participant has blocked the other.
-- Drop existing policy and recreate with block check.

DROP POLICY IF EXISTS "Participants can create messages in their conversations" ON messages;

CREATE POLICY "Participants can create messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.contractor_id = auth.uid() OR c.subcontractor_id = auth.uid())
    )
    -- Block if recipient has blocked sender (B cannot message A when A blocked B)
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub, conversations c
      WHERE c.id = conversation_id
      AND ub.blocker_id = (CASE WHEN c.contractor_id = auth.uid() THEN c.subcontractor_id ELSE c.contractor_id END)
      AND ub.blocked_id = auth.uid()
    )
    -- Block if sender has blocked recipient (A cannot message B when A blocked B)
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub, conversations c
      WHERE c.id = conversation_id
      AND ub.blocker_id = auth.uid()
      AND ub.blocked_id = (CASE WHEN c.contractor_id = auth.uid() THEN c.subcontractor_id ELSE c.contractor_id END)
    )
  );
