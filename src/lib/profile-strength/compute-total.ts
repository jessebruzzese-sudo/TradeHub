/** Max points for profile strength (matches Postgres calculate_profile_strength). */
export const PROFILE_STRENGTH_MAX = 100;

export type ProfileStrengthCategoryParts = {
  activity: number;
  links: number;
  google: number;
  likes: number;
  completeness: number;
  abn: number;
};

/** Total score = sum of visible category scores, clamped to 0–100 (same as SQL floor + LEAST). */
export function sumProfileStrengthCategoryPoints(parts: ProfileStrengthCategoryParts): number {
  const sum =
    Number(parts.activity) +
    Number(parts.links) +
    Number(parts.google) +
    Number(parts.likes) +
    Number(parts.completeness) +
    Number(parts.abn);
  if (!Number.isFinite(sum)) return 0;
  return Math.max(0, Math.min(PROFILE_STRENGTH_MAX, Math.floor(sum)));
}

/** Band thresholds — must stay aligned with public.calculate_profile_strength. */
export function profileStrengthBandFromTotal(total: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'ELITE' {
  const t = Math.floor(Number(total));
  if (!Number.isFinite(t)) return 'LOW';
  if (t >= 85) return 'ELITE';
  if (t >= 65) return 'HIGH';
  if (t >= 40) return 'MEDIUM';
  return 'LOW';
}
