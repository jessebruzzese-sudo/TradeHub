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

type UserRow = {
  id: string;
  location_lat?: number | null;
  location_lng?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  search_lat?: number | null;
  search_lng?: number | null;
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
  trades?: unknown;
  is_premium?: boolean | null;
  active_plan?: string | null;
  subscription_status?: string | null;
  subcontractor_plan?: string | null;
  subcontractor_sub_status?: string | null;
};

/** Candidate coords: prefer location_* else base_* (never search_* for candidates). */
function getCandidateCoords(row: UserRow): { lat: number; lng: number } | null {
  const lat = row.location_lat ?? row.base_lat ?? null;
  const lng = row.location_lng ?? row.base_lng ?? null;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

function getTradesFromRow(row: UserRow): string[] {
  const primary = row.primary_trade ? [row.primary_trade] : [];
  let additional: string[] = [];
  const at = row.additional_trades as string[] | string | null | undefined;
  if (Array.isArray(at)) {
    additional = at.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
  } else if (typeof at === 'string') {
    additional = at.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const tradesJson = row.trades;
  let extra: string[] = [];
  if (Array.isArray(tradesJson)) {
    extra = tradesJson
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (typeof tradesJson === 'string') {
    extra = tradesJson.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const set = new Set<string>([...primary, ...additional, ...extra]);
  return Array.from(set).filter(Boolean);
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

    const { data: me, error: meErr } = await supabase
      .from('users')
      .select(
        'id,location_lat,location_lng,base_lat,base_lng,search_lat,search_lng,is_premium,active_plan,subscription_status,subcontractor_plan,subcontractor_sub_status'
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

    const orClause =
      `and(location_lat.gte.${bbox.minLat},location_lat.lte.${bbox.maxLat},location_lng.gte.${bbox.minLng},location_lng.lte.${bbox.maxLng}),` +
      `and(base_lat.gte.${bbox.minLat},base_lat.lte.${bbox.maxLat},base_lng.gte.${bbox.minLng},base_lng.lte.${bbox.maxLng})`;

    let query = supabase
      .from('users')
      .select(
        'id,location_lat,location_lng,base_lat,base_lng,primary_trade,additional_trades,trades,is_premium,active_plan,subscription_status,subcontractor_plan,subcontractor_sub_status'
      )
      .eq('is_public_profile', true)
      .neq('id', user.id)
      .or(orClause);

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
