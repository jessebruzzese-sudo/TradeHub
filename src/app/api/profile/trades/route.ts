import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  hasSubcontractorPremium,
  hasBuilderPremium,
  hasContractorPremium,
  canChangePrimaryTrade,
} from '@/lib/capability-utils';
import { normalizeTrade, normalizeTradesList } from '@/lib/trades/normalizeTrade';
import { getDisplayTradeListFromUserRow, splitSelectedTrades } from '@/lib/trades/user-trades';
import { loadActiveTradeNames, resolveTradeAgainstCatalog } from '@/lib/trades/load-active-trades';

export const dynamic = 'force-dynamic';

// Canonical: users.primary_trade + users.additional_trades only.
// Canonical model is users.primary_trade + users.additional_trades (+ additional_trades_unlocked).

/** GET: trades derived from users.primary_trade + users.additional_trades (API shape unchanged for clients). */
export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('primary_trade, additional_trades')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[profile/trades] GET error:', error);
    return NextResponse.json({ error: 'Failed to load trades' }, { status: 500 });
  }

  const list = getDisplayTradeListFromUserRow(profile ?? {});
  if (list.length === 0) {
    return NextResponse.json({ trades: [] });
  }

  const primaryCanonical = profile?.primary_trade?.trim()
    ? normalizeTrade(profile.primary_trade.trim())
    : list[0];
  const trades = list.map((trade) => ({
    id: null as string | null,
    trade: normalizeTrade(trade),
    is_primary: normalizeTrade(trade) === primaryCanonical,
  }));

  return NextResponse.json({ trades });
}

/** POST: persist canonical columns only. */
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

  let catalogNames: string[];
  try {
    catalogNames = await loadActiveTradeNames(supabase);
  } catch {
    return NextResponse.json({ error: 'Could not load trade catalog' }, { status: 500 });
  }

  const invalid = effectiveTrades.filter((t) => !resolveTradeAgainstCatalog(t, catalogNames));
  if (invalid.length > 0) {
    return NextResponse.json({
      error: `Invalid trade(s): ${invalid.join(', ')}. Must be from the allowed list.`,
    }, { status: 400 });
  }

  const resolvedTrades = effectiveTrades.map((t) => resolveTradeAgainstCatalog(t, catalogNames)!);

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('plan, subscription_status, complimentary_premium_until, is_admin, primary_trade')
    .eq('id', user.id)
    .maybeSingle();

  const isPremium = profile
    ? hasSubcontractorPremium(profile) || hasBuilderPremium(profile) || hasContractorPremium(profile)
    : false;
  const canChange = profile ? canChangePrimaryTrade(profile) : false;

  if (resolvedTrades.length > 1 && !isPremium) {
    return NextResponse.json({ error: 'Multiple trades require Premium' }, { status: 403 });
  }

  if (!canChange) {
    const currentPrimary = normalizeTrade((profile?.primary_trade ?? '').trim());
    const requestedPrimary = primaryTrade || resolvedTrades[0] || '';
    if (requestedPrimary !== currentPrimary) {
      return NextResponse.json(
        { error: 'Primary trade is locked on the Free plan. Upgrade to Premium to change your trade.' },
        { status: 403 }
      );
    }
  }

  const split = splitSelectedTrades(resolvedTrades, resolvedTrades.length > 1);

  const { error: upErr } = await (supabase as any)
    .from('users')
    .update({
      primary_trade: split.primary_trade,
      additional_trades: split.additional_trades,
    })
    .eq('id', user.id);

  if (upErr) {
    console.error('[profile/trades] update error:', upErr);
    return NextResponse.json({ error: upErr.message || 'Failed to save trades' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
