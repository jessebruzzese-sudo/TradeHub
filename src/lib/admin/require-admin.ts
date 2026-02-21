import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

export async function requireAdmin(
  supabaseClient?: ReturnType<typeof getSupabaseServer>
): Promise<RequireAdminResult> {
  const supabase = supabaseClient ?? getSupabaseServer();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const { data: row, error: profileErr } = await supabase
    .from('users')
    .select('id, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !row || row.is_admin !== true) {
    throw new Response('Forbidden', { status: 403 });
  }

  return { userId: user.id, email: user.email ?? undefined };
}
