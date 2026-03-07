import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/[id]/messaging-context
 * Returns job and applications for messaging action cards.
 * RLS applies - only participants (contractor or applicants) can read.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await ctx.params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, contractor_id, title, status, selected_subcontractor, confirmed_subcontractor, cancellation_reason')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: applications, error: appErr } = await supabase
      .from('applications')
      .select('id, subcontractor_id, status')
      .eq('job_id', jobId);

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 500 });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        contractorId: job.contractor_id,
        title: job.title ?? 'Job',
        status: job.status ?? 'open',
        selectedSubcontractor: job.selected_subcontractor,
        confirmedSubcontractor: job.confirmed_subcontractor,
        cancellationReason: job.cancellation_reason,
      },
      applications: (applications ?? []).map((a) => ({
        id: a.id,
        subcontractorId: a.subcontractor_id,
        status: a.status,
      })),
    });
  } catch (err) {
    console.error('jobs messaging-context API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
