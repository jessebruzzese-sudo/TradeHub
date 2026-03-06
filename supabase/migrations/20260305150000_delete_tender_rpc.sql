-- delete_tender: soft-delete a tender (owner only)
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
  where t.id = p_tender_id
    and t.deleted_at is null;

  if v_builder is null then
    raise exception 'tender_not_found';
  end if;

  if v_builder <> v_uid then
    raise exception 'not_owner';
  end if;

  update public.tenders
  set deleted_at = now()
  where id = p_tender_id;
end;
$$;

grant execute on function public.delete_tender(uuid) to authenticated;
