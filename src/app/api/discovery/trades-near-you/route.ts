import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  getViewerCenter,
  getDiscoveryRadiusKm,
  bboxForRadiusKm,
  haversineKm,
  roundCount,
  isPremiumCandidate,
} from '@/lib/discovery';
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
  subscription_status?: string | null;
  complimentary_premium_until?: string | null;
};

function getCandidateCoords(row: UserRow): { lat: number; lng: number } | null {
  return getPrimaryUserCoordinates(row);
}

function getTradesFromRow(row: UserRow): string[] {
  return getDisplayTradeListFromUserRow(row);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
        totalAccountsRounded: '0+',
        totalAccountsExact: 0,
        trades: [],
        missingLocation: true,
        message: 'Add your location to see trades near you.',
      });
    }

    const radiusKm = getDiscoveryRadiusKm(me as UserRow);
    const bbox = bboxForRadiusKm(center.lat, center.lng, radiusKm);

    let query = (supabase as any)
      .from('users')
      .select(
        'id,plan,location_lat,location_lng,primary_trade,additional_trades,subscription_status,complimentary_premium_until'
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
        return NextResponse.json({
          totalAccountsRounded: '0+',
          totalAccountsExact: 0,
          trades: [],
          missingLocation: false,
        });
      }
      console.error('Discovery candidates error:', candErr);
      return NextResponse.json(
        { error: 'Failed to load discovery data' },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as UserRow[];

    const tradeCounts: Record<string, number> = {};

    const candidatesWithMeta = rows
      .map((row) => {
        const coords = getCandidateCoords(row);
        if (!coords) return null;
        const distanceKm = haversineKm(
          center.lat,
          center.lng,
          coords.lat,
          coords.lng
        );
        if (distanceKm > radiusKm) return null;
        return { row, distanceKm, isPremium: isPremiumCandidate(row) };
      })
      .filter((c): c is { row: UserRow; distanceKm: number; isPremium: boolean } =>
        c != null
      );

    candidatesWithMeta.sort(
      (a, b) =>
        Number(b.isPremium) - Number(a.isPremium) ||
        a.distanceKm - b.distanceKm
    );

    for (const { row } of candidatesWithMeta) {
      for (const t of getTradesFromRow(row)) {
        const key = t.trim();
        if (key) tradeCounts[key] = (tradeCounts[key] ?? 0) + 1;
      }
    }

    const withinRadius = candidatesWithMeta.map((c) => c.row);

    const sortedTrades = Object.entries(tradeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([trade, count]) => ({ trade, count }));

    return NextResponse.json({
      totalAccountsRounded: roundCount(withinRadius.length),
      totalAccountsExact: withinRadius.length,
      trades: sortedTrades,
    });
  } catch (err: unknown) {
    console.error('trades-near-you error:', err);
    return NextResponse.json(
      { error: 'Failed to load discovery' },
      { status: 500 }
    );
  }
}
