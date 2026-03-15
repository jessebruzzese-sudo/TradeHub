-- Debug: Why a Plumbing user cannot see a live tender with Plumbing
-- Run in Supabase SQL Editor. Replace YOUR_VIEWER_ID and YOUR_TENDER_ID with real UUIDs.
--
-- Find IDs:
--   Tender: SELECT id, suburb, status FROM tenders t
--     JOIN tender_trade_requirements tr ON tr.tender_id = t.id
--     WHERE tr.trade = 'Plumbing' AND t.status IN ('PUBLISHED','LIVE') LIMIT 5;
--   User:  SELECT id, email, primary_trade FROM users
--     WHERE primary_trade = 'Plumbing' OR trades::text ILIKE '%Plumbing%' LIMIT 5;

-- 1. Tender record
SELECT t.id, t.status, t.deleted_at, t.lat, t.lng, t.suburb, t.postcode,
  public.tender_has_valid_coords(t.lat, t.lng) AS tender_coords_valid
FROM tenders t WHERE t.id = 'YOUR_TENDER_ID'::uuid;

-- 2. Tender trade requirements (must include 'Plumbing')
SELECT * FROM tender_trade_requirements WHERE tender_id = 'YOUR_TENDER_ID'::uuid;

-- 3. Viewer profile (RPC uses coalesce(base_lat, location_lat))
SELECT id, primary_trade, trades, location, postcode,
  base_lat, base_lng, location_lat, location_lng,
  coalesce(base_lat, location_lat) AS effective_lat,
  coalesce(base_lng, location_lng) AS effective_lng,
  CASE WHEN coalesce(is_premium, false) THEN 100
    WHEN premium_until > now() THEN 100
    WHEN active_plan::text ILIKE '%premium%' THEN 100 ELSE 20 END AS radius_km
FROM users WHERE id = 'YOUR_VIEWER_ID'::uuid;

-- 4. Manual visibility check
SELECT
  public.tender_has_valid_coords(t.lat, t.lng) AS tender_coords_ok,
  (coalesce(u.base_lat, u.location_lat) IS NOT NULL AND coalesce(u.base_lng, u.location_lng) IS NOT NULL) AS viewer_has_coords,
  public.km_distance(
    coalesce(u.base_lat, u.location_lat)::double precision,
    coalesce(u.base_lng, u.location_lng)::double precision,
    t.lat::double precision, t.lng::double precision
  ) AS distance_km,
  (CASE WHEN coalesce(u.is_premium, false) THEN 100 WHEN u.premium_until > now() THEN 100
    WHEN u.active_plan::text ILIKE '%premium%' THEN 100 ELSE 20 END) AS radius_km
FROM users u, tenders t
WHERE u.id = 'YOUR_VIEWER_ID'::uuid AND t.id = 'YOUR_TENDER_ID'::uuid;
