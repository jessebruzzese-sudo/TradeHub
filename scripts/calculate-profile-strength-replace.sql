-- One-shot replace for public.calculate_profile_strength (aligned with users table).
-- Extra *_points / google / likes keys keep refresh_profile_strength + API parser compatible.

drop function if exists public.calculate_profile_strength(uuid);

create or replace function public.calculate_profile_strength(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users%rowtype;

  activity_points int := 0;
  links_points int := 0;
  completeness_points int := 0;
  abn_points int := 0;
  total_points int := 0;

  effective_last_active timestamptz;
  inactive_days numeric;
  band text;
begin
  select *
  into u
  from public.users
  where id = p_user_id;

  if not found then
    return jsonb_build_object(
      'total', 0,
      'band', 'LOW',
      'activity', 0,
      'links', 0,
      'completeness', 0,
      'abn', 0,
      'activity_points', 0,
      'links_points', 0,
      'completeness_points', 0,
      'abn_points', 0,
      'google_points', 0,
      'likes_points', 0,
      'last_active_at', null
    );
  end if;

  -- ACTIVITY
  effective_last_active :=
    coalesce(
      u.last_seen_at,
      u.updated_at,
      u.created_at
    );

  if effective_last_active is not null then
    inactive_days := extract(epoch from (now() - effective_last_active)) / 86400.0;

    if inactive_days <= 1 then activity_points := 32;
    elsif inactive_days <= 7 then activity_points := 24;
    elsif inactive_days <= 30 then activity_points := 16;
    elsif inactive_days <= 90 then activity_points := 8;
    else activity_points := 0;
    end if;
  end if;

  -- LINKS
  links_points :=
    least(
      12,
      (case when nullif(trim(coalesce(u.website, '')), '') is not null then 4 else 0 end) +
      (case when nullif(trim(coalesce(u.instagram, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.facebook, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.linkedin, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.tiktok, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.youtube, '')), '') is not null then 1 else 0 end)
    );

  -- COMPLETENESS
  completeness_points :=
    least(
      13,
      (case when nullif(trim(coalesce(u.bio, '')), '') is not null then 3 else 0 end) +
      (case when nullif(trim(coalesce(u.mini_bio, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.primary_trade, '')), '') is not null then 2 else 0 end) +
      (case when coalesce(array_length(u.additional_trades, 1), 0) > 0 then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.location, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.postcode, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.phone, '')), '') is not null and coalesce(u.show_phone_on_profile, false) = true then 1 else 0 end) +
      (case when coalesce(u.completed_jobs, 0) > 0 then 2 else 0 end)
    );

  -- ABN (abn_status is enum — compare via text, never coalesce to '' on enum)
  if coalesce(u.abn_verified, false) = true
     or upper(coalesce(u.abn_status::text, '')) = 'VERIFIED'
  then
    abn_points := 10;
  else
    abn_points := 0;
  end if;

  -- TOTAL
  total_points :=
    activity_points +
    links_points +
    completeness_points +
    abn_points;

  total_points := least(100, greatest(0, total_points));

  band :=
    case
      when total_points >= 70 then 'HIGH'
      when total_points >= 40 then 'MEDIUM'
      else 'LOW'
    end;

  return jsonb_build_object(
    'total', total_points,
    'band', band,
    'activity', activity_points,
    'links', links_points,
    'completeness', completeness_points,
    'abn', abn_points,
    'activity_points', activity_points,
    'links_points', links_points,
    'completeness_points', completeness_points,
    'abn_points', abn_points,
    'google_points', 0,
    'likes_points', 0,
    'last_active_at', effective_last_active
  );
end;
$$;

grant execute on function public.calculate_profile_strength(uuid) to service_role;

-- TEST (run after creation)
select public.calculate_profile_strength('8f31b6de-d21f-43a1-8a9f-ba5d5f69c276'::uuid);
