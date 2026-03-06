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
  p_shared_attachments jsonb
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
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_user
  from public.users
  where id = v_uid
    and deleted_at is null;

  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  -- Check ABN via subquery to avoid enum cast issues (abn_status is abn_verification_status enum)
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
    0,
    0,
    'FREE_TRIAL',
    p_budget_min_cents,
    p_budget_max_cents,
    p_desired_start_date,
    p_desired_end_date,
    coalesce(p_shared_attachments, '[]'::jsonb),
    'DRAFT',
    now(),
    now()
  )
  returning *
  into v_t;

  -- Create per-trade requirement rows (this is your real "trade caps" mechanism)
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

grant execute on function public.create_tender(
  text,
  text,
  text,
  text,
  int,
  int,
  text[],
  date,
  date,
  jsonb
) to authenticated;

-- publish_tender: validate and set status to LIVE
drop function if exists public.publish_tender(uuid);
create or replace function public.publish_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
  v_user public.users;
  v_trade_count int;
  v_active_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if v_t.status <> 'DRAFT' then
    raise exception 'not_ready';
  end if;

  select count(*) into v_trade_count from public.tender_trade_requirements where tender_id = p_tender_id;
  if v_trade_count is null or v_trade_count = 0 then
    raise exception 'trades_required';
  end if;

  if coalesce(trim(v_t.project_name), '') = '' or coalesce(trim(v_t.suburb), '') = '' or coalesce(trim(v_t.postcode), '') = '' then
    raise exception 'not_ready';
  end if;

  select * into v_user from public.users where id = v_uid and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  -- Free plan: 1 active tender per 30 days (premium = is_premium or active paid plan)
  if coalesce(v_user.is_premium, false) = false
     and not (
       coalesce(v_user.subscription_status, '') = 'ACTIVE'
       and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
            or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10')
     ) then
    select count(*) into v_active_count
    from public.tenders
    where builder_id = v_uid
      and status in ('LIVE', 'PUBLISHED', 'PENDING_APPROVAL')
      and created_at >= now() - interval '30 days';
    if v_active_count >= 1 then
      raise exception 'free_tender_monthly_limit_reached';
    end if;
  end if;

  update public.tenders
  set status = 'LIVE', updated_at = now()
  where id = p_tender_id;
end;
$$;

grant execute on function public.publish_tender(uuid) to authenticated;

-- close_tender: validate and set status to CLOSED
drop function if exists public.close_tender(uuid);
create or replace function public.close_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if upper(v_t.status) = 'CLOSED' then
    raise exception 'already_closed';
  end if;

  update public.tenders
  set status = 'CLOSED', updated_at = now()
  where id = p_tender_id;
end;
$$;

grant execute on function public.close_tender(uuid) to authenticated;

-- reopen_tender: only Premium (or admin) can reopen a closed tender
drop function if exists public.reopen_tender(uuid);
create or replace function public.reopen_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
  v_user public.users;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if upper(v_t.status) <> 'CLOSED' then
    raise exception 'tender_not_closed';
  end if;

  select * into v_user from public.users where id = v_uid and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  -- Admin can always reopen
  if v_user.role = 'admin' then
    update public.tenders set status = 'LIVE', updated_at = now() where id = p_tender_id;
    return;
  end if;

  -- Premium = is_premium or active paid plan
  if coalesce(v_user.is_premium, false) = false
     and not (
       coalesce(v_user.subscription_status, '') = 'ACTIVE'
       and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
            or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10')
     ) then
    raise exception 'free_cannot_reopen_closed_tender';
  end if;

  update public.tenders
  set status = 'LIVE', updated_at = now()
  where id = p_tender_id;
end;
$$;

grant execute on function public.reopen_tender(uuid) to authenticated;

-- Block direct status flip from CLOSED to LIVE/DRAFT/PUBLISHED for non-premium, non-admin
create or replace function public.tenders_block_reopen_for_free()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  -- Only care when status changes from CLOSED to something that reopens
  if upper(OLD.status) <> 'CLOSED' then
    return NEW;
  end if;
  if upper(NEW.status) not in ('LIVE', 'DRAFT', 'PUBLISHED') then
    return NEW;
  end if;

  select * into v_user from public.users where id = auth.uid() and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  if v_user.role = 'admin' then
    return NEW;
  end if;

  if coalesce(v_user.is_premium, false) = true then
    return NEW;
  end if;
  if coalesce(v_user.subscription_status, '') = 'ACTIVE'
     and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
          or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10') then
    return NEW;
  end if;

  raise exception 'free_cannot_reopen_closed_tender';
end;
$$;

drop trigger if exists tenders_block_reopen_for_free on public.tenders;
create trigger tenders_block_reopen_for_free
  before update of status on public.tenders
  for each row
  execute function public.tenders_block_reopen_for_free();
