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
import { isPostgrestSchemaColumnError } from '@/lib/postgrest-schema-error';
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
  abn_verified_at?: string | null;
  avatar?: string | null;
  cover_url?: string | null;
  mini_bio?: string | null;
  role?: string | null;
  premium_now?: boolean | null;
  premium_expires_at?: string | null;
  reliability_rating?: number | null;
  profile_strength_score?: number | null;
  completed_jobs?: number | null;
  is_public_profile?: boolean | null;
  rating?: number | null;
  subscription_status?: string | null;
  complimentary_premium_until?: string | null;
  pricing_type?: string | null;
  pricing_amount?: number | null;
  show_pricing_in_listings?: boolean | null;
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

/** Broad → narrow: tolerate production DBs missing newer columns (PostgREST PGRST204 / 42703). */
const VIEWER_SELECT_LAYERS = [
  'id,plan,location_lat,location_lng,search_lat,search_lng,subscription_status,complimentary_premium_until',
  'id,plan,location_lat,location_lng,subscription_status,complimentary_premium_until',
  'id,subscription_status,complimentary_premium_until',
] as const;

const DIRECTORY_SELECT_LAYERS = [
  'id,name,business_name,avatar,location,postcode,rating,reliability_rating,completed_jobs,is_public_profile,primary_trade,additional_trades,abn_status,abn_verified_at,subscription_status,complimentary_premium_until,pricing_type,pricing_amount,show_pricing_in_listings,plan,location_lat,location_lng,abn,cover_url,mini_bio,role,profile_strength_score',
  'id,name,business_name,avatar,location,postcode,rating,reliability_rating,completed_jobs,is_public_profile,primary_trade,additional_trades,abn_status,abn_verified_at,subscription_status,complimentary_premium_until,plan,location_lat,location_lng,abn,cover_url,role',
  'id,name,business_name,avatar,location,postcode,rating,reliability_rating,completed_jobs,is_public_profile,primary_trade,additional_trades,abn_status,abn_verified_at,abn,subscription_status,complimentary_premium_until,plan,location_lat,location_lng,role',
  'id,name,business_name,avatar,location,is_public_profile,primary_trade,additional_trades,abn,role,plan,location_lat,location_lng',
] as const;

function discoveryErrorResponse(
  status: number,
  stage: string,
  message: string,
  err?: unknown
): NextResponse {
  const dev = process.env.NODE_ENV === 'development';
  const code =
    err && typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : null;
  const pgMessage =
    err && typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : null;
  const body: Record<string, unknown> = {
    error: message,
    stage,
    ...(code ? { code } : {}),
  };
  if (dev && pgMessage) body.details = { message: pgMessage };
  return NextResponse.json(body, { status });
}

async function loadViewerRow(
  supabaseAuth: ReturnType<typeof createServerSupabase>,
  userId: string
): Promise<
  | { ok: true; me: Record<string, unknown> }
  | { ok: false; error: unknown; stage: 'viewer_profile' }
> {
  let lastErr: unknown = null;
  for (const select of VIEWER_SELECT_LAYERS) {
    const { data, error } = await (supabaseAuth as any)
      .from('users')
      .select(select)
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      if (data) return { ok: true as const, me: data };
      return {
        ok: false as const,
        error: new Error('User profile row not found'),
        stage: 'viewer_profile' as const,
      };
    }
    lastErr = error;
    if (!isPostgrestSchemaColumnError(error)) {
      return { ok: false as const, error, stage: 'viewer_profile' as const };
    }
  }
  return { ok: false as const, error: lastErr, stage: 'viewer_profile' as const };
}

async function loadDirectoryRows(
  supabase: ReturnType<typeof createServiceSupabase>,
  viewerId: string,
  excludeTestAccounts: boolean
): Promise<
  | { ok: true; rows: UserRow[] }
  | { ok: false; error: unknown; stage: 'candidates_query' }
> {
  for (const select of DIRECTORY_SELECT_LAYERS) {
    let q = (supabase as any)
      .from('users')
      .select(select)
      .eq('is_public_profile', true)
      .neq('id', viewerId)
      .neq('role', 'admin');
    if (excludeTestAccounts) q = applyExcludeTestAccountsFilters(q);

    let { data, error } = await q.is('deleted_at', null);
    if (
      error &&
      isPostgrestSchemaColumnError(error) &&
      /deleted_at/i.test(String((error as { message?: string }).message ?? ''))
    ) {
      let q2 = (supabase as any)
        .from('users')
        .select(select)
        .eq('is_public_profile', true)
        .neq('id', viewerId)
        .neq('role', 'admin');
      if (excludeTestAccounts) q2 = applyExcludeTestAccountsFilters(q2);
      ({ data, error } = await q2);
    }

    if (!error) {
      return { ok: true, rows: (data ?? []) as UserRow[] };
    }
    if (!isPostgrestSchemaColumnError(error)) {
      return { ok: false, error, stage: 'candidates_query' };
    }
  }
  return {
    ok: false,
    error: new Error('Directory query failed for all column sets'),
    stage: 'candidates_query',
  };
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

    const viewerRes = await loadViewerRow(supabaseAuth, user.id);
    if (!viewerRes.ok) {
      console.error('[discovery/search] viewer load failed', {
        stage: viewerRes.stage,
        err: viewerRes.error,
      });
      return discoveryErrorResponse(
        500,
        viewerRes.stage,
        'Could not load your profile',
        viewerRes.error
      );
    }
    const me = viewerRes.me;
    const meForDiscovery = me as UserRow;

    const center = getViewerCenter(meForDiscovery);
    const viewerMissingLocation = !center;
    const allowedRadiusKm = getDiscoveryRadiusKm(meForDiscovery);
    const isViewerPremium = getTier(meForDiscovery) === 'premium';

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

    const dirRes = await loadDirectoryRows(supabase, user.id, excludeTestAccounts);
    if (!dirRes.ok) {
      console.error('[discovery/search] candidates query failed', {
        stage: dirRes.stage,
        err: dirRes.error,
      });
      dbg('H5-rls-or-env', 'candidates:error', {
        code: (dirRes.error as any)?.code ?? null,
        message: (dirRes.error as any)?.message ?? String(dirRes.error),
      });
      return discoveryErrorResponse(500, dirRes.stage, 'Failed to load profiles', dirRes.error);
    }
    const rows = dirRes.rows;
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
          location: r.location ?? null,
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
          location: c.row.location ?? null,
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
        location: c.row.location ?? null,
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
    return discoveryErrorResponse(500, 'unhandled', 'Failed to load search results', err);
  }
}
