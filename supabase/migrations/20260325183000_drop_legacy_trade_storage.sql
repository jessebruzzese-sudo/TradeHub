-- Drop legacy trade storage (users.trades jsonb, user_trades table) after backfill + audit preconditions.
-- Recreates directory/ratings views that depended on users.trades.

BEGIN;

-- RPC that mutates user_trades (must drop before table)
DROP FUNCTION IF EXISTS public.update_user_trades(uuid, text, text[]);

-- Dependent views (may reference users.trades)
DROP VIEW IF EXISTS public.public_profile_directory_with_ratings CASCADE;
DROP VIEW IF EXISTS public.public_profile_directory CASCADE;
DROP VIEW IF EXISTS public.users_with_ratings CASCADE;

DROP TABLE IF EXISTS public.user_trades CASCADE;

DROP FUNCTION IF EXISTS public.update_user_trades_updated_at() CASCADE;

ALTER TABLE public.users DROP COLUMN IF EXISTS trades;

-- Public profile slice (no legacy trades column; app uses users.primary_trade / additional_trades)
CREATE OR REPLACE VIEW public.public_profile_directory AS
SELECT
  u.id,
  u.name,
  u.business_name,
  u.avatar,
  u.bio,
  u.mini_bio,
  u.cover_url,
  u.location,
  u.postcode,
  u.member_since,
  u.completed_jobs,
  u.rating,
  u.reliability_rating,
  u.role,
  u.abn,
  u.abn_status,
  u.abn_verified_at,
  u.is_public_profile,
  u.instagram,
  u.facebook,
  u.linkedin,
  u.tiktok,
  u.youtube,
  u.website,
  u.complimentary_premium_until,
  u.premium_until,
  u.premium_until AS premium_expires_at,
  u.subscription_status,
  u.active_plan,
  u.is_premium,
  u.subcontractor_sub_status,
  u.pricing_type,
  u.pricing_amount,
  u.show_pricing_on_profile,
  (
    (u.complimentary_premium_until IS NOT NULL AND u.complimentary_premium_until > now())
    OR (u.premium_until IS NOT NULL AND u.premium_until > now())
    OR (
      lower(COALESCE(u.subscription_status, '')) IN ('active', 'trialing')
      AND lower(COALESCE(u.active_plan, 'none')) <> 'none'
    )
    OR COALESCE(u.is_premium, false) = true
  ) AS premium_now
FROM public.users u
WHERE u.deleted_at IS NULL
  AND COALESCE(u.is_public_profile, false) = true;

CREATE OR REPLACE VIEW public.public_profile_directory_with_ratings AS
SELECT
  d.*,
  ura.up_count,
  ura.down_count,
  ura.rating_count,
  ura.rating_avg
FROM public.public_profile_directory d
LEFT JOIN public.user_rating_aggregates ura ON ura.target_user_id = d.id;

CREATE OR REPLACE VIEW public.users_with_ratings AS
SELECT
  u.*,
  ura.up_count,
  ura.down_count,
  ura.rating_count,
  ura.rating_avg
FROM public.users u
LEFT JOIN public.user_rating_aggregates ura ON ura.target_user_id = u.id;

GRANT SELECT ON public.public_profile_directory TO anon, authenticated;
GRANT SELECT ON public.public_profile_directory_with_ratings TO anon, authenticated;
GRANT SELECT ON public.users_with_ratings TO anon, authenticated;

COMMIT;
