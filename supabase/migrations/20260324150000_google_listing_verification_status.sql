ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_business_name text,
  ADD COLUMN IF NOT EXISTS google_business_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_business_rating numeric,
  ADD COLUMN IF NOT EXISTS google_business_review_count integer,
  ADD COLUMN IF NOT EXISTS google_listing_claimed_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_listing_verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS google_listing_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_listing_verification_method text,
  ADD COLUMN IF NOT EXISTS google_listing_verified_by uuid,
  ADD COLUMN IF NOT EXISTS google_listing_rejection_reason text;

-- keep legacy and canonical columns aligned while old clients still exist
UPDATE public.users
SET google_business_rating = COALESCE(google_business_rating, google_rating)
WHERE google_business_rating IS NULL AND google_rating IS NOT NULL;

UPDATE public.users
SET google_business_review_count = COALESCE(google_business_review_count, google_review_count)
WHERE google_business_review_count IS NULL AND google_review_count IS NOT NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_google_listing_verification_status_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_google_listing_verification_status_check
  CHECK (
    google_listing_verification_status IN (
      'UNVERIFIED',
      'SELF_CONFIRMED',
      'PENDING_REVIEW',
      'VERIFIED',
      'REJECTED'
    )
  );

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_google_business_rating_range_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_google_business_rating_range_check
  CHECK (
    google_business_rating IS NULL
    OR (google_business_rating >= 0 AND google_business_rating <= 5)
  );

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_google_business_review_count_nonnegative_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_google_business_review_count_nonnegative_check
  CHECK (
    google_business_review_count IS NULL
    OR google_business_review_count >= 0
  );

UPDATE public.users
SET
  google_listing_claimed_by_user = true,
  google_listing_verification_status = 'SELF_CONFIRMED'
WHERE COALESCE(trim(google_business_url), '') <> ''
  AND COALESCE(google_rating_verified, false) = true
  AND google_listing_verification_status = 'UNVERIFIED';

UPDATE public.users
SET google_listing_verification_status = 'UNVERIFIED'
WHERE google_listing_verification_status IS NULL
   OR trim(google_listing_verification_status) = '';
