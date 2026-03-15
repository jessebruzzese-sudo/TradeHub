-- Replace delete_tender with true hard delete (owner only)
-- Deletes: tenders row (CASCADE removes tender_quote_requests, tender_quotes, tender_trade_requirements, tender_trades, tender_documents)
-- Storage files must be deleted by the API before calling this

create or replace function public.delete_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_builder uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select t.builder_id into v_builder
  from public.tenders t
  where t.id = p_tender_id;

  if v_builder is null then
    raise exception 'tender_not_found';
  end if;

  if v_builder <> v_uid then
    raise exception 'not_owner';
  end if;

  delete from public.tenders where id = p_tender_id;
end;
$$;

grant execute on function public.delete_tender(uuid) to authenticated;

comment on function public.delete_tender(uuid) is 'Hard delete a tender and all related records (CASCADE). Owner only. Storage files must be removed by the API first.';
