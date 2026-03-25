/*
  ABN persistence & verification semantics

  1. Replace set_abn_verified: do NOT infer verification from non-empty abn.
  2. On cleared/empty abn: reset abn, abn_verified, abn_verified_at, abn_status -> UNVERIFIED.
  3. handle_new_user: normalize abn to digits-only; set UNVERIFIED + explicit flags unless
     metadata shows ABR success (abn_abr_verified / abnVerified / abn_verified boolean true).
*/

-- ---------------------------------------------------------------------------
-- Trigger: only clear / normalize empty ABN — never auto-verify
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_abn_verified ON public.users;
DROP FUNCTION IF EXISTS public.set_abn_verified();

CREATE OR REPLACE FUNCTION public.trg_users_abn_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.abn IS NULL OR btrim(COALESCE(NEW.abn, '')) = '' THEN
    NEW.abn := NULL;
    NEW.abn_verified := false;
    NEW.abn_verified_at := NULL;
    NEW.abn_status := 'UNVERIFIED'::public.abn_verification_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_abn_invariants
  BEFORE INSERT OR UPDATE OF abn
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_users_abn_invariants();

-- ---------------------------------------------------------------------------
-- Auth signup profile upsert: persist ABN + verification from raw_user_meta_data
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_abn text;
  v_abr boolean;
  v_ver_at timestamptz;
  v_biz text;
  v_entity text;
  v_status public.abn_verification_status;
  v_abn_ver boolean;
  v_ver_at_out timestamptz;
BEGIN
  v_abn := NULLIF(regexp_replace(btrim(COALESCE(NEW.raw_user_meta_data->>'abn', '')), '\D', '', 'g'), '');

  v_abr := (
    COALESCE(NEW.raw_user_meta_data->>'abn_abr_verified', '') IN ('true', 't', '1')
    OR COALESCE(NEW.raw_user_meta_data->>'abnVerified', '') IN ('true', 't', '1')
    OR COALESCE(NEW.raw_user_meta_data->>'abn_verified', '') IN ('true', 't', '1')
  );

  v_ver_at := NULL;
  BEGIN
    IF NEW.raw_user_meta_data->>'abn_verified_at' IS NOT NULL
       AND btrim(NEW.raw_user_meta_data->>'abn_verified_at') <> '' THEN
      v_ver_at := (NEW.raw_user_meta_data->>'abn_verified_at')::timestamptz;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_ver_at := NULL;
  END;

  v_biz := NULLIF(btrim(COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'businessName',
    ''
  )), '');

  v_entity := NULLIF(btrim(COALESCE(
    NEW.raw_user_meta_data->>'abn_entity_name',
    NEW.raw_user_meta_data->>'abnEntityName',
    ''
  )), '');

  IF v_abn IS NOT NULL AND v_abr THEN
    v_status := 'VERIFIED'::public.abn_verification_status;
    v_abn_ver := true;
    v_ver_at_out := COALESCE(v_ver_at, now());
  ELSIF v_abn IS NOT NULL THEN
    v_status := 'UNVERIFIED'::public.abn_verification_status;
    v_abn_ver := false;
    v_ver_at_out := NULL;
  ELSE
    v_status := 'UNVERIFIED'::public.abn_verification_status;
    v_abn_ver := false;
    v_ver_at_out := NULL;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    primary_trade,
    business_name,
    abn,
    abn_status,
    abn_verified,
    abn_verified_at,
    location,
    postcode,
    trust_status,
    rating,
    completed_jobs,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'contractor'),
    NEW.raw_user_meta_data->>'primary_trade',
    CASE
      WHEN v_abn IS NOT NULL AND v_abr AND v_entity IS NOT NULL THEN v_entity
      WHEN v_abn IS NOT NULL AND v_abr AND v_biz IS NOT NULL THEN v_biz
      WHEN v_biz IS NOT NULL THEN v_biz
      ELSE NULL
    END,
    v_abn,
    v_status,
    v_abn_ver,
    v_ver_at_out,
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'postcode',
    'pending',
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    role = COALESCE(EXCLUDED.role, users.role),
    primary_trade = COALESCE(EXCLUDED.primary_trade, users.primary_trade),
    business_name = COALESCE(EXCLUDED.business_name, users.business_name),
    abn = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn
      ELSE users.abn
    END,
    abn_status = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_status
      ELSE users.abn_status
    END,
    abn_verified = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_verified
      ELSE users.abn_verified
    END,
    abn_verified_at = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_verified_at
      ELSE users.abn_verified_at
    END,
    location = COALESCE(EXCLUDED.location, users.location),
    postcode = COALESCE(EXCLUDED.postcode, users.postcode),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
