import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier, getLimits } from '@/lib/plan-limits';
import { getMonthKeyBrisbane } from '@/lib/tender-utils';
import { isAdmin } from '@/lib/is-admin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenderId } = await ctx.params;
    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const priceCents = body.priceCents ?? body.price_cents;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    const amount = Number(priceCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    if (!isAdmin(dbUser)) {
      const tier = getTier(dbUser);
      const limits = getLimits(tier);

      if (limits.quotesPerTender !== 'unlimited') {
        const { count, error: countErr } = await supabase
          .from('tender_quotes')
          .select('id', { count: 'exact', head: true })
          .eq('tender_id', tenderId)
          .eq('contractor_id', authUser.id);

        if (!countErr && (count ?? 0) >= (limits.quotesPerTender as number)) {
          console.warn(
            `[plan-limits] user_id=${dbUser.id} tier=${tier} reason=quotes_per_tender_limit tender_id=${tenderId} count=${count}`
          );
          return NextResponse.json(
            {
              error:
                'Free plan allows up to 3 quotes per tender. Upgrade for unlimited.',
            },
            { status: 403 }
          );
        }
      }
    }

    const billingMonthKey = getMonthKeyBrisbane();

    const { data: quote, error: insertErr } = await supabase
      .from('tender_quotes')
      .insert({
        tender_id: tenderId,
        contractor_id: authUser.id,
        price_cents: Math.round(amount),
        notes: notes || null,
        billing_mode: 'subscription',
        billing_month_key: billingMonthKey,
        status: 'submitted',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Quote insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ quote });
  } catch (err) {
    console.error('Quotes API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
