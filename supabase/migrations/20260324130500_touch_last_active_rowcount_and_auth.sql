-- Fix touch_last_active_if_stale: correct ROW_COUNT handling + restrict authenticated callers to own row

CREATE OR REPLACE FUNCTION public.touch_last_active_if_stale(
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  UPDATE public.users u
  SET last_active_at = p_now
  WHERE u.id = p_user_id
    AND (
      u.last_active_at IS NULL
      OR u.last_active_at < (p_now - interval '6 hours')
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

COMMENT ON FUNCTION public.touch_last_active_if_stale(uuid, timestamptz)
  IS 'Updates users.last_active_at only when null or older than 6 hours. Authenticated callers may only touch their own row.';
