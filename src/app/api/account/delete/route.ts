import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let step = 'start';
  try {
    const { password } = await req.json().catch(() => ({}));

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json({ error: 'PASSWORD_REQUIRED' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('[api/account/delete] Missing env', {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasService: !!serviceKey,
      });
      return NextResponse.json(
        { error: 'MISSING_ENV', hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceKey },
        { status: 500 }
      );
    }

    const cookieStore = cookies();

    step = 'auth_get_user';
    const supabase = createServerClient(
      supabaseUrl,
      anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (e) {
              // In Route Handlers this should work; swallow just in case of edge/runtime quirks.
              console.warn('[api/account/delete] cookie setAll failed', e);
            }
          },
        },
      }
    );

    // Cookie-based auth (preferred)
    let { data: userData, error: userErr } = await supabase.auth.getUser();

    // Optional Bearer fallback if cookies not present
    if (userErr || !userData?.user) {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';

      if (!token) {
        return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 });
      }

      const { data: userFromToken, error: tokenErr } = await supabase.auth.getUser(token);
      if (tokenErr || !userFromToken?.user) {
        return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 });
      }

      userData = userFromToken;
    }

    const user = userData!.user!;

    step = 'reauth_password';
    // Re-auth password (verify they really own the account)
    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password.trim(),
    });

    if (pwErr) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 401 });
    }

    const userId = user.id;
    const email = (user.email ?? '').toString();

    step = 'admin_init';
    // Admin client for destructive actions
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const nowIso = new Date().toISOString();
    const tombstoneEmail = `deleted+${userId.slice(0, 8)}@tradehub.invalid`;

    step = 'storage_remove';
    // 1) Delete storage assets (best-effort)
    await admin.storage.from('avatars').remove([`${userId}/avatar.png`]).catch(() => {});
    await admin.storage.from('covers').remove([`${userId}/cover.png`]).catch(() => {});

    step = 'soft_delete_jobs_tenders';
    // 2) Soft-delete owned marketplace content
    await admin.from('jobs').update({ deleted_at: nowIso }).eq('contractor_id', userId);
    await admin.from('tenders').update({ deleted_at: nowIso }).eq('builder_id', userId);

    step = 'delete_relations';
    // 3) Remove owned activity & user-generated relations
    await admin.from('applications').delete().eq('subcontractor_id', userId);
    await admin.from('tender_quotes').delete().eq('contractor_id', userId);
    await admin.from('notifications').delete().eq('user_id', userId);
    await admin.from('profile_views').delete().eq('viewer_user_id', userId);
    await admin.from('profile_views').delete().eq('viewed_user_id', userId);
    await admin.from('subscription_history').delete().eq('user_id', userId);
    await admin.from('usage_metrics').delete().eq('user_id', userId);

    step = 'scrub_users';
    // 4) Scrub public.users row (remove PII)
    const scrub: Record<string, unknown> = {
      name: 'Deleted user',
      email: tombstoneEmail,
      business_name: null,
      bio: null,
      avatar: null,
      cover_url: null,
      location: null,
      postcode: null,
      phone: null,
      website: null,
      abn: null,
      abn_status: null,
      abn_verified_at: null,
      is_public_profile: false,
      deleted_at: nowIso,
    };

    const scrubRes = await admin.from('users').update(scrub).eq('id', userId);
    let scrubError: any = null;

    if (scrubRes.error) {
      const minimal = {
        name: 'Deleted user',
        email: tombstoneEmail,
        avatar: null,
        cover_url: null,
        business_name: null,
        bio: null,
        location: null,
        postcode: null,
        abn: null,
        abn_status: null,
        abn_verified_at: null,
        is_public_profile: false,
        deleted_at: nowIso,
      };

      const scrubRes2 = await admin.from('users').update(minimal).eq('id', userId);

      if (scrubRes2.error) {
        scrubError = {
          full: scrubRes.error?.message ?? String(scrubRes.error),
          minimal: scrubRes2.error?.message ?? String(scrubRes2.error),
          code_full: scrubRes.error?.code,
          code_minimal: scrubRes2.error?.code,
          details_full: scrubRes.error?.details,
          details_minimal: scrubRes2.error?.details,
          hint_full: scrubRes.error?.hint,
          hint_minimal: scrubRes2.error?.hint,
        };
        console.error('[api/account/delete] users scrub failed', scrubError);

        // IMPORTANT: do NOT block account deletion on scrub failure.
        // We'll continue to auth deletion and return success with a warning.
      }
    }

    step = 'delete_auth_user';
    // 5) Prevent login forever
    try {
      await (admin.auth as any).admin.deleteUser(userId);
    } catch (e) {
      console.warn('[api/account/delete] deleteUser failed, fallback to ban/update', e);
      try {
        await (admin.auth as any).admin.updateUserById(userId, {
          email: tombstoneEmail,
          user_metadata: { deleted: true, deleted_at: nowIso, old_email: email },
          ban_duration: '876000h',
        });
      } catch (e2) {
        console.warn('[api/account/delete] updateUserById fallback failed', e2);
      }
    }

    return NextResponse.json({ success: true, scrub: scrubError ? 'failed' : 'ok', scrubError });
  } catch (e: any) {
    console.error('[api/account/delete] error', e);
    return NextResponse.json(
      { error: e?.message ?? 'Delete failed', step },
      { status: 500 }
    );
  }
}
