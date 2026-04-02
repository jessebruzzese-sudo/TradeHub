import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  getViewerCenter,
  getDiscoveryRadiusKm,
  bboxForRadiusKm,
  haversineKm,
  isPremiumCandidate,
} from '@/lib/discovery';
import { getTier } from '@/lib/plan-limits';
import { hasValidABN } from '@/lib/abn-utils';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import { getPrimaryUserCoordinates } from '@/lib/location/get-user-coordinates';

type UserRow = {
  id: string;
  plan?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  search_lat?: number | null;
  search_lng?: number | null;
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
  business_name?: string | null;
  name?: string | null;
  location?: string | null;
  postcode?: string | null;
  abn?: string | null;
  abn_status?: string | null;
  avatar?: string | null;
  subscription_status?: string | null;
  complimentary_premium_until?: string | null;
};

function tradeMatchKey(s: string): string {
  return s.trim().toLowerCase();
}

function getCandidateCoords(row: UserRow): { lat: number; lng: number } | null {
  return getPrimaryUserCoordinates(row);
}

function getTradesFromRow(row: UserRow): string[] {
  return getDisplayTradeListFromUserRow(row);
}

function matchesTrade(row: UserRow, tradeParam: string): boolean {
  const trades = getTradesFromRow(row);
  const target = tradeMatchKey(tradeParam);
  return trades.some((t) => tradeMatchKey(t) === target);
}

function mapToCard(
  row: UserRow,
  isPremium: boolean
): {
  id: string;
  display_name: string;
  business_name: string | null;
  suburb: string | null;
  trade_categories: string[];
  is_verified: boolean;
  avatar_url: string | null;
  isPremium: boolean;
} {
  // Prefer users.name (visible/display name), then business_name, with safe fallback
  const displayName =
    (row as Record<string, unknown>).name ??
    (row as Record<string, unknown>).business_name ??
    (row as Record<string, unknown>).display_name ??
    (row as Record<string, unknown>).full_name ??
    'TradeHub user';

  const suburb =
    (row as Record<string, unknown>).suburb ??
    (row as Record<string, unknown>).location_suburb ??
    (row as Record<string, unknown>).city ??
    row.location ??
    null;

  const verified = hasValidABN(row);

  const tradeCategories = getTradesFromRow(row);

  let avatarUrl: string | null = row.avatar ?? null;
  if (avatarUrl && !avatarUrl.startsWith('http')) {
    avatarUrl = null;
  }

  return {
    id: row.id,
    display_name: String(displayName ?? 'TradeHub user'),
    business_name: row.business_name ?? null,
    suburb: suburb ? String(suburb) : null,
    trade_categories: tradeCategories,
    is_verified: !!verified,
    avatar_url: avatarUrl,
    isPremium,
  };
}

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ trade: string }> }
) {
  try {
    const { trade: tradeParam } = await ctx.params;
    if (!tradeParam?.trim()) {
      return NextResponse.json(
        { error: 'Trade parameter required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: me, error: meErr } = await (supabase as any)
      .from('users')
      .select(
        'id,plan,location_lat,location_lng,search_lat,search_lng,subscription_status,complimentary_premium_until'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (meErr || !me) {
      return NextResponse.json(
        { error: 'Could not load your profile' },
        { status: 500 }
      );
    }

    const center = getViewerCenter(me as UserRow);
    if (!center) {
      return NextResponse.json({
        profiles: [],
        outsideRadiusCount: 0,
        allowedRadiusKm: 20,
        message: 'Add your location to discover trades near you.',
      });
    }

    const radiusKm = getDiscoveryRadiusKm(me as UserRow);
    const isViewerPremium = getTier(me) === 'premium';
    const fetchRadiusKm = isViewerPremium ? radiusKm : Math.max(300, radiusKm * 3);
    const bbox = bboxForRadiusKm(center.lat, center.lng, fetchRadiusKm);

    let query = (supabase as any)
      .from('users')
      .select(
        'id,plan,location_lat,location_lng,primary_trade,additional_trades,business_name,name,location,postcode,abn,abn_status,avatar,subscription_status,complimentary_premium_until'
      )
      .eq('is_public_profile', true)
      .neq('id', user.id)
      .gte('location_lat', bbox.minLat)
      .lte('location_lat', bbox.maxLat)
      .gte('location_lng', bbox.minLng)
      .lte('location_lng', bbox.maxLng);
    query = applyExcludeTestAccountsFilters(query);

    const { data: candidates, error: candErr } = await query;

    if (candErr) {
      if (candErr.message?.includes('is_public_profile') || candErr.code === '42P01') {
        return NextResponse.json({ profiles: [], outsideRadiusCount: 0, allowedRadiusKm: radiusKm });
      }
      console.error('Discovery trade route error:', candErr);
      return NextResponse.json(
        { error: 'Failed to load profiles' },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as UserRow[];

    const tradeParamNorm = tradeParam.trim().toLowerCase();
    const matchAllTrades = tradeParamNorm === 'all';

    const allMatchingWithDistance: { row: UserRow; distanceKm: number; isPremium: boolean }[] = [];

    for (const row of rows) {
      if (!matchAllTrades && !matchesTrade(row, tradeParam)) continue;
      const coords = getCandidateCoords(row);
      if (!coords) continue;
      const distanceKm = haversineKm(
        center.lat,
        center.lng,
        coords.lat,
        coords.lng
      );
      allMatchingWithDistance.push({
        row,
        distanceKm,
        isPremium: isPremiumCandidate(row),
      });
    }

    const withinRadius = allMatchingWithDistance.filter((c) => c.distanceKm <= radiusKm);
    const outsideRadiusCount = isViewerPremium ? 0 : allMatchingWithDistance.filter((c) => c.distanceKm > radiusKm).length;

    withinRadius.sort(
      (a, b) =>
        Number(b.isPremium) - Number(a.isPremium) ||
        a.distanceKm - b.distanceKm
    );

    const cards = withinRadius.map((c) =>
      mapToCard(c.row, c.isPremium)
    );

    return NextResponse.json({
      profiles: cards,
      outsideRadiusCount,
      allowedRadiusKm: radiusKm,
    });
  } catch (err: unknown) {
    console.error('discovery trade/[trade] error:', err);
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    );
  }
}
