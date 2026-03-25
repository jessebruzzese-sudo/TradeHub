import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { hasSubcontractorPremium, hasBuilderPremium, hasContractorPremium, canChangePrimaryTrade } from '@/lib/capability-utils';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { normalizeTrade, normalizeTradesList } from '@/lib/trades/normalizeTrade';

export const dynamic = 'force-dynamic';

/** GET: List user's trades from user_trades, fallback to primary_trade if empty */
export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: rows, error } = await (supabase as any)
    .from('user_trades')
    .select('id, trade, is_primary')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[profile/trades] GET error:', error);
    return NextResponse.json({ error: 'Failed to load trades' }, { status: 500 });
  }

  if (rows && rows.length > 0) {
    return NextResponse.json({
      trades: rows.map((r: { id: string | null; trade: string; is_primary: boolean }) => ({
        id: r.id,
        trade: normalizeTrade(r.trade),
        is_primary: r.is_primary,
      })),
    });
  }

  // Fallback: legacy user with only primary_trade
  const { data: profile } = await supabase
    .from('users')
    .select('primary_trade')
    .eq('id', user.id)
    .maybeSingle();

  const pt = profile?.primary_trade?.trim();
  if (pt) {
    return NextResponse.json({
      trades: [{ id: null, trade: normalizeTrade(pt), is_primary: true }],
    });
  }

  return NextResponse.json({ trades: [] });
}

/** POST: Sync trades via RPC (validates premium, enforces rules) */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const primaryTradeRaw = typeof body?.primaryTrade === 'string' ? body.primaryTrade.trim() : '';
  const primaryTrade = primaryTradeRaw ? normalizeTrade(primaryTradeRaw) : '';
  const tradesRaw = body?.trades;
  const trades: string[] = Array.isArray(tradesRaw)
    ? normalizeTradesList(
        tradesRaw.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean) as string[]
      )
    : [];

  if (!primaryTrade && trades.length === 0) {
    return NextResponse.json({ error: 'At least one trade is required' }, { status: 400 });
  }

  const effectiveTrades =
    trades.length > 0
      ? primaryTrade && !trades.includes(primaryTrade)
        ? normalizeTradesList([primaryTrade, ...trades])
        : trades
      : normalizeTradesList([primaryTrade]);

  const validTrades = TRADE_CATEGORIES;
  const invalid = effectiveTrades.filter((t) => !validTrades.includes(t));
  if (invalid.length > 0) {
    return NextResponse.json({
      error: `Invalid trade(s): ${invalid.join(', ')}. Must be from the allowed list.`,
    }, { status: 400 });
  }

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('plan, is_premium, subscription_status, active_plan, complimentary_premium_until, is_admin, primary_trade')
    .eq('id', user.id)
    .maybeSingle();

  const isPremium = profile
    ? (hasSubcontractorPremium(profile) || hasBuilderPremium(profile) || hasContractorPremium(profile))
    : false;
  const canChange = profile ? canChangePrimaryTrade(profile) : false;

  if (effectiveTrades.length > 1 && !isPremium) {
    return NextResponse.json({ error: 'Multiple trades require Premium' }, { status: 403 });
  }

  // Free users: primary trade is locked after signup. Reject any change.
  if (!canChange) {
    const currentPrimary = normalizeTrade((profile?.primary_trade ?? '').trim());
    const requestedPrimary = primaryTrade || effectiveTrades[0] || '';
    if (requestedPrimary !== currentPrimary) {
      return NextResponse.json(
        { error: 'Primary trade is locked on the Free plan. Upgrade to Premium to change your trade.' },
        { status: 403 }
      );
    }
    // Same primary - allow no-op (e.g. saving other profile fields). RPC will succeed.
  }

  const rpcPrimary = primaryTrade || effectiveTrades[0] || '';

  const { error: rpcErr } = await (supabase as any).rpc('update_user_trades', {
    p_user_id: user.id,
    p_primary_trade: rpcPrimary,
    p_trades: effectiveTrades,
  });

  if (rpcErr) {
    console.error('[profile/trades] RPC error:', rpcErr);
    if (rpcErr.message?.includes('Multiple trades require Premium')) {
      return NextResponse.json({ error: 'Multiple trades require Premium' }, { status: 403 });
    }
    return NextResponse.json({ error: rpcErr.message || 'Failed to save trades' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
