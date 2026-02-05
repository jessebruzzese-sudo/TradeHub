import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdmin } from '@/lib/is-admin';

type RequireAdminResult = {
  userId: string;
  email?: string;
};

function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Route handlers can set cookies; middleware uses a different pattern.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = getSupabaseServer();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  // OPTION A (recommended for TradeHub): role stored in public.users
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    throw new Response('Forbidden', { status: 403 });
  }

  if (!isAdmin(profile)) {
    throw new Response('Forbidden', { status: 403 });
  }

  return { userId: user.id, email: user.email ?? undefined };
}
