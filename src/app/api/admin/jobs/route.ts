import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { requireAdmin, adminAuthErrorToResponse } from '@/lib/admin/require-admin';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      await requireAdmin();
    } catch (err) {
      return adminAuthErrorToResponse(err);
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      console.error('🔥 Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'MISSING_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const adminSupabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const listingSince = jobsListingWindowStartIso();
    const { count: totalJobCount, error: countError } = await adminSupabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', listingSince);

    if (countError) {
      console.error('🔥 JOB COUNT FAILED:', countError);
    }

    const { data: jobs, error } = await adminSupabase
      .from('jobs')
      .select('*')
      .gte('created_at', listingSince)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('🔥 JOB QUERY FAILED:', error);
      return NextResponse.json(
        { error: 'JOBS_QUERY_FAILED', details: error.message },
        { status: 500 }
      );
    }

    const ids = [...new Set((jobs ?? []).map((j) => j.contractor_id).filter(Boolean))];
    let contractorNames: Record<string, string | null> = {};
    if (ids.length > 0) {
      const { data: contractors, error: contractorsErr } = await adminSupabase
        .from('users')
        .select('id, name')
        .in('id', ids);

      if (contractorsErr) {
        console.error('🔥 CONTRACTOR LOOKUP FAILED:', contractorsErr);
      } else {
        contractorNames = Object.fromEntries((contractors ?? []).map((u) => [u.id, u.name]));
      }
    }

    const jobsWithContractor = (jobs ?? []).map((j) => ({
      ...j,
      contractor_name: contractorNames[j.contractor_id] ?? null,
    }));

    // totalInListingWindow: count of rows matching the same created_at window as `jobs` (30 days).
    return NextResponse.json({
      ok: true,
      count: jobs?.length || 0,
      totalInListingWindow: totalJobCount ?? 0,
      jobs: jobsWithContractor,
    });
  } catch (err) {
    console.error('🔥 API ERROR:', err);
    return NextResponse.json({ error: 'CRASHED' }, { status: 500 });
  }
}
