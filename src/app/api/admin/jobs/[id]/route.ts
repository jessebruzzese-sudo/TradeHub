import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { requireAdmin, adminAuthErrorToResponse } from '@/lib/admin/require-admin';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await requireAdmin();
    } catch (err) {
      return adminAuthErrorToResponse(err);
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'MISSING_JOB_ID' }, { status: 400 });
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

    const { data: job, error } = await adminSupabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .gte('created_at', jobsListingWindowStartIso())
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
    }

    const nameIds = [
      job.contractor_id,
      job.selected_subcontractor,
      job.confirmed_subcontractor,
      job.cancelled_by,
    ].filter((x): x is string => Boolean(x));

    const uniqueIds = [...new Set(nameIds)];
    let names: Record<string, string | null> = {};
    if (uniqueIds.length > 0) {
      const { data: users, error: usersErr } = await adminSupabase
        .from('users')
        .select('id, name')
        .in('id', uniqueIds);

      if (usersErr) {
        console.error('🔥 ADMIN JOB USER NAMES:', usersErr);
      } else {
        names = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]));
      }
    }

    return NextResponse.json({
      ok: true,
      job: {
        ...job,
        contractor_name: names[job.contractor_id] ?? null,
        selected_subcontractor_name: job.selected_subcontractor
          ? names[job.selected_subcontractor] ?? null
          : null,
        confirmed_subcontractor_name: job.confirmed_subcontractor
          ? names[job.confirmed_subcontractor] ?? null
          : null,
        cancelled_by_name: job.cancelled_by ? names[job.cancelled_by] ?? null : null,
      },
    });
  } catch (err) {
    console.error('🔥 API ERROR:', err);
    return NextResponse.json({ error: 'CRASHED' }, { status: 500 });
  }
}
