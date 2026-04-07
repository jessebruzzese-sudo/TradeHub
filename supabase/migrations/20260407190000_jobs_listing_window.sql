-- Job listings: visible for 30 days from created_at (not work/scheduled dates).
-- 1) Restrict discovery RPC to recent jobs.
-- 2) Server-side purge of rows older than 30 days (called from app cron with service role).

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
      (
        case
          when (
            coalesce(u.is_premium, false) = true
            or (u.premium_until is not null and u.premium_until > now())
            or coalesce(u.active_plan, '') ilike '%premium%'
          )
          and u.search_lat is not null and u.search_lng is not null
          then u.search_lat::double precision
          else u.location_lat::double precision
        end
      ) as lat,
      (
        case
          when (
            coalesce(u.is_premium, false) = true
            or (u.premium_until is not null and u.premium_until > now())
            or coalesce(u.active_plan, '') ilike '%premium%'
          )
          and u.search_lat is not null and u.search_lng is not null
          then u.search_lng::double precision
          else u.location_lng::double precision
        end
      ) as lng,
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
    and j.created_at >= (now() - interval '30 days')
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

-- Hard-delete jobs past the listing window (cascades per FK rules).
create or replace function public.purge_expired_job_listings()
returns bigint
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.jobs
    where created_at < (now() - interval '30 days')
    returning 1
  )
  select count(*)::bigint from deleted;
$$;

revoke all on function public.purge_expired_job_listings() from public;
grant execute on function public.purge_expired_job_listings() to service_role;
