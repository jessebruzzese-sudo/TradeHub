-- Viewer base coordinates for job discovery RPCs (radius matching)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_lat double precision;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_lng double precision;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_suburb text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_postcode text;
