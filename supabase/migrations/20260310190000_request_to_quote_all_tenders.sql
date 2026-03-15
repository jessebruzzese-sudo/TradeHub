-- Allow request_to_quote for both anonymous and non-anonymous tenders
-- Privacy: anonymous tenders still hide poster identity until acceptance (enforced by UI)
-- Non-anonymous tenders: same flow (notification, accept/decline, messaging redirect)

CREATE OR REPLACE FUNCTION public.request_to_quote(p_tender_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_builder uuid;
  v_request_id uuid;
  v_requester_name text;
  v_tender_title text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT t.builder_id, t.project_name
  INTO v_builder, v_tender_title
  FROM public.tenders t
  WHERE t.id = p_tender_id AND t.deleted_at IS NULL;

  IF v_builder IS NULL THEN
    RAISE EXCEPTION 'tender_not_found';
  END IF;

  SELECT COALESCE(u.business_name, u.name, 'A trade business')
  INTO v_requester_name
  FROM public.users u
  WHERE u.id = v_uid AND u.deleted_at IS NULL;

  IF v_requester_name IS NULL OR trim(v_requester_name) = '' THEN
    v_requester_name := 'A trade business';
  END IF;

  INSERT INTO public.tender_quote_requests (tender_id, requester_id, status)
  VALUES (p_tender_id, v_uid, 'PENDING')
  ON CONFLICT (tender_id, requester_id) DO UPDATE
    SET status = 'PENDING',
        updated_at = now()
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    SELECT id INTO v_request_id FROM public.tender_quote_requests
    WHERE tender_id = p_tender_id AND requester_id = v_uid;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, description, data, link)
  VALUES (
    v_builder,
    'QUOTE_REQUEST',
    v_requester_name || ' requested to quote on your tender: ' || COALESCE(v_tender_title, 'Untitled'),
    v_requester_name || ' requested to quote on your tender: ' || COALESCE(v_tender_title, 'Untitled'),
    jsonb_build_object(
      'tender_id', p_tender_id,
      'requester_id', v_uid,
      'request_id', v_request_id,
      'requester_name', v_requester_name,
      'tender_title', v_tender_title
    ),
    '/tenders/' || p_tender_id
  );
END;
$$;
