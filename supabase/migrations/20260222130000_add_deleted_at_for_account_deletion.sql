-- Add columns for account deletion flow.
-- users: deleted_at + cover_url (if not already present)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_url text;

-- jobs/tenders: deleted_at (soft delete support)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
