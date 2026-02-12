/*
  # Backfill Missing User Profiles (one-time, idempotent)

  ## Problem
  Users created in auth.users before the handle_new_user() trigger was deployed
  have no matching row in public.users. This causes them to be invisible on the
  Admin Users page and may break other profile lookups.

  ## What this does
  Inserts a minimal profile row for every auth.users entry that is missing from
  public.users. Uses ON CONFLICT DO NOTHING so it is safe to run repeatedly.

  ## Notes
  - Does NOT overwrite existing profiles.
  - Sets role to 'contractor' and trust_status to 'pending' as sensible defaults.
  - Admin can correct role / metadata afterwards via the admin panel.
  - Safe for production — no destructive changes.
*/

INSERT INTO public.users (id, email, name, role, trust_status, rating, completed_jobs, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'contractor'),
  'pending',
  0,
  0,
  COALESCE(au.created_at, now()),
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
