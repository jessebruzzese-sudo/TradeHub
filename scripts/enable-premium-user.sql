-- Enable Premium for TradeHub user (manual admin grant)
-- Run in Supabase SQL Editor or: node scripts/enable-premium-user.mjs
-- By email: PW_PREMIUM_EMAIL=test5@gmail.com node scripts/enable-premium-user.mjs
--
-- User ID: e1c4fb02-43cc-456c-a819-b53b1f2775af
-- Or by email: test5@gmail.com (premium test account)
--
-- ENUM VALUES DISCOVERED (from migrations):
--   subcontractor_plan_type: NONE, PRO_10  (NOT "PREMIUM")
--   subcontractor_subscription_status: NONE, ACTIVE, PAST_DUE, CANCELED
--   builder_plan, contractor_plan: text columns (no enum)
--   active_plan: text CHECK - NONE, BUSINESS_PRO_20, SUBCONTRACTOR_PRO_10, ALL_ACCESS_PRO_26
--   subscription_status: text CHECK - NONE, ACTIVE, PAST_DUE, CANCELED

-- =============================================================================
-- STEP 1: Discover valid enum values (run in SQL Editor to verify)
-- =============================================================================

SELECT 'subcontractor_plan_type' AS enum_name, enumlabel AS value
FROM pg_enum
WHERE enumtypid = 'subcontractor_plan_type'::regtype
ORDER BY enumsortorder;

SELECT 'subcontractor_subscription_status' AS enum_name, enumlabel AS value
FROM pg_enum
WHERE enumtypid = 'subcontractor_subscription_status'::regtype
ORDER BY enumsortorder;

-- =============================================================================
-- STEP 2-5: Execute update (only valid values - NO "PREMIUM" in enums)
-- =============================================================================

-- By user ID:
UPDATE public.users
SET
  is_premium = true,
  active_plan = 'ALL_ACCESS_PRO_26',
  subscription_status = 'ACTIVE',
  complimentary_premium_until = now() + interval '30 days',
  subscription_started_at = now(),
  subscription_renews_at = now() + interval '30 days'
WHERE id = 'e1c4fb02-43cc-456c-a819-b53b1f2775af';

-- Or by email (e.g. test5@gmail.com premium test account):
-- UPDATE public.users
-- SET
--   is_premium = true,
--   active_plan = 'ALL_ACCESS_PRO_26',
--   subscription_status = 'ACTIVE',
--   complimentary_premium_until = now() + interval '30 days',
--   subscription_started_at = now(),
--   subscription_renews_at = now() + interval '30 days'
-- WHERE email = 'test5@gmail.com';

-- =============================================================================
-- STEP 6: Verify result
-- =============================================================================

SELECT
  id,
  email,
  role,
  is_premium,
  subscription_status,
  active_plan,
  subcontractor_plan,
  subcontractor_sub_status,
  complimentary_premium_until,
  premium_until,
  subscription_started_at,
  subscription_renews_at
FROM public.users
WHERE id = 'e1c4fb02-43cc-456c-a819-b53b1f2775af';
