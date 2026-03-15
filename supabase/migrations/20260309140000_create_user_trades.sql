-- Premium multi-trade: normalized join table for user trades
-- Keep users.primary_trade for backward compatibility and primary display
-- user_trades is source of truth for multi-trade; primary_trade is mirrored

CREATE TABLE IF NOT EXISTS public.user_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trade text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trade)
);

CREATE INDEX IF NOT EXISTS idx_user_trades_user_id ON public.user_trades(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_trades_one_primary
  ON public.user_trades(user_id) WHERE is_primary = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_user_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_trades_updated_at ON public.user_trades;
CREATE TRIGGER trigger_user_trades_updated_at
  BEFORE UPDATE ON public.user_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_user_trades_updated_at();

COMMENT ON TABLE public.user_trades IS 'Premium: user trades with primary designation. Mirrors primary_trade on users.';

ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trades"
  ON public.user_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON public.user_trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.user_trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.user_trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public profile readers: allow reading trades for visible profiles
CREATE POLICY "Public can read trades for public profiles"
  ON public.user_trades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_trades.user_id
      AND u.is_public_profile = true
    )
  );

-- Backfill: insert one row per user with primary_trade
INSERT INTO public.user_trades (user_id, trade, is_primary)
SELECT id, primary_trade, true
FROM public.users
WHERE primary_trade IS NOT NULL
  AND primary_trade <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_trades ut
    WHERE ut.user_id = users.id AND ut.trade = users.primary_trade
  )
ON CONFLICT (user_id, trade) DO NOTHING;

-- RPC: sync user trades (insert, delete, set primary, mirror users.primary_trade)
CREATE OR REPLACE FUNCTION public.update_user_trades(
  p_user_id uuid,
  p_primary_trade text,
  p_trades text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_trade text;
  v_trades text[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_user_id IS NULL OR p_user_id <> v_uid THEN
    -- Allow if admin (check is_admin on users)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_uid AND is_admin = true) THEN
      RAISE EXCEPTION 'Can only update own trades';
    END IF;
  END IF;

  -- Normalize: dedupe, filter empty, ensure primary is included
  v_trades := ARRAY(SELECT DISTINCT trim(unnest) FROM unnest(p_trades) AS t(unnest) WHERE trim(unnest) <> '');
  IF array_length(v_trades, 1) IS NULL THEN
    v_trades := ARRAY[]::text[];
  END IF;

  -- Premium enforcement: free users max 1 trade
  IF array_length(v_trades, 1) > 1 THEN
    IF NOT (
      EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_premium = true)
      OR EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND subscription_status = 'ACTIVE' AND active_plan <> 'NONE')
      OR EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND complimentary_premium_until > now())
    ) THEN
      RAISE EXCEPTION 'Multiple trades require Premium';
    END IF;
  END IF;

  IF p_primary_trade IS NULL OR trim(p_primary_trade) = '' THEN
    IF array_length(v_trades, 1) > 0 THEN
      p_primary_trade := v_trades[1];
    ELSE
      RAISE EXCEPTION 'At least one trade required';
    END IF;
  ELSE
    p_primary_trade := trim(p_primary_trade);
    IF NOT (p_primary_trade = ANY(v_trades)) THEN
      v_trades := array_prepend(p_primary_trade, v_trades);
    END IF;
  END IF;

  -- Delete removed trades
  DELETE FROM user_trades
  WHERE user_id = p_user_id
  AND trade <> ALL(v_trades);

  -- Clear previous primary
  UPDATE user_trades SET is_primary = false WHERE user_id = p_user_id;

  -- Insert/update
  FOREACH v_trade IN ARRAY v_trades
  LOOP
    INSERT INTO user_trades (user_id, trade, is_primary)
    VALUES (p_user_id, v_trade, v_trade = p_primary_trade)
    ON CONFLICT (user_id, trade) DO UPDATE SET is_primary = (v_trade = p_primary_trade);
  END LOOP;

  -- Mirror users.primary_trade
  UPDATE users SET primary_trade = p_primary_trade WHERE id = p_user_id;
END;
$$;
