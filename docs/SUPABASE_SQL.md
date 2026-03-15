# Supabase SQL Reference

This file contains SQL snippets for features that may need to be applied manually (e.g., if migrations are not used).

## Discovery: is_public_profile

For the Public metrics + Trades near you discovery feature:

```sql
-- Add is_public_profile to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_public_profile IS 'When true, profile appears in Trades near you discovery. Default false for privacy.';
```

The migration file is at: `supabase/migrations/20260221120000_add_is_public_profile_for_discovery.sql`

## Schema cleanup: retired quote credits and ABN verification tables

Applied via migration:
`supabase/migrations/20260312123000_drop_abn_verifications_and_quote_credits.sql`

What it does:

- Drops `public.abn_verifications`.
- If `public.user_trade_quote_credits` exists, archives its rows to
  `public._archive_user_trade_quote_credits`, then drops the source table.

Follow-up retention scheduler:
`supabase/migrations/20260312124500_schedule_archive_quote_credits_retention_cleanup.sql`

- Attempts to schedule automatic drop of
  `public._archive_user_trade_quote_credits` after 30 days using `pg_cron`.
- If `pg_cron` is unavailable, it no-ops and logs a notice.
