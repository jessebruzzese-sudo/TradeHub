import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Ensures `public.users` has a row for `userId`, loading the auth user via service role when missing.
 * Use when server code only has a UUID (e.g. `calculate_profile_strength` returned `user_not_found`).
 */
export async function ensurePublicUserRowById(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; cause: unknown }> {
  const { data: row, error: selErr } = await admin.from('users').select('id').eq('id', userId).maybeSingle();
  if (selErr) return { ok: false, cause: selErr };
  if (row?.id) return { ok: true };

  const { data: authRes, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr) return { ok: false, cause: authErr };
  const u = authRes?.user;
  if (!u) return { ok: false, cause: new Error('auth_user_missing') };

  return ensurePublicUserRow(admin, u);
}

/**
 * Ensures `public.users` has a row for this auth user (FK target for `previous_work.user_id`, etc.).
 * Idempotent; safe under concurrent calls (unique id + duplicate handling).
 */
export async function ensurePublicUserRow(
  admin: SupabaseClient,
  user: User
): Promise<{ ok: true } | { ok: false; cause: unknown }> {
  const { data, error: selErr } = await admin.from('users').select('id').eq('id', user.id).maybeSingle();
  if (selErr) return { ok: false, cause: selErr };
  if (data?.id) return { ok: true };

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? `${user.id}@unknown.local`;
  const name = String(meta.full_name ?? meta.name ?? user.email ?? email).trim() || email;
  const roleRaw = String(meta.role ?? '').trim().toLowerCase();
  const role =
    roleRaw === 'admin' || roleRaw === 'subcontractor' || roleRaw === 'contractor' ? roleRaw : 'contractor';

  const { error: insErr } = await admin.from('users').insert({
    id: user.id,
    email,
    name,
    role,
    trust_status: 'pending',
    rating: 0,
    completed_jobs: 0,
  } as Record<string, unknown>);

  if (insErr && insErr.code !== '23505') return { ok: false, cause: insErr };
  return { ok: true };
}
