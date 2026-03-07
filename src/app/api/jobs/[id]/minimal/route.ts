import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/[id]/minimal
 * Returns minimal job info (contractor_id, title, status) for messaging redirect.
 * RLS applies - only participants can read.
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

    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, contractor_id, title, status')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      contractorId: job.contractor_id,
      title: job.title ?? 'Job',
      status: job.status ?? 'open',
    });
  } catch (err) {
    console.error('jobs minimal API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
