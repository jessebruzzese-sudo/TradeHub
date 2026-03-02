-- 1) Add columns for job anchor point (where the job is located)
alter table public.jobs
  add column if not exists location_place_id text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

create index if not exists idx_jobs_location_lat_lng on public.jobs (location_lat, location_lng);
create index if not exists idx_jobs_trade_category on public.jobs (trade_category);
create index if not exists idx_jobs_status on public.jobs (status);

-- 2) Simple distance function (km) using Haversine (no PostGIS required)
create or replace function public.km_distance(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
as $$
  select 6371.0 * 2.0 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2.0)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lng2 - lng1) / 2.0)), 2)
    )
  );
$$;

-- 3) RPC: jobs visible to viewer
--    - anchor: jobs.location_lat/lng
--    - viewer location: users.base_lat/base_lng
--    - radius by plan: free=20km, premium=100km
--    - optional trade filter
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
      u.base_lat::double precision as lat,
      u.base_lng::double precision as lng,
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
      or trade_filter = ''
      or j.trade_category ilike trade_filter
      or j.trade_category = trade_filter
    )
    and public.km_distance(v.lat, v.lng, j.location_lat, j.location_lng) <= v.radius_km
  order by j.created_at desc
  limit limit_count
  offset offset_count;
$$;

-- 4) Permissions (RPC callable by logged-in users)
grant execute on function public.get_jobs_visible_to_viewer(uuid, text, int, int) to authenticated;
