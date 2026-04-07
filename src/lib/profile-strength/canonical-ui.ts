import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import { computeProfileStrengthCategoriesFromProfile } from '@/lib/profile-strength/client-fallback-compute';
import {
  normalizeProfileStrengthBand,
  type ProfileStrengthBand,
  type ProfileStrengthBreakdown,
} from '@/lib/profile-strength-ui';
import {
  profileStrengthBandFromTotal,
  sumProfileStrengthCategoryPoints,
  type ProfileStrengthCategoryParts,
} from '@/lib/profile-strength/compute-total';

function levelFromBandUi(band: ProfileStrengthBand): 'low' | 'medium' | 'high' {
  if (band === 'STRONG') return 'high';
  if (band === 'MEDIUM') return 'medium';
  return 'low';
}

/**
 * Canonical profile strength for UI: one total + breakdown + band, all from the same category points.
 * When `strengthCalc` is present, categories come from the live RPC; otherwise a lightweight client fallback.
 */
export type ProfileStrengthCanonicalBreakdown = {
  activity: number;
  links: number;
  googleRating: number;
  likes: number;
  completeness: number;
  abnVerification: number;
};

export type ProfileStrengthCanonical = {
  total: number;
  level: 'low' | 'medium' | 'high';
  breakdown: ProfileStrengthCanonicalBreakdown;
  bandRaw: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELITE';
  bandUi: ProfileStrengthBand;
  /** Shape used by ProfileStrengthSection / legacy meters */
  legacyBreakdown: ProfileStrengthBreakdown;
};

export function buildProfileStrengthCanonical(opts: {
  strengthCalc: ProfileStrengthCalc | null;
  profile: Record<string, unknown>;
}): ProfileStrengthCanonical {
  const { strengthCalc, profile } = opts;

  let activity_points: number;
  let links_points: number;
  let google_points: number;
  let likes_points: number;
  let completeness_points: number;
  let abn_points: number;

  if (strengthCalc != null) {
    activity_points = Number(strengthCalc.activity ?? 0);
    links_points = Number(strengthCalc.links ?? 0);
    google_points = Number(strengthCalc.google ?? 0);
    likes_points = Number(strengthCalc.likes ?? 0);
    completeness_points = Number(strengthCalc.completeness ?? 0);
    abn_points = Number(strengthCalc.abn ?? 0);
  } else {
    const parts = computeProfileStrengthCategoriesFromProfile(profile);
    activity_points = parts.activity;
    links_points = parts.links;
    google_points = parts.google;
    likes_points = parts.likes;
    completeness_points = parts.completeness;
    abn_points = parts.abn;
  }

  const parts: ProfileStrengthCategoryParts = {
    activity: activity_points,
    links: links_points,
    google: google_points,
    likes: likes_points,
    completeness: completeness_points,
    abn: abn_points,
  };

  const total = sumProfileStrengthCategoryPoints(parts);
  const bandRaw = profileStrengthBandFromTotal(total);
  const bandUi = normalizeProfileStrengthBand(bandRaw);

  if (process.env.NODE_ENV === 'development' && strengthCalc != null) {
    const rpcT = strengthCalc.total;
    if (typeof rpcT === 'number' && Number.isFinite(rpcT) && Math.abs(rpcT - total) > 0) {
      console.warn('[profile-strength] strengthCalc.total differs from category sum; UI uses sum', {
        rpcTotal: rpcT,
        derivedTotal: total,
        parts,
      });
    }
  }

  return {
    total,
    level: levelFromBandUi(bandUi),
    breakdown: {
      activity: activity_points,
      links: links_points,
      googleRating: google_points,
      likes: likes_points,
      completeness: completeness_points,
      abnVerification: abn_points,
    },
    bandRaw,
    bandUi,
    legacyBreakdown: {
      score: total,
      band: bandUi,
      activity_points,
      links_points,
      google_points,
      likes_points,
      completeness_points,
      abn_points,
    },
  };
}
