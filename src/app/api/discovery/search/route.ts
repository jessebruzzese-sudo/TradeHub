import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import {
  getViewerCenter,
  getDiscoveryRadiusKm,
  haversineKm,
  isPremiumCandidate,
} from '@/lib/discovery';
import { getTier } from '@/lib/plan-limits';
import { hasValidABN } from '@/lib/abn-utils';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

type UserRow = {
  id: string;
  plan?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
  business_name?: string | null;
  name?: string | null;
  base_suburb?: string | null;
  location?: string | null;
  postcode?: string | null;
  abn?: string | null;
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
  is_public_profile?: boolean | null;
  rating?: number | null;
  subscription_status?: string | null;
  premium_until?: string | null;
  complimentary_premium_until?: string | null;
  pricing_type?: string | null;
  pricing_amount?: number | null;
  show_pricing_in_listings?: boolean | null;
};

function tradeMatchKey(s: string): string {
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

function getTradesFromRow(row: UserRow): string[] {
  return getDisplayTradeListFromUserRow(row);
}

function matchesTrade(row: UserRow, tradeParam: string): boolean {
  const trades = getTradesFromRow(row);
  const target = tradeMatchKey(tradeParam);
  return trades.some((t) => tradeMatchKey(t) === target);
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

function matchesText(row: UserRow, queryText: string): boolean {
  if (!queryText) return true;
  const name = norm(row.business_name || row.name);
  const loc = norm(row.location || '');
  const postcode = norm(row.postcode || '');
  const tradesNorm = getTradesFromRow(row).map((t) => norm(t));
  return (
    name.includes(queryText) ||
    loc.includes(queryText) ||
    postcode.includes(queryText) ||
    tradesNorm.some((t) => t.includes(queryText))
  );
}

export const dynamic = 'force-dynamic';

function parseBoolEnv(v: string | undefined | null): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const DEBUG = process.env.DISCOVERY_DEBUG === '1';
    const DEBUG_RUN_ID = 'search-debug-run';

    function dbg(
      hypothesisId: string,
      message: string,
      data?: Record<string, unknown>
    ) {
      if (!DEBUG) return;
      console.log(`[discovery/search][${hypothesisId}] ${message}`, data ?? '');
    }

    /**
     * Env-gated discovery behavior:
     * - `/search` is a platform-wide directory of public profiles.
     * - Distance is enrichment/ranking only; hard radius gating belongs to nearby/discovery experiences.
     * - Production should remain safe by excluding QA/test profiles unless explicitly disabled.
     */
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

    // Flag 1: exclude known QA/test accounts (production default: true).
    const excludeTestAccountsOverride = parseBoolEnv(process.env.DISCOVERY_EXCLUDE_TEST_ACCOUNTS);
    const excludeTestAccounts =
      excludeTestAccountsOverride != null ? excludeTestAccountsOverride : isProd;

    if (DEBUG) {
      console.log('[discovery/search] flags', {
        isProd,
        excludeTestAccounts,
        NODE_ENV: process.env.NODE_ENV ?? null,
        VERCEL_ENV: process.env.VERCEL_ENV ?? null,
        NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV ?? null,
        DISCOVERY_EXCLUDE_TEST_ACCOUNTS: process.env.DISCOVERY_EXCLUDE_TEST_ACCOUNTS ?? null,
      });
    }
    dbg('H2-test-account-exclusion', 'testAccountExclusion:active', {
      excludeTestAccounts,
      isProd,
      override: excludeTestAccountsOverride,
    });
    const supabaseAuth = createServerSupabase();
    // `/search` is a public directory. Use service role reads to avoid RLS making directory look empty,
    // but still enforce `is_public_profile=true` and exclude admin/self at the query level.
    const supabase = createServiceSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: me, error: meErr } = await (supabaseAuth as any)
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
    const viewerMissingLocation = !center;
    const allowedRadiusKm = getDiscoveryRadiusKm(me as UserRow);
    const isViewerPremium = getTier(me) === 'premium';

    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const trade = (searchParams.get('trade') ?? 'all').trim();
    const verifiedOnly = searchParams.get('verifiedOnly') === 'true';

    const tradeNorm = trade.toLowerCase() === 'all' ? '' : tradeMatchKey(trade);
    if (DEBUG) {
      console.log('[discovery/search] request', {
        viewerId: user.id,
        q,
        trade,
        tradeNorm,
        verifiedOnly,
        allowedRadiusKm,
        isViewerPremium,
        viewerMissingLocation,
        center,
        excludeTestAccounts,
        supabaseHost: (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host || null;
          } catch {
            return null;
          }
        })(),
      });
    }
    dbg('H1-api-returning-empty', 'request:params', {
      viewerId: user.id,
      q,
      trade,
      tradeNorm,
      verifiedOnly,
      allowedRadiusKm,
      isViewerPremium,
      viewerMissingLocation,
      center,
    });

    let candidatesQuery = (supabase as any)
      .from('users')
      .select(
        'id,name,business_name,avatar,location,postcode,rating,reliability_rating,completed_jobs,is_public_profile,primary_trade,additional_trades,abn_status,abn_verified_at,subscription_status,premium_until,complimentary_premium_until,pricing_type,pricing_amount,show_pricing_in_listings,plan,location_lat,location_lng,base_lat,base_lng,base_suburb,abn,cover_url,mini_bio,role,is_premium,profile_strength_score'
      )
      .eq('is_public_profile', true)
      .neq('id', user.id)
      .neq('role', 'admin')
      ;
    if (excludeTestAccounts) {
      candidatesQuery = applyExcludeTestAccountsFilters(candidatesQuery);
    }

    const { data: candidates, error: candErr } = await candidatesQuery;

    if (candErr) {
      if (candErr.message?.includes('is_public_profile') || candErr.code === '42P01') {
        return NextResponse.json({ profiles: [], outsideRadiusCount: 0, allowedRadiusKm });
      }
      console.error('[discovery/search] error:', candErr);
      dbg('H5-rls-or-env', 'candidates:error', { code: (candErr as any).code ?? null, message: candErr.message ?? String(candErr) });
      return NextResponse.json(
        { error: 'Failed to load profiles' },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as UserRow[];
    dbg('H1-api-returning-empty', 'candidates:raw', {
      count: rows.length,
      sample: rows.slice(0, 5).map((r) => ({
        id: r.id,
        role: r.role ?? null,
        is_public_profile: r.is_public_profile ?? null,
        primary_trade: r.primary_trade ?? null,
        hasCoords: !!getCandidateCoords(r),
      })),
    });
    if (DEBUG) {
      console.log('[discovery/search] candidates raw', {
        count: rows.length,
        sample: rows.slice(0, 5).map((r) => ({
          id: r.id,
          is_public_profile: r.is_public_profile,
          role: r.role,
          primary_trade: r.primary_trade,
          additional_trades: r.additional_trades,
          hasCoords: !!getCandidateCoords(r),
          location_lat: r.location_lat ?? null,
          location_lng: r.location_lng ?? null,
          base_lat: r.base_lat ?? null,
          base_lng: r.base_lng ?? null,
          location: r.location ?? null,
          base_suburb: r.base_suburb ?? null,
        })),
      });
    }
    const ids = rows.map((r) => r.id).filter(Boolean);

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

    // Directory search: do not hard-exclude by radius. Distance is enrichment only.
    const matchingWithDistance: { row: UserRow; distanceKm: number | null; isPremium: boolean }[] = [];
    const debugCounts: Record<string, number> | null = DEBUG
      ? {
          rawCandidateCount: rows.length,
          afterVerifiedCount: 0,
          afterTradeCount: 0,
          afterTextCount: 0,
          withCoordsCount: 0,
          finalResultCount: 0,
        }
      : null;

    for (const row of rows) {
      if (verifiedOnly && !isVerified(row)) continue;
      if (debugCounts) debugCounts.afterVerifiedCount += 1;

      if (tradeNorm && !matchesTrade(row, trade)) continue;
      if (debugCounts) debugCounts.afterTradeCount += 1;

      if (q && !matchesText(row, q)) continue;
      if (debugCounts) debugCounts.afterTextCount += 1;

      const coords = getCandidateCoords(row);
      let distanceKm: number | null = null;
      if (center != null && coords) {
        distanceKm = haversineKm(center.lat, center.lng, coords.lat, coords.lng);
      }
      if (debugCounts && distanceKm != null) debugCounts.withCoordsCount += 1;
      const premium = isPremiumCandidate(row);

      matchingWithDistance.push({ row, distanceKm, isPremium: premium });
    }
    if (debugCounts) debugCounts.finalResultCount = matchingWithDistance.length;
    dbg('H1-api-returning-empty', 'filtering:summary', {
      counts: debugCounts,
    });
    if (DEBUG) {
      console.log('[discovery/search] filtering summary', {
        counts: debugCounts,
      });
    }

    if (isViewerPremium) {
      // Premium viewer does not change directory eligibility; keep same directory response shape.
      const profiles = matchingWithDistance.map((c) => {
        const ratings = ratingsMap.get(c.row.id);
        return {
          id: c.row.id,
          name: c.row.name ?? null,
          business_name: c.row.business_name ?? null,
          role: c.row.role ?? null,
          location: c.row.location ?? c.row.base_suburb ?? null,
          postcode: c.row.postcode ?? null,
          avatar: c.row.avatar ?? null,
          cover_url: c.row.cover_url ?? null,
          mini_bio: c.row.mini_bio ?? null,
          rating: c.row.rating ?? null,
          rating_avg: ratings?.rating_avg ?? null,
          rating_count: ratings?.rating_count ?? null,
          average_rating: ratings?.rating_avg ?? null,
          review_count: ratings?.rating_count ?? null,
          up_count: ratings?.up_count ?? null,
          down_count: ratings?.down_count ?? null,
          is_public_profile: c.row.is_public_profile ?? null,
          primary_trade: c.row.primary_trade ?? null,
          additional_trades: Array.isArray(c.row.additional_trades) ? c.row.additional_trades : null,
          abn_status: c.row.abn_status ?? null,
          abn_verified_at: c.row.abn_verified_at ?? null,
          subscription_status: c.row.subscription_status ?? null,
          premium_until: c.row.premium_until ?? null,
          complimentary_premium_until: c.row.complimentary_premium_until ?? null,
          pricing_type: c.row.pricing_type ?? null,
          pricing_amount: c.row.pricing_amount ?? null,
          show_pricing_in_listings: c.row.show_pricing_in_listings ?? null,
          premium_now: c.isPremium,
          distance_km: c.distanceKm,
          reliability_rating: (c.row as UserRow).reliability_rating ?? null,
          reliability_percent: reliabilityToPercent((c.row as UserRow).reliability_rating ?? null),
          profile_strength_score: (c.row as UserRow).profile_strength_score ?? null,
          completed_jobs: (c.row as UserRow).completed_jobs ?? null,
        };
      });

      profiles.sort((a, b) => {
        // 1) premium first
        const pf = Number(!!b.premium_now) - Number(!!a.premium_now);
        if (pf !== 0) return pf;
        // 2) stronger profile signal
        const sa = Number(a.profile_strength_score ?? 0);
        const sb = Number(b.profile_strength_score ?? 0);
        if (sb !== sa) return sb - sa;
        // 3) known distance before unknown
        const da = a.distance_km;
        const db = b.distance_km;
        if (da == null && db != null) return 1;
        if (da != null && db == null) return -1;
        // 4) nearer first when known
        if (da != null && db != null && da !== db) return da - db;
        // 5) stable alpha fallback
        return String(a.business_name || a.name || '').localeCompare(
          String(b.business_name || b.name || '')
        );
      });

      if (DEBUG) {
        console.log('[discovery/search] profiles final', {
          count: profiles.length,
          sample: profiles.slice(0, 5).map((p) => ({
            id: p.id,
            is_public_profile: p.is_public_profile,
            role: p.role,
            primary_trade: p.primary_trade,
            distance_km: p.distance_km,
          })),
        });
      }
      return NextResponse.json({
        profiles,
        outsideRadiusCount: 0,
        allowedRadiusKm,
        missingLocation: false,
        viewerMissingLocation,
      });
    }

    const profiles = matchingWithDistance.map((c) => {
      const ratings = ratingsMap.get(c.row.id);
      return {
        id: c.row.id,
        name: c.row.name ?? null,
        business_name: c.row.business_name ?? null,
        role: c.row.role ?? null,
        location: c.row.location ?? c.row.base_suburb ?? null,
        postcode: c.row.postcode ?? null,
        avatar: c.row.avatar ?? null,
        cover_url: c.row.cover_url ?? null,
        mini_bio: c.row.mini_bio ?? null,
        rating: c.row.rating ?? null,
        rating_avg: ratings?.rating_avg ?? null,
        rating_count: ratings?.rating_count ?? null,
        average_rating: ratings?.rating_avg ?? null,
        review_count: ratings?.rating_count ?? null,
        up_count: ratings?.up_count ?? null,
        down_count: ratings?.down_count ?? null,
        is_public_profile: c.row.is_public_profile ?? null,
        primary_trade: c.row.primary_trade ?? null,
        additional_trades: Array.isArray(c.row.additional_trades) ? c.row.additional_trades : null,
        abn_status: c.row.abn_status ?? null,
        abn_verified_at: c.row.abn_verified_at ?? null,
        subscription_status: c.row.subscription_status ?? null,
        premium_until: c.row.premium_until ?? null,
        complimentary_premium_until: c.row.complimentary_premium_until ?? null,
        pricing_type: c.row.pricing_type ?? null,
        pricing_amount: c.row.pricing_amount ?? null,
        show_pricing_in_listings: c.row.show_pricing_in_listings ?? null,
        premium_now: c.isPremium,
        distance_km: c.distanceKm,
        reliability_rating: (c.row as UserRow).reliability_rating ?? null,
        reliability_percent: reliabilityToPercent((c.row as UserRow).reliability_rating ?? null),
        profile_strength_score: (c.row as UserRow).profile_strength_score ?? null,
        completed_jobs: (c.row as UserRow).completed_jobs ?? null,
      };
    });

    profiles.sort((a, b) => {
      const pf = Number(!!b.premium_now) - Number(!!a.premium_now);
      if (pf !== 0) return pf;
      const sa = Number(a.profile_strength_score ?? 0);
      const sb = Number(b.profile_strength_score ?? 0);
      if (sb !== sa) return sb - sa;
      const da = a.distance_km;
      const db = b.distance_km;
      if (da == null && db != null) return 1;
      if (da != null && db == null) return -1;
      if (da != null && db != null && da !== db) return da - db;
      return String(a.business_name || a.name || '').localeCompare(
        String(b.business_name || b.name || '')
      );
    });

    if (DEBUG) {
      console.log('[discovery/search] profiles final', {
        count: profiles.length,
        sample: profiles.slice(0, 5).map((p) => ({
          id: p.id,
          is_public_profile: p.is_public_profile,
          role: p.role,
          primary_trade: p.primary_trade,
          distance_km: p.distance_km,
        })),
      });
    }
    return NextResponse.json({
      profiles,
      outsideRadiusCount: 0,
      allowedRadiusKm,
      missingLocation: false,
      viewerMissingLocation,
    });
  } catch (err: unknown) {
    console.error('[discovery/search] error:', err);
    // Best-effort: do not leak error details.
    return NextResponse.json(
      { error: 'Failed to load search results' },
      { status: 500 }
    );
  }
}
