/*
  Admin access is enforced via public.users.is_admin (see isAdmin(), middleware, requireAdmin).

  Adds the column if missing and backfills from legacy role = 'admin' so existing admins keep access.
  If your project used a VIEW named users over profiles, apply the equivalent change in the dashboard
  instead of this ALTER.
*/

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

UPDATE public.users
SET is_admin = true
WHERE lower(trim(role::text)) = 'admin'
  AND is_admin IS NOT TRUE;
