/**
 * Legacy tender/quote DB objects (if any) are documented for manual cleanup — see
 * docs/SUPABASE_JOBS_ONLY_DB_CLEANUP.md. The app does not reference tender tables at runtime.
 */
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

/** Typed Supabase client with service role (bypasses RLS). Use for admin/backend operations. */
export function createServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          } catch {
            // In Server Components, setting cookies can throw.
            // That's okay — middleware/route handlers handle persistence.
          }
        },
      },
    }
  );
}