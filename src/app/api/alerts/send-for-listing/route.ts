/**
 * POST /api/alerts/send-for-listing
 * Trigger email alerts for a newly published job.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { sendListingAlerts } from '@/lib/alerts/send-listing-alerts';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const listingType = body.listingType as string;
    const listingId = body.listingId as string;

    if (!listingType || !listingId) {
      return NextResponse.json({ error: 'listingType and listingId required' }, { status: 400 });
    }

    if (listingType !== 'job') {
      return NextResponse.json({ error: 'Invalid listingType' }, { status: 400 });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('contractor_id')
      .eq('id', listingId)
      .gte('created_at', jobsListingWindowStartIso())
      .maybeSingle();
    const j = job as { contractor_id?: string } | null;
    if (!j || j.contractor_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await sendListingAlerts(listingId);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    console.error('[alerts/send-for-listing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
