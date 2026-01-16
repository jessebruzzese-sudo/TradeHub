/*
  # Admin Notifications for New Account Reviews
  
  This migration adds a notification system for admins when new accounts are created.
  
  ## Changes
    - Creates a function to notify all admins when a new account is created
    - Adds a trigger to automatically create admin notifications on new account reviews
    - Admins receive an in-app notification with link to review the account
  
  ## Security
    - Only admins can view notifications sent to admins
    - Notifications are created automatically via secure trigger
*/

-- Function to create admin notifications for new account reviews
CREATE OR REPLACE FUNCTION notify_admins_new_account_review()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  new_user_name text;
  new_user_email text;
  new_user_role text;
BEGIN
  -- Get the new user's details
  SELECT name, email, role INTO new_user_name, new_user_email, new_user_role
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create a notification for each admin
  FOR admin_record IN 
    SELECT id FROM users WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      link,
      read,
      created_at
    ) VALUES (
      admin_record.id,
      'application',
      'New Account Review Required',
      new_user_name || ' (' || new_user_email || ') created a ' || new_user_role || ' account. Review for potential scams or misconduct.',
      '/admin/account-reviews',
      false,
      now()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create admin notifications when new account review is created
DROP TRIGGER IF EXISTS trigger_notify_admins_new_account_review ON admin_account_reviews;
CREATE TRIGGER trigger_notify_admins_new_account_review
  AFTER INSERT ON admin_account_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_account_review();
