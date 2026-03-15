-- Fix: get_tenders_visible_to_viewer uses base_lat/base_lng only, but new users
-- have location_lat/location_lng from signup geocoding. Use COALESCE so either
-- column works. Aligns with discovery APIs (trades-near-you, search) which use
-- location_lat ?? base_lat.
--
-- Root cause: Newly created Plumbing accounts couldn't see live tenders because
-- base_lat/base_lng were never populated; signup only wrote location/postcode
-- strings. The RPC required valid viewer coords and excluded all rows when
-- both base_lat and base_lng were null.

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
      -- Use location_lat/lng when base_lat/lng are null (new users, profile edit)
      coalesce(u.base_lat, u.location_lat)::double precision as lat,
      coalesce(u.base_lng, u.location_lng)::double precision as lng,
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
      when public.tender_has_valid_coords(t.lat, t.lng)
           and v.lat is not null and v.lng is not null
           and (v.lat <> 0 or v.lng <> 0)
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
    and public.tender_has_valid_coords(t.lat, t.lng)
    and v.lat is not null and v.lng is not null
    and (v.lat <> 0 or v.lng <> 0)
    and public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision) <= v.radius_km
  order by t.created_at desc
  limit limit_count
  offset offset_count;
$$;

grant execute on function public.get_tenders_visible_to_viewer(uuid, text, int, int) to authenticated;
