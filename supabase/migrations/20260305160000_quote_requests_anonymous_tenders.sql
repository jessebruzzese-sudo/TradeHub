-- Quote requests for anonymous tenders
-- 1) Add is_anonymous to tenders
-- 2) Create tender_quote_requests table
-- 3) Add data column to notifications (for structured payload)
-- 4) Create user_trade_quote_credits table
-- 5) Create is_premium_user helper (if not exists)
-- 6) RPCs: request_to_quote, accept_quote_request, decline_quote_request

-- A) Add is_anonymous to tenders
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- B) Quote requests table
CREATE TABLE IF NOT EXISTS public.tender_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_quote_requests_tender_id ON public.tender_quote_requests(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_quote_requests_requester_id ON public.tender_quote_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_tender_quote_requests_status ON public.tender_quote_requests(status);

ALTER TABLE public.tender_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poster can view quote requests for own tenders"
  ON public.tender_quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders
      WHERE tenders.id = tender_quote_requests.tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

CREATE POLICY "Requester can view own quote requests"
  ON public.tender_quote_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- C) Add data column to notifications (for structured payload)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications(user_id, created_at DESC);

-- D) Quote credits (3 per trade for free users)
CREATE TABLE IF NOT EXISTS public.user_trade_quote_credits (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trade_slug text NOT NULL,
  used_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, trade_slug)
);

ALTER TABLE public.user_trade_quote_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quote credits"
  ON public.user_trade_quote_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- E) is_premium_user helper (use uid to match existing signature)
CREATE OR REPLACE FUNCTION public.is_premium_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT is_premium FROM public.users WHERE id = uid AND deleted_at IS NULL), false);
$$;

-- F) RPC: request_to_quote
CREATE OR REPLACE FUNCTION public.request_to_quote(p_tender_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_builder uuid;
  v_is_anonymous boolean;
  v_request_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT builder_id, is_anonymous
  INTO v_builder, v_is_anonymous
  FROM public.tenders
  WHERE id = p_tender_id AND deleted_at IS NULL;

  IF v_builder IS NULL THEN
    RAISE EXCEPTION 'tender_not_found';
  END IF;

  IF v_is_anonymous IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'tender_not_anonymous';
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
    'New request to quote on your tender',
    'A trade business wants to quote on your tender.',
    jsonb_build_object('tender_id', p_tender_id, 'requester_id', v_uid, 'request_id', v_request_id),
    '/tenders/' || p_tender_id
  );
END;
$$;

-- G) RPC: accept_quote_request (consumes requester's quota)
CREATE OR REPLACE FUNCTION public.accept_quote_request(p_request_id uuid, p_trade_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tender_id uuid;
  v_builder_id uuid;
  v_requester_id uuid;
  v_status text;
  v_used int;
  v_is_premium boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.tender_id, r.requester_id, r.status
  INTO v_tender_id, v_requester_id, v_status
  FROM public.tender_quote_requests r
  WHERE r.id = p_request_id;

  IF v_tender_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  SELECT builder_id
  INTO v_builder_id
  FROM public.tenders
  WHERE id = v_tender_id AND deleted_at IS NULL;

  IF v_builder_id <> v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  v_is_premium := public.is_premium_user(v_requester_id);

  IF NOT v_is_premium THEN
    INSERT INTO public.user_trade_quote_credits (user_id, trade_slug, used_count)
    VALUES (v_requester_id, p_trade_slug, 0)
    ON CONFLICT (user_id, trade_slug) DO NOTHING;

    SELECT used_count INTO v_used
    FROM public.user_trade_quote_credits
    WHERE user_id = v_requester_id AND trade_slug = p_trade_slug;

    IF v_used >= 3 THEN
      RAISE EXCEPTION 'quote_trade_limit_reached';
    END IF;

    UPDATE public.user_trade_quote_credits
      SET used_count = used_count + 1
    WHERE user_id = v_requester_id AND trade_slug = p_trade_slug;
  END IF;

  UPDATE public.tender_quote_requests
    SET status = 'ACCEPTED',
        updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, description, data, link)
  VALUES (
    v_requester_id,
    'QUOTE_REQUEST_ACCEPTED',
    'Your quote request was accepted',
    'The tender poster has accepted your request to quote.',
    jsonb_build_object('tender_id', v_tender_id, 'trade_slug', p_trade_slug),
    '/tenders/' || v_tender_id
  );
END;
$$;

-- H) RPC: decline_quote_request
CREATE OR REPLACE FUNCTION public.decline_quote_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tender_id uuid;
  v_builder_id uuid;
  v_requester_id uuid;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.tender_id, r.requester_id, r.status
  INTO v_tender_id, v_requester_id, v_status
  FROM public.tender_quote_requests r
  WHERE r.id = p_request_id;

  IF v_tender_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  SELECT builder_id
  INTO v_builder_id
  FROM public.tenders
  WHERE id = v_tender_id AND deleted_at IS NULL;

  IF v_builder_id <> v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  UPDATE public.tender_quote_requests
    SET status = 'DECLINED',
        updated_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_to_quote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_quote_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_quote_request(uuid) TO authenticated;
