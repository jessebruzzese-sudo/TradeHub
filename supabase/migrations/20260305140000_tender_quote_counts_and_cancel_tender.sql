-- 0) Add deleted_at to tender_quotes if not present (for soft-delete support)
ALTER TABLE public.tender_quotes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 1) Quote counts view (adjust table name if needed)
create or replace view public.tender_quote_counts as
select
  t.id as tender_id,
  count(q.*)::int as quotes_received
from public.tenders t
left join public.tender_quotes q
  on q.tender_id = t.id
  and q.deleted_at is null
group by t.id;

comment on view public.tender_quote_counts is 'Count of quotes per tender (excluding soft-deleted quotes)';

-- 2) cancel_tender RPC
create or replace function public.cancel_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_builder uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select t.builder_id, t.status
    into v_builder, v_status
  from public.tenders t
  where t.id = p_tender_id
    and t.deleted_at is null;

  if v_builder is null then
    raise exception 'tender_not_found';
  end if;

  if v_builder <> v_uid then
    raise exception 'not_owner';
  end if;

  if v_status = 'CLOSED' then
    raise exception 'cannot_cancel_closed';
  end if;

  if v_status = 'CANCELLED' then
    raise exception 'already_cancelled';
  end if;

  update public.tenders
    set status = 'CANCELLED'
  where id = p_tender_id;
end;
$$;

grant execute on function public.cancel_tender(uuid) to authenticated;
