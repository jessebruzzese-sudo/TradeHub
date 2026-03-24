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

type UserRow = {
  id: string;
  plan?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
  trades?: unknown;
  business_name?: string | null;
  name?: string | null;
  base_suburb?: string | null;
  location?: string | null;
  postcode?: string | null;
  abn_status?: string | null;
  abn_verified_at?: string | null;
  avatar?: string | null;
  cover_url?: string | null;
  mini_bio?: string | null;
  role?: string | null;
  is_premium?: boolean | null;
  premium_now?: boolean | null;
  premium_expires_at?: string | null;
  reliability_rating?: number | null;
  profile_strength_score?: number | null;
  completed_jobs?: number | null;
};

function normalizeTrade(s: string): string {
  return s.trim().toLowerCase();
}

function getCandidateCoords(row: UserRow): { lat: number; lng: number } | null {
  const lat = row.location_lat ?? row.base_lat ?? null;
  const lng = row.location_lng ?? row.base_lng ?? null;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

function getTradesFromRow(row: UserRow, userTradesMap?: Map<string, string[]>): string[] {
  const fromUserTrades = userTradesMap?.get(row.id);
  if (fromUserTrades && fromUserTrades.length > 0) {
    return fromUserTrades;
  }
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
    extra = (tradesJson as string[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
  } else if (typeof tradesJson === 'string') {
    extra = tradesJson.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const set = new Set<string>([...primary, ...additional, ...extra]);
  return Array.from(set).filter(Boolean);
}

function matchesTrade(row: UserRow, tradeParam: string, userTradesMap?: Map<string, string[]>): boolean {
  const trades = getTradesFromRow(row, userTradesMap);
  const target = normalizeTrade(tradeParam);
  return trades.some((t) => normalizeTrade(t) === target);
}

function isVerified(row: UserRow): boolean {
  return hasValidABN(row);
}

function norm(v?: string | null): string {
  return String(v || '').trim().toLowerCase();
}

function reliabilityToPercent(r: number | null | undefined): number | null {
  if (r == null || !Number.isFinite(Number(r))) return null;
  const v = Number(r);
  if (v <= 5) return Math.round((v / 5) * 100);
  return Math.round(Math.min(100, v));
}

function matchesText(row: UserRow, queryText: string, userTradesMap?: Map<string, string[]>): boolean {
  if (!queryText) return true;
  const name = norm(row.business_name || row.name);
  const loc = norm(row.location || '');
  const postcode = norm(row.postcode || '');
  const tradesNorm = getTradesFromRow(row, userTradesMap).map((t) => norm(t));
  return (
    name.includes(queryText) ||
    loc.includes(queryText) ||
    postcode.includes(queryText) ||
    tradesNorm.some((t) => t.includes(queryText))
  );
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
        'id,plan,location_lat,location_lng,base_lat,base_lng,search_lat,search_lng,is_premium,active_plan,subscription_status,subcontractor_plan,subcontractor_sub_status,complimentary_premium_until,premium_until'
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
        missingLocation: true,
        message: 'Add your location to discover profiles near you.',
      });
    }

    const allowedRadiusKm = getDiscoveryRadiusKm(me as UserRow);
    const isViewerPremium = getTier(me) === 'premium';

    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const trade = (searchParams.get('trade') ?? 'all').trim();
    const verifiedOnly = searchParams.get('verifiedOnly') === 'true';

    const tradeNorm = trade.toLowerCase() === 'all' ? '' : normalizeTrade(trade);

    const fetchRadiusKm = Math.max(300, allowedRadiusKm * 3);
    const bbox = bboxForRadiusKm(center.lat, center.lng, fetchRadiusKm);

    const orClause =
      `and(location_lat.gte.${bbox.minLat},location_lat.lte.${bbox.maxLat},location_lng.gte.${bbox.minLng},location_lng.lte.${bbox.maxLng}),` +
      `and(base_lat.gte.${bbox.minLat},base_lat.lte.${bbox.maxLat},base_lng.gte.${bbox.minLng},base_lng.lte.${bbox.maxLng})`;

    let candidatesQuery = (supabase as any)
      .from('users')
      .select(
        'id,plan,location_lat,location_lng,base_lat,base_lng,primary_trade,additional_trades,trades,business_name,name,base_suburb,location,postcode,abn_status,abn_verified_at,avatar,cover_url,mini_bio,role,is_premium,reliability_rating,profile_strength_score,completed_jobs'
      )
      .eq('is_public_profile', true)
      .neq('id', user.id)
      .neq('role', 'admin')
      .or(orClause);
    candidatesQuery = applyExcludeTestAccountsFilters(candidatesQuery);

    const { data: candidates, error: candErr } = await candidatesQuery;

    if (candErr) {
      if (candErr.message?.includes('is_public_profile') || candErr.code === '42P01') {
        return NextResponse.json({ profiles: [], outsideRadiusCount: 0, allowedRadiusKm });
      }
      console.error('[discovery/search] error:', candErr);
      return NextResponse.json(
        { error: 'Failed to load profiles' },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as UserRow[];
    const ids = rows.map((r) => r.id).filter(Boolean);

    let userTradesMap = new Map<string, string[]>();
    if (ids.length > 0) {
      try {
        const { data: utRows } = await (supabase as any)
          .from('user_trades')
          .select('user_id, trade, is_primary')
          .in('user_id', ids)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });
        if (utRows && utRows.length > 0) {
          for (const r of utRows) {
            const uid = (r as { user_id: string }).user_id;
            const arr = userTradesMap.get(uid) ?? [];
            if (!arr.includes((r as { trade: string }).trade)) {
              arr.push((r as { trade: string }).trade);
            }
            userTradesMap.set(uid, arr);
          }
        }
      } catch {
        // user_trades may not exist
      }
    }

    let ratingsMap = new Map<string, { rating_avg: number; rating_count: number; up_count: number; down_count: number }>();
    if (ids.length > 0) {
      try {
        const { data: ratingRows } = await supabase
          .from('user_rating_aggregates')
          .select('target_user_id, rating_avg, rating_count, up_count, down_count')
          .in('target_user_id', ids);
        if (ratingRows) {
          for (const r of ratingRows) {
            const uid = (r as { target_user_id: string }).target_user_id;
            ratingsMap.set(uid, {
              rating_avg: Number((r as { rating_avg: number }).rating_avg) || 0,
              rating_count: Number((r as { rating_count: number }).rating_count) || 0,
              up_count: Number((r as { up_count: number }).up_count) || 0,
              down_count: Number((r as { down_count: number }).down_count) || 0,
            });
          }
        }
      } catch {
        // user_rating_aggregates may not exist
      }
    }

    const matchingWithDistance: { row: UserRow; distanceKm: number; isPremium: boolean }[] = [];

    for (const row of rows) {
      if (verifiedOnly && !isVerified(row)) continue;
      if (tradeNorm && !matchesTrade(row, trade, userTradesMap)) continue;
      if (q && !matchesText(row, q, userTradesMap)) continue;

      const coords = getCandidateCoords(row);
      if (!coords) continue;

      const distanceKm = haversineKm(center.lat, center.lng, coords.lat, coords.lng);
      const premium = isPremiumCandidate(row);

      matchingWithDistance.push({ row, distanceKm, isPremium: premium });
    }

    if (isViewerPremium) {
      const withinRadius = matchingWithDistance.filter((c) => c.distanceKm <= allowedRadiusKm);
      const profiles = withinRadius
        .sort((a, b) => Number(b.isPremium) - Number(a.isPremium) || a.distanceKm - b.distanceKm)
        .map((c) => {
          const ratings = ratingsMap.get(c.row.id);
          return {
            id: c.row.id,
            name: c.row.name ?? null,
            business_name: c.row.business_name ?? null,
            role: c.row.role ?? null,
            trades: getTradesFromRow(c.row, userTradesMap),
            location: c.row.location ?? c.row.base_suburb ?? null,
            postcode: c.row.postcode ?? null,
            avatar: c.row.avatar ?? null,
            cover_url: c.row.cover_url ?? null,
            mini_bio: c.row.mini_bio ?? null,
            rating_avg: ratings?.rating_avg ?? null,
            rating_count: ratings?.rating_count ?? null,
            average_rating: ratings?.rating_avg ?? null,
            review_count: ratings?.rating_count ?? null,
            up_count: ratings?.up_count ?? null,
            down_count: ratings?.down_count ?? null,
            abn_status: c.row.abn_status ?? null,
            abn_verified_at: c.row.abn_verified_at ?? null,
            premium_now: c.isPremium,
            distance_km: c.distanceKm,
            reliability_rating: (c.row as UserRow).reliability_rating ?? null,
            reliability_percent: reliabilityToPercent((c.row as UserRow).reliability_rating ?? null),
            profile_strength_score: (c.row as UserRow).profile_strength_score ?? null,
            completed_jobs: (c.row as UserRow).completed_jobs ?? null,
          };
        });

      return NextResponse.json({
        profiles,
        outsideRadiusCount: 0,
        allowedRadiusKm,
        missingLocation: false,
      });
    }

    const withinRadius = matchingWithDistance.filter((c) => c.distanceKm <= allowedRadiusKm);
    const outsideRadiusCount = matchingWithDistance.filter((c) => c.distanceKm > allowedRadiusKm).length;

    const profiles = withinRadius
      .sort((a, b) => Number(b.isPremium) - Number(a.isPremium) || a.distanceKm - b.distanceKm)
      .map((c) => {
        const ratings = ratingsMap.get(c.row.id);
        return {
          id: c.row.id,
          name: c.row.name ?? null,
          business_name: c.row.business_name ?? null,
          role: c.row.role ?? null,
          trades: getTradesFromRow(c.row, userTradesMap),
          location: c.row.location ?? c.row.base_suburb ?? null,
          postcode: c.row.postcode ?? null,
          avatar: c.row.avatar ?? null,
          cover_url: c.row.cover_url ?? null,
          mini_bio: c.row.mini_bio ?? null,
          rating_avg: ratings?.rating_avg ?? null,
          rating_count: ratings?.rating_count ?? null,
          average_rating: ratings?.rating_avg ?? null,
          review_count: ratings?.rating_count ?? null,
          up_count: ratings?.up_count ?? null,
          down_count: ratings?.down_count ?? null,
          abn_status: c.row.abn_status ?? null,
          abn_verified_at: c.row.abn_verified_at ?? null,
          premium_now: c.isPremium,
          distance_km: c.distanceKm,
          reliability_rating: (c.row as UserRow).reliability_rating ?? null,
          reliability_percent: reliabilityToPercent((c.row as UserRow).reliability_rating ?? null),
          profile_strength_score: (c.row as UserRow).profile_strength_score ?? null,
          completed_jobs: (c.row as UserRow).completed_jobs ?? null,
        };
      });

    return NextResponse.json({
      profiles,
      outsideRadiusCount,
      allowedRadiusKm,
      missingLocation: false,
    });
  } catch (err: unknown) {
    console.error('[discovery/search] error:', err);
    return NextResponse.json(
      { error: 'Failed to load search results' },
      { status: 500 }
    );
  }
}
