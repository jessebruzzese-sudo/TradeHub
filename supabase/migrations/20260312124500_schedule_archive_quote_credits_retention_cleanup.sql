-- Schedule archive cleanup for user_trade_quote_credits after a 30-day retention period.
-- This migration is safe to run repeatedly:
-- - If the archive table does not exist, it no-ops.
-- - If pg_cron is unavailable or not permitted, it leaves a notice and no-ops.

do $$
declare
  v_job_name text := 'drop_archive_user_trade_quote_credits_after_30d';
  v_schedule text;
  v_command text := $cmd$
do $inner$
begin
  if to_regclass('public._archive_user_trade_quote_credits') is not null then
    drop table public._archive_user_trade_quote_credits;
  end if;
end
$inner$;
$cmd$;
  v_existing_job_id bigint;
begin
  if to_regclass('public._archive_user_trade_quote_credits') is null then
    raise notice 'Retention scheduler skipped: public._archive_user_trade_quote_credits does not exist.';
    return;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'Retention scheduler skipped: pg_cron extension is not installed.';
    return;
  end if;

  -- One-time monthly-style schedule string targeting the exact minute/hour/day/month 30 days from now (UTC).
  v_schedule := to_char((now() at time zone 'UTC') + interval '30 days', 'MI HH24 DD MM') || ' *';

  select jobid
  into v_existing_job_id
  from cron.job
  where jobname = v_job_name
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(v_job_name, v_schedule, v_command);
  raise notice 'Scheduled % with cron expression %', v_job_name, v_schedule;
exception
  when others then
    raise notice 'Retention scheduler skipped due to error: %', sqlerrm;
end $$;
