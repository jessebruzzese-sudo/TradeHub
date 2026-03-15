-- Cleanup legacy/unused tables.
-- - Drops public.abn_verifications (unused, empty in staging audit).
-- - Archives then drops public.user_trade_quote_credits.

do $$
begin
  if to_regclass('public.user_trade_quote_credits') is not null then
    if to_regclass('public._archive_user_trade_quote_credits') is null then
      execute '
        create table public._archive_user_trade_quote_credits
        as
        select *
        from public.user_trade_quote_credits
        with data
      ';
    else
      execute '
        insert into public._archive_user_trade_quote_credits
        select *
        from public.user_trade_quote_credits
      ';
    end if;

    execute 'drop table public.user_trade_quote_credits';
  end if;
end $$;

drop table if exists public.abn_verifications;
