import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdmin } from '@/lib/is-admin';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

function authClient() {
  // Uses ANON key + request cookies to identify the logged-in user
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers don't need to set cookies for this use-case
        },
      },
    }
  );
}

function serviceClient() {
  // Uses SERVICE ROLE key for privileged reads/counts (server-only)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabaseAuth = authClient();

    // 1) Must be logged in
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = serviceClient();

    // 2) Must be admin (checked with service role so RLS can't block it)
    const { data: profile, error: roleErr } = await supabaseService
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleErr) {
      console.error('Admin role lookup failed:', roleErr);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin(profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3) Stats (service role counts)
    const [totalUsersRes, pendingVerificationsRes, activeJobsRes, totalJobsRes] =
      await Promise.all([
        supabaseService.from('users').select('*', { count: 'exact', head: true }),
        supabaseService
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('trust_status', 'pending'),
        supabaseService
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabaseService.from('jobs').select('*', { count: 'exact', head: true }),
      ]);

    // If any query errors, log and fail gracefully
    const errors = {
      totalUsers: totalUsersRes.error?.message ?? null,
      pendingVerifications: pendingVerificationsRes.error?.message ?? null,
      activeJobs: activeJobsRes.error?.message ?? null,
      totalJobs: totalJobsRes.error?.message ?? null,
    };

    if (Object.values(errors).some(Boolean)) {
      console.error('Admin stats query errors:', errors);
      return NextResponse.json(
        { error: 'Failed to load stats', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalUsers: totalUsersRes.count ?? 0,
      pendingVerifications: pendingVerificationsRes.count ?? 0,
      activeJobs: activeJobsRes.count ?? 0,
      totalJobs: totalJobsRes.count ?? 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin stats route error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
