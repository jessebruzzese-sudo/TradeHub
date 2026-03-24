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
  google_status text;
  google_rating_value numeric;
  google_review_count_value int;
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
  google_status := upper(COALESCE(u.google_listing_verification_status, 'UNVERIFIED'));
  google_rating_value := COALESCE(u.google_business_rating, u.google_rating);
  google_review_count_value := COALESCE(u.google_business_review_count, u.google_review_count);
  google_pts := 0::numeric;
  IF g IS NOT NULL AND g <> '' THEN
    google_pts := google_pts + 4::numeric;
    IF google_rating_value IS NOT NULL AND google_review_count_value IS NOT NULL THEN
      google_pts := google_pts + 4::numeric;
    END IF;
    IF google_status = 'SELF_CONFIRMED' THEN
      google_pts := google_pts + 3::numeric;
    ELSIF google_status = 'VERIFIED' THEN
      google_pts := google_pts + 8::numeric;
      IF (
        (COALESCE(u.abn_verified, false) IS TRUE OR upper(COALESCE(u.abn_status::text, '')) = 'VERIFIED')
        AND COALESCE(google_rating_value, 0) >= 4.5
        AND COALESCE(google_review_count_value, 0) >= 10
      ) THEN
        google_pts := google_pts + 1::numeric;
      END IF;
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
