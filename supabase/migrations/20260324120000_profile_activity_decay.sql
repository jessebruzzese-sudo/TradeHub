-- Profile activity decay for profile strength

-- 1) users.last_active_at (defensive)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

UPDATE public.users
SET last_active_at = COALESCE(last_active_at, updated_at, created_at, now())
WHERE last_active_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN last_active_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON public.users(last_active_at);

-- 2) Throttled touch helper (6h)
CREATE OR REPLACE FUNCTION public.touch_last_active_if_stale(
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  did_update boolean := false;
BEGIN
  UPDATE public.users u
  SET last_active_at = p_now
  WHERE u.id = p_user_id
    AND (
      u.last_active_at IS NULL
      OR u.last_active_at < (p_now - interval '6 hours')
    );

  GET DIAGNOSTICS did_update = ROW_COUNT;
  RETURN did_update;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_active_if_stale(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_active_if_stale(uuid, timestamptz) TO service_role;

COMMENT ON FUNCTION public.touch_last_active_if_stale(uuid, timestamptz)
  IS 'Updates users.last_active_at only when null or older than 6 hours.';

-- 3) Update profile strength central RPC to use activity decay tiers
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u RECORD;
  w text;
  i text;
  f text;
  l text;
  g text;
  link_count int;
  link_pts numeric;
  bonus_pts numeric;
  google_pts numeric;
  likes_n int;
  likes_pts numeric;
  comp int;
  comp_pts numeric;
  abn_pts numeric;
  total int;
  band text;
  br jsonb;
  effective_last_active timestamptz;
  inactive_days int;
  activity_pts int;
  activity_tier text;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  effective_last_active := COALESCE(u.last_active_at, u.updated_at, u.created_at, now());
  inactive_days := GREATEST(0, floor(extract(epoch FROM (now() - effective_last_active)) / 86400)::int);

  IF inactive_days >= 30 THEN
    activity_pts := 0;
    activity_tier := 'inactive';
  ELSIF inactive_days >= 22 THEN
    activity_pts := 8;
    activity_tier := 'stale';
  ELSIF inactive_days >= 15 THEN
    activity_pts := 16;
    activity_tier := 'cooling';
  ELSIF inactive_days >= 8 THEN
    activity_pts := 24;
    activity_tier := 'recent';
  ELSE
    activity_pts := 32;
    activity_tier := 'fresh';
  END IF;

  w := COALESCE(NULLIF(trim(u.website_url), ''), NULLIF(trim(u.website), ''));
  i := COALESCE(NULLIF(trim(u.instagram_url), ''), NULLIF(trim(u.instagram), ''));
  f := COALESCE(NULLIF(trim(u.facebook_url), ''), NULLIF(trim(u.facebook), ''));
  l := COALESCE(NULLIF(trim(u.linkedin_url), ''), NULLIF(trim(u.linkedin), ''));

  link_count := 0;
  IF w IS NOT NULL AND w <> '' THEN link_count := link_count + 1; END IF;
  IF i IS NOT NULL AND i <> '' THEN link_count := link_count + 1; END IF;
  IF f IS NOT NULL AND f <> '' THEN link_count := link_count + 1; END IF;
  IF l IS NOT NULL AND l <> '' THEN link_count := link_count + 1; END IF;

  link_pts := 0::numeric;
  IF w IS NOT NULL AND w <> '' THEN link_pts := link_pts + 6::numeric; END IF;
  IF i IS NOT NULL AND i <> '' THEN link_pts := link_pts + 3::numeric; END IF;
  IF f IS NOT NULL AND f <> '' THEN link_pts := link_pts + 2::numeric; END IF;
  IF l IS NOT NULL AND l <> '' THEN link_pts := link_pts + 2::numeric; END IF;
  bonus_pts := CASE WHEN link_count >= 2 THEN 2::numeric ELSE 0::numeric END;
  link_pts := LEAST(15::numeric, link_pts + bonus_pts);

  g := NULLIF(trim(u.google_business_url), '');
  google_pts := 0::numeric;
  IF g IS NOT NULL AND g <> '' THEN
    google_pts := 4::numeric;
    IF u.google_rating IS NOT NULL THEN
      google_pts := google_pts + LEAST(8::numeric, (u.google_rating::numeric / 5.0) * 8::numeric);
    END IF;
    IF COALESCE(u.google_review_count, 0) > 0 THEN
      google_pts := google_pts + LEAST(
        6::numeric,
        (LEAST(u.google_review_count, 100)::numeric / 100.0) * 6::numeric
      );
    END IF;
    IF u.google_rating_verified IS TRUE THEN
      google_pts := google_pts + 2::numeric;
    END IF;
    google_pts := LEAST(20::numeric, google_pts);
  END IF;

  likes_n := COALESCE(u.profile_likes_count, 0);
  likes_pts := LEAST(
    10::numeric,
    10::numeric * (1::numeric - 1::numeric / (1::numeric + likes_n::numeric / 16.0))
  );

  comp := 0;
  IF u.avatar IS NOT NULL AND trim(u.avatar) <> '' THEN comp := comp + 2; END IF;
  IF u.bio IS NOT NULL AND length(trim(u.bio)) >= 40 THEN comp := comp + 3; END IF;
  IF u.primary_trade IS NOT NULL AND trim(u.primary_trade) <> '' THEN comp := comp + 2; END IF;
  IF (u.location IS NOT NULL AND trim(u.location) <> '')
     OR (u.base_suburb IS NOT NULL AND trim(u.base_suburb) <> '') THEN
    comp := comp + 2;
  END IF;
  IF u.pricing_type IS NOT NULL AND length(trim(u.pricing_type::text)) > 0 THEN comp := comp + 2; END IF;
  IF u.mini_bio IS NOT NULL AND length(trim(u.mini_bio)) >= 20 THEN comp := comp + 2; END IF;
  comp_pts := LEAST(13::numeric, comp::numeric);

  abn_pts := CASE
    WHEN COALESCE(u.abn_verified, false) IS TRUE
      OR upper(COALESCE(u.abn_status::text, '')) = 'VERIFIED'
    THEN 10::numeric
    ELSE 0::numeric
  END;

  total := LEAST(
    100,
    GREATEST(
      0,
      floor(activity_pts::numeric + link_pts + google_pts + likes_pts + comp_pts + abn_pts)::int
    )
  );

  IF total >= 85 THEN band := 'ELITE';
  ELSIF total >= 65 THEN band := 'HIGH';
  ELSIF total >= 40 THEN band := 'MEDIUM';
  ELSE band := 'LOW';
  END IF;

  br := jsonb_build_object(
    'links_count', link_count
  );

  RETURN jsonb_build_object(
    'total', total,
    'band', band,
    'activity_points', activity_pts,
    'links_points', floor(link_pts)::int,
    'google_points', floor(google_pts)::int,
    'likes_points', floor(likes_pts)::int,
    'completeness_points', floor(comp_pts)::int,
    'abn_points', floor(abn_pts)::int,
    'last_active_at', effective_last_active,
    'inactive_days', inactive_days,
    'activity_tier', activity_tier,
    'breakdown', br
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_profile_strength(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jc int;
  wu int;
  calc jsonb;
  comp_score int;
BEGIN
  SELECT COUNT(*)::int INTO jc
  FROM public.jobs j
  WHERE j.contractor_id = p_user_id AND j.deleted_at IS NULL;

  SELECT COUNT(*)::int INTO wu
  FROM public.previous_work pw
  WHERE pw.user_id = p_user_id;

  calc := public.calculate_profile_strength(p_user_id);
  IF calc ? 'error' THEN
    RETURN;
  END IF;

  comp_score := COALESCE((calc->>'completeness_points')::int, 0);

  UPDATE public.users u
  SET
    jobs_posted_count = jc,
    works_uploaded_count = wu,
    works_completed_count = COALESCE(u.completed_jobs, 0),
    profile_completion_score = comp_score,
    profile_strength_score = (calc->>'total')::int,
    profile_strength_band = calc->>'band',
    last_strength_calculated_at = now()
  WHERE u.id = p_user_id;
END;
$$;
