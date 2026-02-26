/*
  # set_abn_verified trigger

  Automatically sets abn_verified and abn_verified_at when the abn column
  is inserted or updated on public.users.
*/

-- Add abn_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'abn_verified'
  ) THEN
    ALTER TABLE public.users ADD COLUMN abn_verified boolean DEFAULT false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_abn_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.abn IS NOT NULL AND length(trim(NEW.abn)) > 0 THEN
    NEW.abn_verified := true;
    IF NEW.abn_verified_at IS NULL THEN
      NEW.abn_verified_at := now();
    END IF;
  ELSE
    NEW.abn_verified := false;
    NEW.abn_verified_at := null;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_abn_verified ON public.users;

CREATE TRIGGER trg_set_abn_verified
  BEFORE INSERT OR UPDATE OF abn
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_abn_verified();
