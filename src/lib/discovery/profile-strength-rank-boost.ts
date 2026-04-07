/**
 * Small additive boost for ordering directory/discovery results by persisted profile strength.
 * Does not filter or hide rows — higher strength only improves relative rank among peers.
 *
 * Uses `users.profile_strength_score` (0–100), maintained by `refresh_profile_strength`.
 * Missing or invalid values contribute 0 boost.
 */
export const PROFILE_STRENGTH_RANK_WEIGHT = 2.5;

export function profileStrengthNormalized01(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n)) / 100;
}

/** Additive contribution to a sort key (higher = better rank when used as descending tie-break). */
export function profileStrengthRankBoost(raw: unknown): number {
  return profileStrengthNormalized01(raw) * PROFILE_STRENGTH_RANK_WEIGHT;
}
