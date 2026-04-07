/**
 * GET /api/discovery/trade/[trade] — powers `/subcontractors`.
 *
 * **Availability-driven directory:** a user appears here only if they have an **active listed availability**
 * (≥ one `subcontractor_availability` row with `date >= today`, UTC calendar day). A public profile alone
 * is not sufficient. Broader “who exists on the platform” discovery stays on `/api/discovery/search`.
 */

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
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import { getPrimaryUserCoordinates } from '@/lib/location/get-user-coordinates';
import {
  loadPublicDirectoryUserRows,
  loadViewerDiscoveryRow,
} from '@/lib/discovery/public-directory-query';
import { formatUnknownError } from '@/lib/supabase/postgrest-errors';
import { isLikelyTestAccount } from '@/lib/test-account';
import { loadUserIdsWithActiveSubcontractorListing } from '@/lib/discovery/subcontractor-listing-availability';
import { profileStrengthRankBoost } from '@/lib/discovery/profile-strength-rank-boost';

type UserRow = {
  id: string;
  plan?: string | null;
  role?: string | null;
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
  avatar?: string | null;
  subscription_status?: string | null;
  complimentary_premium_until?: string | null;
  /** From directory select when available; missing after schema fallback → boost 0. */
  profile_strength_score?: number | null;
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

function parseBoolEnv(v: string | undefined | null): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

function discoveryTradeErrorResponse(
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
  console.error('[discovery/trade] failing stage', { stage, message: resolvedError, details, err });
  return NextResponse.json({ error: resolvedError, stage, details }, { status });
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ trade: string }> }
) {
  try {
    const { trade: tradeParam } = await ctx.params;
    if (!tradeParam?.trim()) {
      return NextResponse.json(
        { error: 'Trade parameter required', stage: 'params', details: {} },
        { status: 400 }
      );
    }

    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
    const excludeTestAccountsOverride = parseBoolEnv(process.env.DISCOVERY_EXCLUDE_TEST_ACCOUNTS);
    const excludeTestAccounts =
      excludeTestAccountsOverride != null ? excludeTestAccountsOverride : isProd;

    const supabaseAuth = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerRes = await loadViewerDiscoveryRow(supabaseAuth, user.id);
    if (!viewerRes.ok) {
      return discoveryTradeErrorResponse(
        500,
        viewerRes.stage,
        'Could not load your profile',
        viewerRes.error
      );
    }

    const me = viewerRes.me as UserRow;
    const center = getViewerCenter(me);
    const radiusKm = getDiscoveryRadiusKm(me);
    const isViewerPremium = getTier(me) === 'premium';

    const supabaseService = createServiceSupabase();

    const listingRes = await loadUserIdsWithActiveSubcontractorListing(supabaseService);
    if (!listingRes.ok) {
      return discoveryTradeErrorResponse(
        500,
        listingRes.stage,
        'Failed to load availability listings',
        listingRes.error
      );
    }
    const userIdsWithActiveListing = listingRes.userIds;

    const dirRes = await loadPublicDirectoryUserRows(supabaseService, user.id);
    if (!dirRes.ok) {
      return discoveryTradeErrorResponse(
        500,
        dirRes.stage,
        'Failed to load profiles',
        dirRes.error
      );
    }

    // Must have listed availability (today or future); public profile is necessary but not enough.
    let rows = (dirRes.rows as UserRow[]).filter((r) => userIdsWithActiveListing.has(r.id));
    rows = rows.filter((r) => {
      if (!Object.prototype.hasOwnProperty.call(r, 'role')) return true;
      return String((r as { role?: string }).role ?? '').toLowerCase() !== 'admin';
    });
    if (excludeTestAccounts) {
      rows = rows.filter(
        (r) =>
          !isLikelyTestAccount({
            name: r.name ?? null,
            businessName: r.business_name ?? null,
          })
      );
    }

    const tradeParamNorm = tradeParam.trim().toLowerCase();
    const matchAllTrades = tradeParamNorm === 'all';

    const allMatchingWithDistance: { row: UserRow; distanceKm: number | null; isPremium: boolean }[] =
      [];

    for (const row of rows) {
      if (!matchAllTrades && !matchesTrade(row, tradeParam)) continue;
      const coords = getCandidateCoords(row);
      const distanceKm =
        center != null && coords
          ? haversineKm(center.lat, center.lng, coords.lat, coords.lng)
          : null;
      allMatchingWithDistance.push({
        row,
        distanceKm,
        isPremium: isPremiumCandidate(row),
      });
    }

    const withinRadius = allMatchingWithDistance.filter(
      (c) => c.distanceKm == null || c.distanceKm <= radiusKm
    );
    const outsideRadiusCount = isViewerPremium
      ? 0
      : allMatchingWithDistance.filter(
          (c) => c.distanceKm != null && c.distanceKm > radiusKm
        ).length;

    withinRadius.sort((a, b) => {
      const p = Number(b.isPremium) - Number(a.isPremium);
      if (p !== 0) return p;
      const da = a.distanceKm;
      const db = b.distanceKm;
      if (da == null && db == null) {
        // no distance — tie-break by profile strength, then id
        const sa = profileStrengthRankBoost(a.row.profile_strength_score);
        const sb = profileStrengthRankBoost(b.row.profile_strength_score);
        if (sb !== sa) return sb - sa;
        return String(a.row.id).localeCompare(String(b.row.id));
      }
      if (da == null) return 1;
      if (db == null) return -1;
      if (da !== db) return da - db;
      const sa = profileStrengthRankBoost(a.row.profile_strength_score);
      const sb = profileStrengthRankBoost(b.row.profile_strength_score);
      if (sb !== sa) return sb - sa;
      return String(a.row.id).localeCompare(String(b.row.id));
    });

    const cards = withinRadius.map((c) => mapToCard(c.row, c.isPremium));

    const payload: Record<string, unknown> = {
      profiles: cards,
      outsideRadiusCount,
      allowedRadiusKm: radiusKm,
    };
    if (!center) {
      payload.message =
        'Add your location to see distance ordering and radius hints. You can still browse matching trades.';
    }

    return NextResponse.json(payload);
  } catch (err: unknown) {
    console.error('discovery trade/[trade] error:', err);
    return discoveryTradeErrorResponse(500, 'unhandled', 'Failed to load profiles', err);
  }
}
