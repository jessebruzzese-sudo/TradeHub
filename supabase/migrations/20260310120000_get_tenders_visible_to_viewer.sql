-- get_tenders_visible_to_viewer: trade + radius filtering for tender discovery
-- Mirrors get_jobs_visible_to_viewer logic. AI-generated and manual tenders use same tender_trade_requirements.
-- trade_filter: pipe-separated (e.g. 'Plumbing|Electrical|Plastering / Gyprock')
-- Radius: free=20km, premium=100km. When tender lat/lng are null or 0, include (no radius filter).

create or replace function public.get_tenders_visible_to_viewer(
  viewer_id uuid,
  trade_filter text default null,
  limit_count int default 50,
  offset_count int default 0
)
returns table (
  id uuid,
  builder_id uuid,
  status text,
  tier text,
  is_anonymous boolean,
  is_name_hidden boolean,
  project_name text,
  project_description text,
  suburb text,
  postcode text,
  lat double precision,
  lng double precision,
  desired_start_date date,
  desired_end_date date,
  budget_min_cents bigint,
  budget_max_cents bigint,
  created_at timestamptz,
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
        when u.active_plan is not null and u.active_plan::text ilike '%premium%' then 100
        else 20
      end as radius_km
    from public.users u
    where u.id = viewer_id
  ),
  tender_trades as (
    select distinct t.id as tender_id
    from public.tenders t
    join public.tender_trade_requirements tr on tr.tender_id = t.id
    where (
      coalesce(trim(trade_filter), '') = ''
      or tr.trade = any(string_to_array(trim(trade_filter), '|'))
    )
  )
  select
    t.id,
    t.builder_id,
    t.status,
    t.tier,
    t.is_anonymous,
    t.is_name_hidden,
    t.project_name,
    t.project_description,
    t.suburb,
    t.postcode,
    t.lat::double precision,
    t.lng::double precision,
    t.desired_start_date,
    t.desired_end_date,
    t.budget_min_cents,
    t.budget_max_cents,
    t.created_at,
    case
      when t.lat is not null and t.lng is not null and (t.lat <> 0 or t.lng <> 0)
           and v.lat is not null and v.lng is not null
      then public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision)
      else null
    end as distance_km,
    v.radius_km::int as viewer_radius_km
  from public.tenders t
  join v on true
  join tender_trades tt on tt.tender_id = t.id
  where
    t.deleted_at is null
    and t.status in ('PUBLISHED', 'LIVE')
    and t.builder_id <> viewer_id
    and (
      -- No radius filter when tender or viewer lacks coords
      (t.lat is null or t.lng is null or (t.lat = 0 and t.lng = 0))
      or (v.lat is null or v.lng is null)
      or public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision) <= v.radius_km
    )
  order by t.created_at desc
  limit limit_count
  offset offset_count;
$$;

grant execute on function public.get_tenders_visible_to_viewer(uuid, text, int, int) to authenticated;
