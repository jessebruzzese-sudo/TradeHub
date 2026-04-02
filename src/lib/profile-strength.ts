import { createServiceSupabase } from '@/lib/supabase/server';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import {
  profileStrengthBandFromTotal,
  sumProfileStrengthCategoryPoints,
} from '@/lib/profile-strength/compute-total';

export type { ProfileStrengthCalc };

/** Normalizes RPC result (single jsonb row or one-element array). Supports `*_points` aliases. */
export function parseProfileStrengthRpcResult(data: unknown): ProfileStrengthCalc | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  if (o.error) return null;
  const activity = Number(o.activity_points ?? o.activity ?? 0);
  const links = Number(o.links_points ?? o.links ?? 0);
  const google = Number(o.google_points ?? o.google ?? 0);
  const likes = Number(o.likes_points ?? o.likes ?? 0);
  const completeness = Number(o.completeness_points ?? o.completeness ?? 0);
  const abn = Number(o.abn_points ?? o.abn ?? 0);

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
    inactive_days: Number(o.inactive_days ?? 0),
    activity_tier: (o.activity_tier as ProfileStrengthCalc['activity_tier']) ?? undefined,
    breakdown: (o.breakdown as Record<string, unknown>) ?? undefined,
    activity_detail: (o.activity_detail as Record<string, unknown>) ?? undefined,
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

export async function fetchProfileStrengthCalc(userId: string): Promise<ProfileStrengthCalc | null> {
  try {
    const supabase = (await createServiceSupabase()) as any;
    const { data, error } = await supabase.rpc('calculate_profile_strength', { p_user_id: userId });
    if (error) return null;
    return parseProfileStrengthRpcResult(data);
  } catch {
    return null;
  }
}
