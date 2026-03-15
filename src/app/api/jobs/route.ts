import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { getTier } from '@/lib/plan-limits';
import { needsBusinessVerification } from '@/lib/verification-guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs — Create a job with server-side trade validation.
 * - Free users: trade_category must be one of their listed trades.
 * - Premium users: trade_category may be any valid TradeHub trade.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tradeCategory = typeof body?.trade_category === 'string' ? body.trade_category.trim() : '';

    if (!tradeCategory) {
      return NextResponse.json({ error: 'Trade category is required' }, { status: 400 });
    }

    if (!TRADE_CATEGORIES.includes(tradeCategory)) {
      return NextResponse.json(
        { error: `Invalid trade category. Must be one of: ${TRADE_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: profile, error: profileErr } = await (supabase as any)
      .from('users')
      .select('id, plan, is_premium, active_plan, subscription_status, complimentary_premium_until, premium_until, primary_trade, additional_trades, abn, abn_status, abn_verified_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
    }

    if (needsBusinessVerification(profile as any)) {
      return NextResponse.json({ error: 'Verify your ABN to post jobs' }, { status: 403 });
    }

    const isPremium = getTier(profile) === 'premium';

    if (!isPremium) {
      let userTrades: string[] = [];
      const { data: utRows } = await (supabase as any)
        .from('user_trades')
        .select('trade')
        .eq('user_id', user.id);
      if (utRows && utRows.length > 0) {
        userTrades = utRows.map((r: { trade: string }) => r.trade).filter(Boolean);
      }
      if (userTrades.length === 0) {
        const pt = (profile as any).primary_trade?.trim();
        const at = (profile as any).additional_trades;
        userTrades = pt ? [pt] : [];
        if (Array.isArray(at)) {
          userTrades = [...new Set([...userTrades, ...at.map((t: string) => String(t).trim()).filter(Boolean)])];
        }
      }
      if (!userTrades.includes(tradeCategory)) {
        return NextResponse.json(
          { error: 'Free accounts can only post jobs in their listed trade(s). Upgrade to Premium to post in any trade.' },
          { status: 403 }
        );
      }
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const location = typeof body?.location === 'string' ? body.location.trim() : '';
    const postcode = typeof body?.postcode === 'string' ? body.postcode.trim() : '';
    const dates = body?.dates;
    const startTime = typeof body?.start_time === 'string' ? body.start_time : '08:00';
    const duration = typeof body?.duration === 'number' ? body.duration : 1;
    const payType =
      body?.pay_type === 'hourly' ? 'hourly' : body?.pay_type === 'day_rate' ? 'day_rate' : 'fixed';
    const rateRaw = body?.rate;
    const rate =
      rateRaw == null || rateRaw === ''
        ? null
        : typeof rateRaw === 'number'
          ? rateRaw
          : Number(rateRaw);
    const locationPlaceId = typeof body?.location_place_id === 'string' ? body.location_place_id : null;
    const locationLat = typeof body?.location_lat === 'number' ? body.location_lat : null;
    const locationLng = typeof body?.location_lng === 'number' ? body.location_lng : null;

    if (!title || !description || !location || !postcode) {
      return NextResponse.json({ error: 'Title, description, location, and postcode are required' }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'At least one date is required' }, { status: 400 });
    }
    if (rate != null && (!Number.isFinite(rate) || rate <= 0)) {
      return NextResponse.json({ error: 'Rate must be a positive number when provided' }, { status: 400 });
    }
    if (locationLat == null || locationLng == null) {
      return NextResponse.json({ error: 'Location coordinates are required' }, { status: 400 });
    }

    const insertPayload = {
      contractor_id: user.id,
      title,
      description,
      trade_category: tradeCategory,
      location,
      postcode,
      dates,
      start_time: startTime,
      duration,
      pay_type: payType,
      rate: rate ?? 0,
      attachments: null,
      status: 'open',
      location_place_id: locationPlaceId,
      location_lat: locationLat,
      location_lng: locationLng,
    };

    const { data: created, error: insertError } = await supabase
      .from('jobs')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[api/jobs] insert error:', insertError);
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: created.id });
  } catch (err) {
    console.error('[api/jobs] error:', err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
