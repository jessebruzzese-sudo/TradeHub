-- Fix: get_jobs_visible_to_viewer uses base_lat/base_lng only. Use COALESCE with
-- location_lat/location_lng so new users (who have coords from signup geocoding)
-- can see jobs. Mirrors tender discovery fix in 20260310140000.

create or replace function public.get_jobs_visible_to_viewer(
  viewer_id uuid,
  trade_filter text default null,
  limit_count int default 50,
  offset_count int default 0
)
returns table (
  id uuid,
  contractor_id uuid,
  title text,
  description text,
  trade_category text,
  location text,
  postcode text,
  dates jsonb,
  start_time text,
  duration integer,
  pay_type text,
  rate numeric,
  attachments jsonb,
  status text,
  created_at timestamptz,
  location_lat double precision,
  location_lng double precision,
  distance_km double precision,
  viewer_radius_km int
)
language sql
security definer
set search_path = public
as $$
  with v as (
    select
      u.id,
      coalesce(u.base_lat, u.location_lat)::double precision as lat,
      coalesce(u.base_lng, u.location_lng)::double precision as lng,
      case
        when coalesce(u.is_premium, false) = true then 100
        when u.premium_until is not null and u.premium_until > now() then 100
        when coalesce(u.active_plan, '') ilike '%premium%' then 100
        else 20
      end as radius_km
    from public.users u
    where u.id = viewer_id
  )
  select
    j.id,
    j.contractor_id,
    j.title,
    j.description,
    j.trade_category,
    j.location,
    j.postcode,
    j.dates,
    j.start_time,
    j.duration,
    j.pay_type,
    j.rate,
    j.attachments,
    j.status,
    j.created_at,
    j.location_lat,
    j.location_lng,
    public.km_distance(v.lat, v.lng, j.location_lat, j.location_lng) as distance_km,
    v.radius_km as viewer_radius_km
  from public.jobs j
  join v on true
  where
    j.status = 'open'
    and j.location_lat is not null
    and j.location_lng is not null
    and v.lat is not null
    and v.lng is not null
    and (
      trade_filter is null
      or trim(trade_filter) = ''
      or j.trade_category = any(string_to_array(trim(trade_filter), '|'))
    )
    and public.km_distance(v.lat, v.lng, j.location_lat, j.location_lng) <= v.radius_km
  order by j.created_at desc
  limit limit_count
  offset offset_count;
$$;
