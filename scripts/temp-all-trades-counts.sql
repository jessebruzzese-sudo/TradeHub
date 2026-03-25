-- Per-occurrence counts (CTE uses UNION ALL). Run: npx supabase db query --linked -f scripts/temp-all-trades-counts.sql -o json
WITH all_trades AS (
  SELECT primary_trade AS trade FROM users WHERE primary_trade IS NOT NULL
  UNION ALL
  SELECT unnest(additional_trades) AS trade FROM users WHERE additional_trades IS NOT NULL
  UNION ALL
  SELECT trade_category AS trade FROM jobs WHERE trade_category IS NOT NULL
)
SELECT trade, COUNT(*)::bigint AS usage_count
FROM all_trades
WHERE trade IS NOT NULL AND trade != ''
GROUP BY trade
ORDER BY usage_count DESC, trade ASC;
