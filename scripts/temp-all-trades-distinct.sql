-- Deduped trade labels (A–Z). Run: npx supabase db query --linked -f scripts/temp-all-trades-distinct.sql -o json
WITH all_trades AS (
  SELECT primary_trade AS trade FROM users WHERE primary_trade IS NOT NULL
  UNION
  SELECT unnest(additional_trades) AS trade FROM users WHERE additional_trades IS NOT NULL
  UNION
  SELECT trade_category AS trade FROM jobs WHERE trade_category IS NOT NULL
)
SELECT DISTINCT trade
FROM all_trades
WHERE trade IS NOT NULL AND trade != ''
ORDER BY trade ASC;
