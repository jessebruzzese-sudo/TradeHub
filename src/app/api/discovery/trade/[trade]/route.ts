import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  getViewerCenter,
  getDiscoveryRadiusKm,
  bboxForRadiusKm,
  haversineKm,
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
  business_name?: string | null;
  name?: string | null;
  base_suburb?: string | null;
  location?: string | null;
  postcode?: string | null;
  abn_status?: string | null;
  avatar?: string | null;
  is_premium?: boolean | null;
  active_plan?: string | null;
  subscription_status?: string | null;
  subcontractor_plan?: string | null;
  subcontractor_sub_status?: string | null;
};

function normalizeTrade(s: string): string {
  return s.trim().toLowerCase();
}

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

function matchesTrade(row: UserRow, tradeParam: string): boolean {
  const trades = getTradesFromRow(row);
  const target = normalizeTrade(tradeParam);
  return trades.some((t) => normalizeTrade(t) === target);
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
    row.base_suburb ??
    row.location ??
    null;

  const verified =
    (row as Record<string, unknown>).is_verified === true ||
    (row as Record<string, unknown>).abn_verified === true ||
    (row.abn_status && String(row.abn_status).toUpperCase() === 'VERIFIED');

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
        profiles: [],
        message: 'Add your location to discover trades near you.',
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
        'id,location_lat,location_lng,base_lat,base_lng,primary_trade,additional_trades,trades,business_name,name,base_suburb,location,postcode,abn_status,avatar,is_premium,active_plan,subscription_status,subcontractor_plan,subcontractor_sub_status'
      )
      .eq('is_public_profile', true)
      .neq('id', user.id)
      .or(orClause);

    const { data: candidates, error: candErr } = await query;

    if (candErr) {
      if (candErr.message?.includes('is_public_profile') || candErr.code === '42P01') {
        return NextResponse.json({ profiles: [] });
      }
      console.error('Discovery trade route error:', candErr);
      return NextResponse.json(
        { error: 'Failed to load profiles' },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as UserRow[];
    const candidatesWithMeta: {
      row: UserRow;
      distanceKm: number;
      isPremium: boolean;
    }[] = [];

    for (const row of rows) {
      if (!matchesTrade(row, tradeParam)) continue;
      const coords = getCandidateCoords(row);
      if (!coords) continue;
      const distanceKm = haversineKm(
        center.lat,
        center.lng,
        coords.lat,
        coords.lng
      );
      if (distanceKm > radiusKm) continue;
      candidatesWithMeta.push({
        row,
        distanceKm,
        isPremium: isPremiumCandidate(row),
      });
    }

    candidatesWithMeta.sort(
      (a, b) =>
        Number(b.isPremium) - Number(a.isPremium) ||
        a.distanceKm - b.distanceKm
    );

    const cards = candidatesWithMeta.map((c) =>
      mapToCard(c.row, c.isPremium)
    );

    return NextResponse.json({ profiles: cards });
  } catch (err: unknown) {
    console.error('discovery trade/[trade] error:', err);
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    );
  }
}
