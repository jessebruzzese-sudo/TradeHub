import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { getTier } from '@/lib/plan-limits';
import {
  countJobsPostedInWindow,
  FREE_JOB_POST_MAX_PER_WINDOW,
  FREE_JOB_POST_WINDOW_DAYS,
} from '../../../../lib/job-post-limits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/post-limit — Free-tier usage for the signed-in contractor (rolling window).
 * Premium users: { unlimited: true }. Used by /jobs and /jobs/create UI only.
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const serviceSupabase = createServiceSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await (supabase as any)
      .from('users')
      .select(
        'id, plan, is_premium, active_plan, subscription_status, complimentary_premium_until, premium_until, subcontractor_plan, subcontractor_sub_status'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
    }

    if (getTier(profile) === 'premium') {
      return NextResponse.json({ unlimited: true });
    }

    const usedInWindow = await countJobsPostedInWindow(serviceSupabase, user.id);

    return NextResponse.json({
      unlimited: false,
      windowDays: FREE_JOB_POST_WINDOW_DAYS,
      maxFree: FREE_JOB_POST_MAX_PER_WINDOW,
      usedInWindow,
    });
  } catch (e) {
    console.error('[api/jobs/post-limit]', e);
    return NextResponse.json({ error: 'Could not load post limit' }, { status: 500 });
  }
}
