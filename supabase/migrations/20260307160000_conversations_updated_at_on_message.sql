-- Update conversations.updated_at when a message is inserted.
-- Ensures conversation list is ordered by most recent activity.

CREATE OR REPLACE FUNCTION update_conversation_updated_at_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_updated_on_message ON messages;
CREATE TRIGGER trigger_conversation_updated_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at_on_message();
