-- Premium multi-location: additional saved locations per user
-- Primary/base location stays on public.users (location, postcode, location_lat, location_lng)
-- Additional locations stored in public.user_locations

CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text,
  location text NOT NULL,
  postcode text,
  lat double precision,
  lng double precision,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);

COMMENT ON TABLE public.user_locations IS 'Premium: additional service locations per user. Primary location stays on users.';

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own locations"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations"
  ON public.user_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations"
  ON public.user_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
