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
