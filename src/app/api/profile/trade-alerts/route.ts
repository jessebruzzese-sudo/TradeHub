/**
 * PATCH /api/profile/trade-alerts
 * Update subcontractor_work_alerts_enabled preference. Premium required to enable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
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
    const enabled = body.enabled === true;

    const { data: dbUser, error: userErr } = await (supabase as any)
      .from('users')
      .select('id, plan, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status, complimentary_premium_until, premium_until')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    // Enforce: only premium users can enable alerts
    if (enabled && getTier(dbUser) !== 'premium') {
      return NextResponse.json(
        { error: 'Premium required to enable email alerts' },
        { status: 403 }
      );
    }

    const { error: updateErr } = await (supabase
      .from('users') as any)
      .update({ subcontractor_work_alerts_enabled: enabled })
      .eq('id', authUser.id);

    if (updateErr) {
      console.error('[trade-alerts] update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
    }

    return NextResponse.json({ success: true, receive_trade_alerts: enabled });
  } catch (err) {
    console.error('[trade-alerts] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
