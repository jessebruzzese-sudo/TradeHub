-- Add Stripe identifiers to users for billing (Phase 2).
-- RLS: users can read/update own row; stripe ids are not exposed in client by default (loadProfile can omit them if desired).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_subscription_id text UNIQUE;
  END IF;
END $$;

COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for billing portal and checkout';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID; synced by webhook';
