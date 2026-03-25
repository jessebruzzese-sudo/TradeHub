-- Normalize deprecated trade labels: roof plumbing / stormwater -> Plumbing; Building -> Builder/Contractor.
-- Dedupe user_trades after merge; update jobs and legacy user columns.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp._normalize_trade_label(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(t)) IN ('roof plumbing / stormwater', 'roof plumbing', 'stormwater') THEN 'Plumbing'
    WHEN lower(trim(t)) = 'building' THEN 'Builder/Contractor'
    ELSE trim(t)
  END;
$$;

-- users.primary_trade
UPDATE public.users
SET primary_trade = pg_temp._normalize_trade_label(primary_trade)
WHERE primary_trade IS NOT NULL
  AND trim(primary_trade) <> ''
  AND pg_temp._normalize_trade_label(primary_trade) IS DISTINCT FROM primary_trade;

-- users.additional_trades (text[])
UPDATE public.users u
SET additional_trades = arr.new_arr
FROM (
  SELECT
    id,
    array_agg(DISTINCT pg_temp._normalize_trade_label(x) ORDER BY pg_temp._normalize_trade_label(x)) AS new_arr
  FROM public.users,
       LATERAL unnest(additional_trades) AS x
  WHERE additional_trades IS NOT NULL
    AND cardinality(additional_trades) > 0
  GROUP BY id
) arr
WHERE u.id = arr.id
  AND u.additional_trades IS DISTINCT FROM arr.new_arr;

-- users.trades (jsonb array of strings): normalize + dedupe, preserve stable order by first occurrence
UPDATE public.users u
SET trades = sub.new_json
FROM (
  SELECT
    u2.id,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(elem) ORDER BY first_ord)
        FROM (
          SELECT
            pg_temp._normalize_trade_label(t.txt) AS elem,
            MIN(t.ord) AS first_ord
          FROM jsonb_array_elements_text(COALESCE(u2.trades, '[]'::jsonb)) WITH ORDINALITY AS t(txt, ord)
          GROUP BY pg_temp._normalize_trade_label(t.txt)
        ) grouped
      ),
      '[]'::jsonb
    ) AS new_json
  FROM public.users u2
  WHERE u2.trades IS NOT NULL
    AND jsonb_typeof(u2.trades) = 'array'
    AND jsonb_array_length(COALESCE(u2.trades, '[]'::jsonb)) > 0
) sub
WHERE u.id = sub.id
  AND u.trades IS DISTINCT FROM sub.new_json;

-- user_trades: dedupe by *normalized* trade first (avoids UNIQUE violation when merging e.g. Plumbing + Roof plumbing)
DELETE FROM public.user_trades ut
WHERE EXISTS (
  SELECT 1
  FROM public.user_trades ut2
  WHERE ut2.user_id = ut.user_id
    AND pg_temp._normalize_trade_label(ut2.trade) = pg_temp._normalize_trade_label(ut.trade)
    AND ut2.id <> ut.id
    AND (
      ut2.is_primary > ut.is_primary
      OR (ut2.is_primary = ut.is_primary AND ut2.created_at < ut.created_at)
      OR (ut2.is_primary = ut.is_primary AND ut2.created_at IS NOT DISTINCT FROM ut.created_at AND ut2.id < ut.id)
    )
);

UPDATE public.user_trades ut
SET trade = pg_temp._normalize_trade_label(ut.trade)
WHERE pg_temp._normalize_trade_label(ut.trade) IS DISTINCT FROM ut.trade;

-- jobs.trade_category
UPDATE public.jobs
SET trade_category = pg_temp._normalize_trade_label(trade_category)
WHERE trade_category IS NOT NULL
  AND trim(trade_category) <> ''
  AND pg_temp._normalize_trade_label(trade_category) IS DISTINCT FROM trade_category;

COMMIT;
