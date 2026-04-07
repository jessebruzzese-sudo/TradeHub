/**
 * GET /api/discovery/search — `/search` directory.
 * Intentionally **not** filtered by `subcontractor_availability`. For “who has listed availability now”, use
 * `/api/discovery/trade/*` (see `trade/[trade]/route.ts`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { getViewerCenter, getDiscoveryRadiusKm } from '@/lib/discovery';
import { getTier } from '@/lib/plan-limits';
import { hasValidABN } from '@/lib/abn-utils';
import { isLikelyTestAccount } from '@/lib/test-account';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import {
  loadPublicDirectoryUserRows,
  loadViewerDiscoveryRow,
} from '@/lib/discovery/public-directory-query';
import { formatUnknownError } from '@/lib/supabase/postgrest-errors';
import { profileStrengthRankBoost } from '@/lib/discovery/profile-strength-rank-boost';

type UserRow = {
  id: string;
  plan?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  lat?: number | null;
  lng?: number | null;
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

function getTradesFromRow(row: UserRow): string[] {
  const { trades } = deriveTradesForDirectory(row);
  return trades;
}

/**
 * Safe trades list for directory rows: canonical helper first, then manual merge/dedupe.
 * Never throws on null/odd `additional_trades` shapes.
 */
function deriveTradesForDirectory(row: UserRow): { trades: string[]; usedFallback: boolean } {
  let trades: string[] = [];
  let usedFallback = false;
  try {
    trades = getDisplayTradeListFromUserRow(row);
  } catch {
    usedFallback = true;
    trades = [];
  }
  if (trades.length > 0) {
    return { trades, usedFallback };
  }
  usedFallback = true;
  const primary = typeof row?.primary_trade === 'string' ? row.primary_trade.trim() : '';
  const rawAdd = row?.additional_trades;
  let extra: string[] = [];
  if (Array.isArray(rawAdd)) {
    extra = rawAdd
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean);
  } else if (typeof rawAdd === 'string') {
    extra = rawAdd
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const merged = [...(primary ? [primary] : []), ...extra];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of merged) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return { trades: out, usedFallback };
}

function matchesTrade(row: UserRow, tradeParam: string): boolean {
  let trades: string[] = [];
  try {
    trades = getTradesFromRow(row);
  } catch {
    trades = [];
  }
  const target = tradeMatchKey(tradeParam);
  return trades.some((t) => tradeMatchKey(t) === target);
}

function isVerified(row: UserRow): boolean {
  try {
    return hasValidABN(row);
  } catch {
    return false;
  }
}

/** Post-query only: skip admin if `role` is present on the row (not selected in SAFE_DIRECTORY_SELECT). */
function shouldExcludeAdminRow(row: UserRow): boolean {
  if (row == null || typeof row !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(row, 'role')) return false;
  const r = (row as { role?: unknown }).role;
  return typeof r === 'string' && r.trim().toLowerCase() === 'admin';
}

/** In-memory test filtering using name/business_name heuristics; email patterns need email on row (not selected). */
function shouldExcludeTestAccountRow(row: UserRow): boolean {
  return isLikelyTestAccount({
    name: row.name ?? null,
    businessName: row.business_name ?? null,
  });
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
  let tradesNorm: string[] = [];
  try {
    tradesNorm = getTradesFromRow(row).map((t) => norm(t));
  } catch {
    tradesNorm = [];
  }
  return (
    name.includes(queryText) ||
    loc.includes(queryText) ||
    postcode.includes(queryText) ||
    tradesNorm.some((t) => t.includes(queryText))
  );
}

function normalizeAdditionalTradesForResponse(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const arr = raw
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean);
    return arr.length ? arr : null;
  }
  if (typeof raw === 'string') {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  return null;
}

function safeRoleFromRow(row: UserRow): string | null {
  if (!Object.prototype.hasOwnProperty.call(row, 'role')) return null;
  const r = (row as { role?: unknown }).role;
  return typeof r === 'string' ? r : r == null ? null : String(r);
}

/** Directory rows omit billing; never infer premium from missing fields. */
function mapCandidateToProfile(
  row: UserRow,
  ratings:
    | { rating_avg: number; rating_count: number; up_count: number; down_count: number }
    | undefined,
  trades: string[]
) {
  const ratingAvg = ratings != null ? ratings.rating_avg : null;
  const ratingCount = ratings != null ? ratings.rating_count : null;
  return {
    id: row.id,
    name: row.name ?? null,
    business_name: row.business_name ?? null,
    role: safeRoleFromRow(row),
    location: row.location ?? null,
    postcode: row.postcode ?? null,
    avatar: row.avatar ?? null,
    cover_url: row.cover_url ?? null,
    mini_bio: row.mini_bio ?? null,
    trades,
    rating: row.rating ?? null,
    rating_avg: ratingAvg,
    rating_count: ratingCount,
    average_rating: ratingAvg,
    review_count: ratingCount,
    up_count: ratings?.up_count ?? null,
    down_count: ratings?.down_count ?? null,
    is_public_profile: row.is_public_profile ?? null,
    primary_trade: row.primary_trade ?? null,
    additional_trades: normalizeAdditionalTradesForResponse(row.additional_trades),
    abn: row.abn ?? null,
    abn_status: row.abn_status ?? null,
    abn_verified_at: row.abn_verified_at ?? null,
    subscription_status: null,
    complimentary_premium_until: null,
    pricing_type: null,
    pricing_amount: null,
    show_pricing_in_listings: null,
    premium_now: false,
    premium_expires_at: null,
    distance_km: null,
    reliability_rating: row.reliability_rating ?? null,
    reliability_percent: reliabilityToPercent(row.reliability_rating ?? null),
    profile_strength_score: row.profile_strength_score ?? null,
    completed_jobs: row.completed_jobs ?? null,
  };
}

function profileVerifiedForSort(p: {
  abn?: unknown;
  abn_status?: unknown;
}): boolean {
  try {
    return hasValidABN({
      abn: p.abn as string | null | undefined,
      abn_status: p.abn_status as string | null | undefined,
    });
  } catch {
    return false;
  }
}

type DirectoryProfileOut = ReturnType<typeof mapCandidateToProfile>;

/**
 * Distance is not used (no stable coords on directory rows).
 * Order: verified first, rating desc, profile-strength boost (tie-break), name asc, id.
 */
function compareDirectoryProfiles(a: DirectoryProfileOut, b: DirectoryProfileOut): number {
  const va = profileVerifiedForSort(a);
  const vb = profileVerifiedForSort(b);
  if (vb !== va) return Number(vb) - Number(va);

  const ra = Number(a.rating_avg ?? a.rating ?? 0);
  const rb = Number(b.rating_avg ?? b.rating ?? 0);
  if (rb !== ra) return rb - ra;

  const sa = profileStrengthRankBoost(a.profile_strength_score);
  const sb = profileStrengthRankBoost(b.profile_strength_score);
  if (sb !== sa) return sb - sa;

  const na = String(a.name ?? a.business_name ?? '').toLowerCase();
  const nb = String(b.name ?? b.business_name ?? '').toLowerCase();
  const lc = na.localeCompare(nb);
  if (lc !== 0) return lc;
  return String(a.id).localeCompare(String(b.id));
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

function discoveryErrorResponse(
  status: number,
  stage: string,
  message: string,
  err?: unknown
): NextResponse {
  const fromErr = formatUnknownError(err ?? '');
  const resolvedError = fromErr.trim() ? fromErr : message;
  const details: Record<string, string> = { fallbackMessage: message };
  if (err && typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (e.code != null) details.code = String(e.code);
    if (e.message != null) details.pgMessage = String(e.message);
    if (e.details != null) details.pgDetails = String(e.details);
    if (e.hint != null) details.hint = String(e.hint);
  }
  console.error('[discovery/search] failing stage', { stage, message: resolvedError, details, err });
  return NextResponse.json({ error: resolvedError, stage, details }, { status });
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
    // `/search` is a public directory. Service role reads; SQL avoids optional columns (role/email filters are post-query in this route).
    const supabase = createServiceSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerRes = await loadViewerDiscoveryRow(supabaseAuth, user.id);
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

    console.log(
      '[discovery/search] query-level filters: no SQL role/admin, no SQL test-account email filters (public-directory-query + post-filters here)'
    );
    const dirRes = await loadPublicDirectoryUserRows(supabase, user.id);
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
    let rows = dirRes.rows as UserRow[];
    console.log('[discovery/search] directory rows from db', { count: rows.length });

    const beforeAdmin = rows.length;
    rows = rows.filter((r) => !shouldExcludeAdminRow(r));
    if (beforeAdmin !== rows.length) {
      console.log('[discovery/search] post-filter admin (only when role present on row)', {
        before: beforeAdmin,
        after: rows.length,
      });
    }

    if (excludeTestAccounts) {
      const beforeT = rows.length;
      rows = rows.filter((r) => !shouldExcludeTestAccountRow(r));
      console.log('[discovery/search] post-filter test accounts (name/business_name heuristics only)', {
        before: beforeT,
        after: rows.length,
      });
    }

    dbg('H1-api-returning-empty', 'candidates:raw', {
      count: rows.length,
      sample: rows.slice(0, 5).map((r) => ({
        id: r.id,
        role: safeRoleFromRow(r),
        is_public_profile: r.is_public_profile ?? null,
        primary_trade: r.primary_trade ?? null,
      })),
    });
    if (DEBUG) {
      console.log('[discovery/search] candidates raw', {
        count: rows.length,
        sample: rows.slice(0, 5).map((r) => ({
          id: r.id,
          is_public_profile: r.is_public_profile,
          role: safeRoleFromRow(r),
          primary_trade: r.primary_trade,
          additional_trades: r.additional_trades,
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

    const matchedRows: UserRow[] = [];
    const debugCounts: Record<string, number> | null = DEBUG
      ? {
          rawCandidateCount: rows.length,
          afterVerifiedCount: 0,
          afterTradeCount: 0,
          afterTextCount: 0,
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

      matchedRows.push(row);
    }
    if (debugCounts) debugCounts.finalResultCount = matchedRows.length;
    dbg('H1-api-returning-empty', 'filtering:summary', {
      counts: debugCounts,
    });
    if (DEBUG) {
      console.log('[discovery/search] filtering summary', {
        counts: debugCounts,
      });
    }

    let tradesFallbackRows = 0;
    const profiles: DirectoryProfileOut[] = matchedRows.map((row) => {
      const { trades, usedFallback } = deriveTradesForDirectory(row);
      if (usedFallback) tradesFallbackRows += 1;
      return mapCandidateToProfile(row, ratingsMap.get(row.id), trades);
    });

    console.log('[discovery/search] response mapping', {
      profileCount: profiles.length,
      tradesDerivedWithFallbackRowCount: tradesFallbackRows,
      sort: 'verified_then_rating_then_profile_strength_then_name_then_id',
      distanceKm: 'omitted (null on all)',
      premium_now: 'false for directory rows (no billing in select)',
      viewerPremium: isViewerPremium,
    });

    profiles.sort(compareDirectoryProfiles);

    if (DEBUG) {
      console.log('[discovery/search] profiles final', {
        count: profiles.length,
        sample: profiles.slice(0, 5).map((p) => ({
          id: p.id,
          is_public_profile: p.is_public_profile,
          role: p.role,
          primary_trade: p.primary_trade,
          tradesLen: Array.isArray(p.trades) ? p.trades.length : 0,
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
