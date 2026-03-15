-- get_tender_for_viewer: view access for tender detail page
-- Reuses discovery logic from get_tenders_visible_to_viewer.
-- Returns the tender row if viewer has view access: owner, admin, or discoverable (trade + radius).
-- Fixes "Tender not found" for matched users who see the tender in Find Work but RLS blocks direct fetch.

create or replace function public.get_tender_for_viewer(
  p_tender_id uuid,
  p_viewer_id uuid
)
returns setof public.tenders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade_filter text;
  v_t public.tenders;
begin
  if p_viewer_id is null then
    return;
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    return;
  end if;

  -- Owner: full access
  if v_t.builder_id = p_viewer_id then
    return next v_t;
    return;
  end if;

  -- Admin: full access
  if exists (select 1 from public.users where id = p_viewer_id and (role = 'admin' or coalesce(is_admin, false) = true)) then
    return next v_t;
    return;
  end if;

  -- Discoverable: same trade + radius logic as get_tenders_visible_to_viewer
  -- When trade_filter is null/empty, get_tenders_visible_to_viewer returns all tenders within radius (no trade filter)
  select string_agg(trade, '|') into v_trade_filter
  from (
    select distinct trim(ut.trade) as trade
    from public.user_trades ut
    where ut.user_id = p_viewer_id and trim(ut.trade) <> ''
    union
    select distinct trim(u.primary_trade) as trade
    from public.users u
    where u.id = p_viewer_id and u.primary_trade is not null and trim(u.primary_trade) <> ''
  ) x
  where trade is not null and trim(trade) <> '';

  if exists (
    select 1 from public.get_tenders_visible_to_viewer(p_viewer_id, v_trade_filter, 1000, 0) g
    where g.id = p_tender_id
  ) then
    return next v_t;
    return;
  end if;

  return;
end;
$$;

grant execute on function public.get_tender_for_viewer(uuid, uuid) to authenticated;

comment on function public.get_tender_for_viewer(uuid, uuid) is 'Returns tender row if viewer has view access (owner, admin, or discoverable via trade+radius). Use for tender detail page instead of direct SELECT to bypass RLS for matched users.';
