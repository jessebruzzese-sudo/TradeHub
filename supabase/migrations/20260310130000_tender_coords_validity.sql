-- Tender coordinate validity: remove 0/0 fallback, require valid coords for discovery
-- 1. create_tender: accept optional p_lat, p_lng; use null instead of 0 when invalid
-- 2. get_tenders_visible_to_viewer: exclude tenders with missing/invalid coords from Find Work discovery

-- Helper: valid coords = both finite, not null, not (0,0), within lat -90..90, lng -180..180
create or replace function public.tender_has_valid_coords(
  p_lat double precision,
  p_lng double precision
)
returns boolean
language sql
immutable
as $$
  select
    p_lat is not null
    and p_lng is not null
    and (p_lat <> 0 or p_lng <> 0)
    and p_lat >= -90 and p_lat <= 90
    and p_lng >= -180 and p_lng <= 180
    and abs(p_lat) < 1e10
    and abs(p_lng) < 1e10;
$$;

-- Drop old create_tender, add p_lat, p_lng
drop function if exists public.create_tender(text, text, text, text, int, int, text[], date, date, jsonb, boolean);

create or replace function public.create_tender(
  p_project_name text,
  p_description text,
  p_suburb text,
  p_postcode text,
  p_budget_min_cents int,
  p_budget_max_cents int,
  p_trades text[],
  p_desired_start_date date,
  p_desired_end_date date,
  p_shared_attachments jsonb,
  p_is_anonymous boolean default false,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.tenders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users;
  v_t public.tenders;
  v_trade text;
  v_lat double precision;
  v_lng double precision;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_user
  from public.users
  where id = v_uid and deleted_at is null;

  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_uid and deleted_at is null and abn_status = 'VERIFIED'
  ) then
    raise exception 'abn_verification_required';
  end if;

  if coalesce(trim(p_project_name), '') = '' then
    raise exception 'project_name_required';
  end if;

  if coalesce(trim(p_suburb), '') = '' or coalesce(trim(p_postcode), '') = '' then
    raise exception 'location_required';
  end if;

  if p_trades is null or array_length(p_trades, 1) is null or array_length(p_trades, 1) = 0 then
    raise exception 'trades_required';
  end if;

  -- Use provided coords only if valid; otherwise null (no 0/0 fallback)
  if public.tender_has_valid_coords(p_lat, p_lng) then
    v_lat := p_lat;
    v_lng := p_lng;
  else
    v_lat := null;
    v_lng := null;
  end if;

  insert into public.tenders (
    builder_id,
    project_name,
    project_description,
    suburb,
    postcode,
    lat,
    lng,
    tier,
    budget_min_cents,
    budget_max_cents,
    desired_start_date,
    desired_end_date,
    shared_attachments,
    is_anonymous,
    status,
    created_at,
    updated_at
  )
  values (
    v_uid,
    p_project_name,
    p_description,
    p_suburb,
    p_postcode,
    v_lat,
    v_lng,
    'FREE_TRIAL',
    p_budget_min_cents,
    p_budget_max_cents,
    p_desired_start_date,
    p_desired_end_date,
    coalesce(p_shared_attachments, '[]'::jsonb),
    coalesce(p_is_anonymous, false),
    'DRAFT',
    now(),
    now()
  )
  returning * into v_t;

  foreach v_trade in array p_trades loop
    if coalesce(trim(v_trade), '') <> '' then
      insert into public.tender_trade_requirements (tender_id, trade, sub_description, created_at, updated_at)
      values (v_t.id, trim(v_trade), '', now(), now())
      on conflict (tender_id, trade) do nothing;
    end if;
  end loop;

  return v_t;
end;
$$;

grant execute on function public.create_tender(text, text, text, text, int, int, text[], date, date, jsonb, boolean, double precision, double precision) to authenticated;

-- get_tenders_visible_to_viewer: exclude tenders with missing/invalid coords from Find Work discovery
-- Radius filtering only when BOTH tender and viewer have valid coordinates.
-- Owner/admin visibility: handled by caller (tender detail page fetches by id); this RPC is for discovery only.
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
    -- Tenders with missing or invalid coords are NOT included in Find Work discovery
    and public.tender_has_valid_coords(t.lat, t.lng)
    -- Viewer must have valid coords for radius filtering
    and v.lat is not null and v.lng is not null
    and (v.lat <> 0 or v.lng <> 0)
    -- Radius filter: only when both have valid coords
    and public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision) <= v.radius_km
  order by t.created_at desc
  limit limit_count
  offset offset_count;
$$;

grant execute on function public.get_tenders_visible_to_viewer(uuid, text, int, int) to authenticated;
