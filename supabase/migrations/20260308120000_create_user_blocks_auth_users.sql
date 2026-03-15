-- User blocking for messaging safety, moderation, and preventing unwanted messages.
-- References auth.users for compatibility; supports blocking, message prevention, safety moderation.

-- Drop dependent policy first (messages INSERT policy references user_blocks)
DROP POLICY IF EXISTS "Participants can create messages in their conversations" ON public.messages;

-- Drop if exists (in case previous migration created with different FK)
DROP TABLE IF EXISTS public.user_blocks;

CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- RLS: users can manage their own blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can create blocks (blocker must be self)"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their own blocks"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Recreate messages policy with block check (was dropped above)
CREATE POLICY "Participants can create messages in their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.contractor_id = auth.uid() OR c.subcontractor_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub, conversations c
      WHERE c.id = conversation_id
      AND ub.blocker_id = (CASE WHEN c.contractor_id = auth.uid() THEN c.subcontractor_id ELSE c.contractor_id END)
      AND ub.blocked_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub, conversations c
      WHERE c.id = conversation_id
      AND ub.blocker_id = auth.uid()
      AND ub.blocked_id = (CASE WHEN c.contractor_id = auth.uid() THEN c.subcontractor_id ELSE c.contractor_id END)
    )
  );
