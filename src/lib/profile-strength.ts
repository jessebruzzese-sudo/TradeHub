import { createServiceSupabase } from '@/lib/supabase/server';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import {
  profileStrengthBandFromTotal,
  sumProfileStrengthCategoryPoints,
} from '@/lib/profile-strength/compute-total';
import { formatPostgrestError, formatUnknownError } from '@/lib/supabase/postgrest-errors';
import { ensurePublicUserRowById } from '@/lib/ensure-public-user-server';

export type { ProfileStrengthCalc };

/** Log label for which branch handled the strength fetch (server logs / debugging). */
export type ProfileStrengthFetchPath =
  | 'rpc_success'
  | 'user_not_found_fallback'
  | 'rpc_error_fallback'
  | 'parse_fallback'
  | 'unexpected_fallback';

function rpcNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Unwrap PostgREST jsonb if it arrives as a JSON string (edge cases / proxies). */
function unwrapRpcPayload(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
}

/**
 * Jsonb RPC values sometimes arrive as nested single-element arrays (e.g. `[[{...}]]`).
 * If we stop at the outer array, `typeof [] === 'object'` and we read numeric keys only — all categories become 0.
 */
export function peelRpcJsonRoot(value: unknown): unknown {
  let v = unwrapRpcPayload(value);
  while (Array.isArray(v) && v.length === 1) {
    v = v[0];
  }
  return v;
}

function rpcEnvelopeErrorCode(data: unknown): string | null {
  const peeled = peelRpcJsonRoot(data);
  if (!peeled || typeof peeled !== 'object' || Array.isArray(peeled)) return null;
  const err = (peeled as Record<string, unknown>).error;
  return err != null && err !== '' ? String(err) : null;
}

function rpcPayloadPreview(data: unknown, maxLen: number): string {
  if (data === null || data === undefined) return String(data);
  if (typeof data === 'string') return data.slice(0, maxLen);
  try {
    return JSON.stringify(data).slice(0, maxLen);
  } catch {
    return typeof data;
  }
}

/** Safe baseline when RPC fails, user row is missing, or payload cannot be parsed. */
export function emptyProfileStrengthCalc(): ProfileStrengthCalc {
  return {
    total: 0,
    band: 'LOW',
    activity: 0,
    links: 0,
    google: 0,
    likes: 0,
    completeness: 0,
    abn: 0,
    last_active_at: null,
    inactive_days: 0,
  };
}

/** Normalizes RPC result (single jsonb row or one-element array). Supports `*_points` aliases. */
export function parseProfileStrengthRpcResult(data: unknown): ProfileStrengthCalc | null {
  const raw = peelRpcJsonRoot(data);
  if (raw == null) return null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const total = Math.max(0, Math.min(100, Math.floor(raw)));
    return {
      ...emptyProfileStrengthCalc(),
      total,
      band: profileStrengthBandFromTotal(total),
    };
  }

  let row: unknown = raw;
  if (Array.isArray(row)) {
    if (row.length === 0) return null;
    row = row[0];
  }
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const o = row as Record<string, unknown>;

  // Postgres returns { error: 'user_not_found' } when `users` has no row — still map to zeroed categories.
  const activity = rpcNum(
    o.activity_points ?? o.activity_pts ?? o.activity ?? o.activity_score,
    0
  );
  const links = rpcNum(o.links_points ?? o.link_points ?? o.links, 0);
  const google = rpcNum(o.google_points ?? o.google_rating_points ?? o.google, 0);
  const likes = rpcNum(o.likes_points ?? o.likes, 0);
  const completeness = rpcNum(o.completeness_points ?? o.profile_completeness_points ?? o.completeness, 0);
  const abn = rpcNum(o.abn_points ?? o.abn_verification_points ?? o.abn, 0);

  const total = sumProfileStrengthCategoryPoints({
    activity,
    links,
    google,
    likes,
    completeness,
    abn,
  });
  const band = profileStrengthBandFromTotal(total);

  if (process.env.NODE_ENV === 'development') {
    const rpcTotal = Number(o.total ?? NaN);
    if (Number.isFinite(rpcTotal) && rpcTotal !== total) {
      console.warn('[profile-strength] RPC total field differs from category sum; using sum', {
        rpcTotal,
        derivedTotal: total,
      });
    }
    const rpcBand = o.band != null ? String(o.band) : null;
    if (rpcBand && rpcBand !== band) {
      console.warn('[profile-strength] RPC band differs from band derived from summed total; using derived', {
        rpcBand,
        derivedBand: band,
        total,
      });
    }
  }

  const inactiveDays = rpcNum(o.inactive_days, 0);

  return {
    total,
    band,
    activity,
    links,
    google,
    likes,
    completeness,
    abn,
    last_active_at: (o.last_active_at as string | null) ?? null,
    inactive_days: inactiveDays,
    activity_tier: (o.activity_tier as ProfileStrengthCalc['activity_tier']) ?? undefined,
    breakdown: (o.breakdown && typeof o.breakdown === 'object' ? (o.breakdown as Record<string, unknown>) : undefined) ?? undefined,
    activity_detail:
      (o.activity_detail && typeof o.activity_detail === 'object'
        ? (o.activity_detail as Record<string, unknown>)
        : undefined) ?? undefined,
  };
}

/**
 * Recompute denormalized counts + profile strength for a user.
 * Must use the service client — `refresh_profile_strength` is granted to service_role only.
 * (The cookie-based `createServerSupabase()` client cannot execute this RPC.)
 */
export async function refreshProfileStrength(userId: string) {
  const supabase = (await createServiceSupabase()) as any;

  const { error } = await supabase.rpc('refresh_profile_strength', {
    p_user_id: userId,
  });

  if (error) {
    console.error('refresh_profile_strength failed', {
      userId,
      error,
    });
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

/** Logs whether `public.users` has a row for `userId` (used when RPC fails or returns user_not_found). */
async function logUsersRowPresence(
  supabase: any,
  userId: string,
  context: string
): Promise<{ usersRowFound: boolean; userProbeError: string | null }> {
  const { data: userProbe, error: userProbeErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (process.env.NODE_ENV === 'development') {
    console.debug('[profile-strength] users probe', { requestedUserId: userId, context, usersRowFound: !!userProbe });
  }
  return {
    usersRowFound: !!userProbe,
    userProbeError: userProbeErr ? formatPostgrestError(userProbeErr) : null,
  };
}

/**
 * Loads breakdown via `calculate_profile_strength` (service role).
 * Never throws; returns `emptyProfileStrengthCalc()` on RPC/parse failure so the UI can still render.
 */
export async function fetchProfileStrengthCalc(userId: string): Promise<ProfileStrengthCalc> {
  const fallback = emptyProfileStrengthCalc();
  const logBase = { requestedUserId: userId, source: 'calculate_profile_strength' as const };

  try {
    const supabase = (await createServiceSupabase()) as any;

    const runRpc = () => supabase.rpc('calculate_profile_strength', { p_user_id: userId });

    let { data, error } = await runRpc();
    let repairedPublicUserRow = false;

    if (!error && rpcEnvelopeErrorCode(data) === 'user_not_found') {
      console.warn('[profile-strength] user_not_found from RPC; attempting public.users repair', {
        ...logBase,
        profileStrengthPath: 'user_not_found_pre_repair' as const,
        rawPreview: rpcPayloadPreview(data, 400),
      });
      const repair = await ensurePublicUserRowById(supabase, userId);
      if (!repair.ok) {
        console.error('[profile-strength] ensurePublicUserRowById failed after user_not_found', {
          ...logBase,
          cause: formatUnknownError(repair.cause),
        });
      } else {
        repairedPublicUserRow = true;
        ({ data, error } = await runRpc());
      }
    }

    if (error) {
      const probe = await logUsersRowPresence(supabase, userId, 'rpc_error');
      const path: ProfileStrengthFetchPath = 'rpc_error_fallback';
      console.error('[profile-strength] calculate_profile_strength RPC error', {
        ...logBase,
        ...probe,
        profileStrengthPath: path,
        rpcError: formatPostgrestError(error),
        rpcCode: (error as { code?: string })?.code,
        rawDataType: data === null || data === undefined ? String(data) : typeof data,
        rawPreview: rpcPayloadPreview(data, 400),
      });
      return fallback;
    }

    const envelopeErr = rpcEnvelopeErrorCode(data);

    const parsed = parseProfileStrengthRpcResult(data);
    if (!parsed) {
      const probe = await logUsersRowPresence(supabase, userId, 'parse_failed');
      const path: ProfileStrengthFetchPath = 'parse_fallback';
      console.error('[profile-strength] parseProfileStrengthRpcResult returned null', {
        ...logBase,
        ...probe,
        profileStrengthPath: path,
        peeledPreview: rpcPayloadPreview(peelRpcJsonRoot(data), 500),
      });
      return fallback;
    }

    const peeled = peelRpcJsonRoot(data);
    const topKeys =
      peeled && typeof peeled === 'object' && !Array.isArray(peeled)
        ? Object.keys(peeled as object).sort().join(',')
        : typeof peeled;

    const path: ProfileStrengthFetchPath =
      envelopeErr === 'user_not_found'
        ? 'user_not_found_fallback'
        : 'rpc_success';

    const usersProbe =
      path === 'user_not_found_fallback'
        ? await logUsersRowPresence(supabase, userId, 'user_not_found_summary')
        : null;

    const summary = {
      ...logBase,
      profileStrengthPath: path,
      repairedPublicUserRow,
      usersRowLikelyPresent: envelopeErr !== 'user_not_found',
      ...(usersProbe ?? {}),
      total: parsed.total,
      band: parsed.band,
      rpcEnvelopeError: envelopeErr,
      peeledTopKeys: topKeys,
    };
    if (path === 'user_not_found_fallback') {
      console.warn('[profile-strength] fetchProfileStrengthCalc', summary);
    } else if (process.env.NODE_ENV === 'development') {
      console.info('[profile-strength] fetchProfileStrengthCalc', summary);
    }

    return parsed;
  } catch (e) {
    console.error('[profile-strength] Unexpected error in fetchProfileStrengthCalc', {
      ...logBase,
      profileStrengthPath: 'unexpected_fallback' as ProfileStrengthFetchPath,
      details: formatUnknownError(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return fallback;
  }
}
