import { createServiceSupabase } from '@/lib/supabase/server';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';

export type { ProfileStrengthCalc };

/** Normalizes RPC result (single jsonb row or one-element array). Supports `*_points` aliases. */
export function parseProfileStrengthRpcResult(data: unknown): ProfileStrengthCalc | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  if (o.error) return null;
  return {
    total: Number(o.total ?? 0),
    band: String(o.band ?? 'LOW'),
    activity: Number(o.activity_points ?? o.activity ?? 0),
    links: Number(o.links_points ?? o.links ?? 0),
    google: Number(o.google_points ?? o.google ?? 0),
    likes: Number(o.likes_points ?? o.likes ?? 0),
    completeness: Number(o.completeness_points ?? o.completeness ?? 0),
    abn: Number(o.abn_points ?? o.abn ?? 0),
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
