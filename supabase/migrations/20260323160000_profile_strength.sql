-- Profile Strength: credibility/completeness/activity (separate from star/review rating)

-- 1) users columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_strength_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_strength_band text NOT NULL DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS profile_likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS google_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_review_count integer,
  ADD COLUMN IF NOT EXISTS google_rating_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS works_completed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_posted_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS works_uploaded_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_completion_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_strength_calculated_at timestamptz;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_profile_strength_band_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_profile_strength_band_check
  CHECK (profile_strength_band IN ('LOW', 'MEDIUM', 'HIGH', 'ELITE'));

-- Backfill URL mirrors from legacy columns
UPDATE public.users
SET website_url = COALESCE(NULLIF(trim(website_url), ''), website)
WHERE (website_url IS NULL OR trim(website_url) = '') AND website IS NOT NULL AND trim(website) <> '';

UPDATE public.users
SET instagram_url = COALESCE(NULLIF(trim(instagram_url), ''), instagram)
WHERE (instagram_url IS NULL OR trim(instagram_url) = '') AND instagram IS NOT NULL AND trim(instagram) <> '';

UPDATE public.users
SET facebook_url = COALESCE(NULLIF(trim(facebook_url), ''), facebook)
WHERE (facebook_url IS NULL OR trim(facebook_url) = '') AND facebook IS NOT NULL AND trim(facebook) <> '';

UPDATE public.users
SET linkedin_url = COALESCE(NULLIF(trim(linkedin_url), ''), linkedin)
WHERE (linkedin_url IS NULL OR trim(linkedin_url) = '') AND linkedin IS NOT NULL AND trim(linkedin) <> '';

-- 2) profile_likes
CREATE TABLE IF NOT EXISTS public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liked_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  liked_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_likes_no_self CHECK (liked_user_id <> liked_by_user_id),
  CONSTRAINT profile_likes_unique_pair UNIQUE (liked_user_id, liked_by_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_likes_liked_user ON public.profile_likes (liked_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liked_by ON public.profile_likes (liked_by_user_id);

ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_likes_select_authenticated" ON public.profile_likes;
CREATE POLICY "profile_likes_select_authenticated"
  ON public.profile_likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profile_likes_insert_own" ON public.profile_likes;
CREATE POLICY "profile_likes_insert_own"
  ON public.profile_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = liked_by_user_id
    AND liked_user_id <> liked_by_user_id
  );

DROP POLICY IF EXISTS "profile_likes_delete_own" ON public.profile_likes;
CREATE POLICY "profile_likes_delete_own"
  ON public.profile_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = liked_by_user_id);

-- 3) Keep profile_likes_count in sync
CREATE OR REPLACE FUNCTION public.sync_profile_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET profile_likes_count = GREATEST(0, profile_likes_count + 1)
    WHERE id = NEW.liked_user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET profile_likes_count = GREATEST(0, profile_likes_count - 1)
    WHERE id = OLD.liked_user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_likes_sync_count ON public.profile_likes;
CREATE TRIGGER trg_profile_likes_sync_count
  AFTER INSERT OR DELETE ON public.profile_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_likes_count();

-- 4) Core computation (returns jsonb breakdown)
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u RECORD;
  jc int;
  wc int;
  wu int;
  recent_ts timestamptz;
  recency_pts int;
  completed_pts numeric;
  jobs_pts numeric;
  uploads_pts numeric;
  activity_total numeric;
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
  total int;
  band text;
  br jsonb;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  SELECT COUNT(*)::int INTO jc
  FROM public.jobs j
  WHERE j.contractor_id = p_user_id AND j.deleted_at IS NULL;

  SELECT COUNT(*)::int INTO wu
  FROM public.previous_work pw
  WHERE pw.user_id = p_user_id;

  wc := COALESCE(u.completed_jobs, 0);

  completed_pts := LEAST(20::numeric, wc::numeric * 2::numeric);
  jobs_pts := LEAST(8::numeric, jc::numeric);
  uploads_pts := LEAST(8::numeric, wu::numeric);

  SELECT GREATEST(
    COALESCE(u.updated_at, 'epoch'::timestamptz),
    COALESCE((SELECT MAX(j.created_at) FROM public.jobs j WHERE j.contractor_id = p_user_id AND j.deleted_at IS NULL), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(pw.created_at) FROM public.previous_work pw WHERE pw.user_id = p_user_id), 'epoch'::timestamptz)
  ) INTO recent_ts;

  IF recent_ts > (now() - interval '30 days') THEN
    recency_pts := 4;
  ELSE
    recency_pts := 0;
  END IF;

  activity_total := LEAST(40::numeric, completed_pts + jobs_pts + uploads_pts + recency_pts::numeric);

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
  IF u.abn_verified IS TRUE THEN comp := comp + 4; END IF;
  comp_pts := LEAST(15::numeric, comp::numeric);

  total := LEAST(
    100,
    GREATEST(
      0,
      floor(
        activity_total + link_pts + google_pts + likes_pts + comp_pts
      )::int
    )
  );

  IF total >= 85 THEN band := 'ELITE';
  ELSIF total >= 65 THEN band := 'HIGH';
  ELSIF total >= 40 THEN band := 'MEDIUM';
  ELSE band := 'LOW';
  END IF;

  br := jsonb_build_object(
    'works_completed', wc,
    'jobs_posted', jc,
    'works_uploaded', wu,
    'recency_points', recency_pts,
    'links_count', link_count
  );

  RETURN jsonb_build_object(
    'total', total,
    'band', band,
    'activity', floor(activity_total)::int,
    'links', floor(link_pts)::int,
    'google', floor(google_pts)::int,
    'likes', floor(likes_pts)::int,
    'completeness', floor(comp_pts)::int,
    'breakdown', br,
    'activity_detail', jsonb_build_object(
      'works_completed_points', floor(completed_pts)::int,
      'jobs_posted_points', floor(jobs_pts)::int,
      'works_uploaded_points', floor(uploads_pts)::int,
      'recency_points', recency_pts
    )
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

  comp_score := (calc->>'completeness')::int;

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

GRANT EXECUTE ON FUNCTION public.calculate_profile_strength(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_profile_strength(uuid) TO service_role;

COMMENT ON TABLE public.profile_likes IS 'One profile “like” per viewer; capped contribution to profile strength score.';
COMMENT ON FUNCTION public.calculate_profile_strength(uuid) IS 'Compute profile strength 0–100 + band + category breakdown (not star rating).';
COMMENT ON FUNCTION public.refresh_profile_strength(uuid) IS 'Persist denormalized counts and profile strength scores for a user.';
