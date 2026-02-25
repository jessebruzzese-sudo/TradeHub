-- Add website and social link columns to users table.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tiktok text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS youtube text;
