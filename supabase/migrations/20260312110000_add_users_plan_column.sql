-- Add canonical Free/Premium plan column used by app gating and billing webhooks.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS plan text;

-- Backfill from legacy subscription fields.
UPDATE public.users
SET plan = CASE
  WHEN is_premium = true THEN 'premium'
  WHEN complimentary_premium_until IS NOT NULL AND complimentary_premium_until > NOW() THEN 'premium'
  WHEN premium_until IS NOT NULL AND premium_until > NOW() THEN 'premium'
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
    AND LOWER(COALESCE(active_plan, 'none')) <> 'none' THEN 'premium'
  ELSE 'free'
END
WHERE plan IS NULL OR LOWER(plan) NOT IN ('free', 'premium');

ALTER TABLE public.users
ALTER COLUMN plan SET DEFAULT 'free';

UPDATE public.users SET plan = 'free' WHERE plan IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_plan_check'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'premium'));
  END IF;
END $$;
