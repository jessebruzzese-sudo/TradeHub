import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier, getLimits } from '@/lib/plan-limits';
import { addDays, startOfDay, isAfter } from 'date-fns';
import { isAdmin } from '@/lib/is-admin';

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
    const dates: string[] = Array.isArray(body.dates) ? body.dates : [];
    const description: string = typeof body.description === 'string' ? body.description.trim() : '';

    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    const tier = getTier(dbUser);
    const limits = getLimits(tier);
    const today = startOfDay(new Date());
    const maxDate = addDays(today, limits.availabilityDays);

    for (const d of dates) {
      const dateStr = typeof d === 'string' ? d : String(d);
      const [y, m, day] = dateStr.split('-').map(Number);
      if (!y || !m || !day) continue;
      const date = new Date(y, m - 1, day);
      if (isAfter(date, maxDate) && !isAdmin(dbUser)) {
        console.warn(
          `[plan-limits] user_id=${dbUser.id} tier=${tier} reason=availability_beyond_horizon date=${dateStr} maxDays=${limits.availabilityDays}`
        );
        return NextResponse.json(
          {
            error:
              tier === 'free'
                ? 'Upgrade to Premium to set availability beyond 30 days.'
                : `Availability cannot extend beyond ${limits.availabilityDays} days.`,
          },
          { status: 403 }
        );
      }
    }

    await supabase.from('subcontractor_availability').delete().eq('user_id', authUser.id);

    if (dates.length > 0) {
      const records = dates.map((dateStr) => ({
        user_id: authUser.id,
        date: typeof dateStr === 'string' ? dateStr : String(dateStr),
        description: description || null,
      }));

      const { error: insertErr } = await supabase.from('subcontractor_availability').insert(records);
      if (insertErr) {
        console.error('Availability insert error:', insertErr);
        return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 });
      }
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ availability_description: description })
      .eq('id', authUser.id);

    if (updateErr) {
      console.error('Availability description update error:', updateErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Availability API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
