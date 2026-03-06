-- Add is_anonymous parameter to create_tender RPC
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.create_tender(text, text, text, text, int, int, text[], date, date, jsonb);

CREATE OR REPLACE FUNCTION public.create_tender(
  p_project_name text,
  p_description text,
  p_suburb text,
  p_postcode text,
  p_budget_min_cents int,
  p_budget_max_cents int,
  p_trades text[],
  p_desired_start_date date,
  p_desired_end_date date,
  p_shared_attachments jsonb,
  p_is_anonymous boolean DEFAULT false
)
RETURNS public.tenders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user public.users;
  v_t public.tenders;
  v_trade text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_user
  FROM public.users
  WHERE id = v_uid
    AND deleted_at IS NULL;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid AND deleted_at IS NULL AND abn_status = 'VERIFIED'
  ) THEN
    RAISE EXCEPTION 'abn_verification_required';
  END IF;

  IF coalesce(trim(p_project_name), '') = '' THEN
    RAISE EXCEPTION 'project_name_required';
  END IF;

  IF coalesce(trim(p_suburb), '') = '' OR coalesce(trim(p_postcode), '') = '' THEN
    RAISE EXCEPTION 'location_required';
  END IF;

  IF p_trades IS NULL OR array_length(p_trades, 1) IS NULL OR array_length(p_trades, 1) = 0 THEN
    RAISE EXCEPTION 'trades_required';
  END IF;

  INSERT INTO public.tenders (
    builder_id,
    project_name,
    project_description,
    suburb,
    postcode,
    lat,
    lng,
    tier,
    budget_min_cents,
    budget_max_cents,
    desired_start_date,
    desired_end_date,
    shared_attachments,
    is_anonymous,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_uid,
    p_project_name,
    p_description,
    p_suburb,
    p_postcode,
    0,
    0,
    'FREE_TRIAL',
    p_budget_min_cents,
    p_budget_max_cents,
    p_desired_start_date,
    p_desired_end_date,
    coalesce(p_shared_attachments, '[]'::jsonb),
    coalesce(p_is_anonymous, false),
    'DRAFT',
    now(),
    now()
  )
  RETURNING *
  INTO v_t;

  FOREACH v_trade IN ARRAY p_trades
  LOOP
    IF coalesce(trim(v_trade), '') <> '' THEN
      INSERT INTO public.tender_trade_requirements (tender_id, trade, sub_description, created_at, updated_at)
      VALUES (v_t.id, trim(v_trade), '', now(), now())
      ON CONFLICT (tender_id, trade) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tender(text, text, text, text, int, int, text[], date, date, jsonb, boolean) TO authenticated;
