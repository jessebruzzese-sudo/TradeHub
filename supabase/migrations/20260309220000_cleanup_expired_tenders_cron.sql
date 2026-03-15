-- Hard delete tenders after retention period:
-- - Premium (PREMIUM_14): 90 days after created_at
-- - Free (FREE_TRIAL, BASIC_8): 30 days after created_at
--
-- Option A: pg_cron (DB only) - runs daily at 3:00 UTC. Enable pg_cron in Dashboard if needed.
-- Option B: Vercel cron + /api/cron/cleanup-expired-tenders (DB + storage). Set CRON_SECRET in Vercel.
-- If using Option B, run: SELECT cron.unschedule('cleanup-expired-tenders');

-- 1) Enable pg_cron (enable via Dashboard > Database > Extensions if not available)
create extension if not exists pg_cron with schema pg_catalog;

-- 2) Function to hard delete expired tenders (runs as postgres, bypasses RLS)
create or replace function public.cleanup_expired_tenders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with deleted as (
    delete from public.tenders
    where
      (tier = 'PREMIUM_14' and created_at < now() - interval '90 days')
      or (tier in ('FREE_TRIAL', 'BASIC_8') and created_at < now() - interval '30 days')
    returning id
  )
  select count(*)::integer into v_deleted from deleted;
  return coalesce(v_deleted, 0);
end;
$$;

comment on function public.cleanup_expired_tenders() is 'Hard delete tenders past retention: 90d for PREMIUM_14, 30d for FREE_TRIAL/BASIC_8. Called by pg_cron daily.';

-- 3) Schedule daily at 3:00 UTC (low-traffic hour). Idempotent: unschedule first.
do $$
begin
  perform cron.unschedule('cleanup-expired-tenders');
exception when others then
  null;
end $$;
select cron.schedule(
  'cleanup-expired-tenders',
  '0 3 * * *',
  $$select public.cleanup_expired_tenders()$$
);
