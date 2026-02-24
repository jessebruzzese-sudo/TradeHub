/**
 * Discovery helpers (viewer center, bounding-box prefilter).
 * Premium/limits must come from plan-limits to avoid drift.
 */

import { getTier, getLimits, type PlanUser } from './plan-limits';

// Hard cap constants (defensive — real values still come from plan-limits)
const ABS_MAX_FREE_RADIUS_KM = 20;
const ABS_MAX_PREMIUM_RADIUS_KM = 100;

export type DbUserRow = {
  id: string;
  role?: string | null;
  is_premium?: boolean | null;
  subscription_status?: string | null;
  active_plan?: string | null;
  subcontractor_plan?: string | null;
  subcontractor_sub_status?: string | null;
  premium_until?: string | null;
  complimentary_premium_until?: string | null;
};

type PremiumUser = DbUserRow;

type ViewerCenterUser = PremiumUser & {
  search_lat?: number | null;
  search_lng?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

/** Premium detection for ranking candidates (not eligibility). */
export function isPremiumCandidate(row: unknown): boolean {
  return getTier(row as DbUserRow) === 'premium';
}

export function isPremiumRow(r: DbUserRow): boolean {
  return getTier(r) === 'premium';
}

/** Strict premium detection for discovery: defer to plan-limits tier. */
export function isPremiumForDiscovery(currentUser: PlanUser | null | undefined): boolean {
  return getTier(currentUser) === 'premium';
}

/** Viewer center: premium uses search_from if set; free never uses search_from; clean fallbacks. */
export function getViewerCenter(currentUser: ViewerCenterUser | null | undefined): {
  lat: number;
  lng: number;
} | null {
  if (!currentUser) return null;

  const isPremium = isPremiumForDiscovery(currentUser);

  if (isPremium) {
    const slat = currentUser.search_lat;
    const slng = currentUser.search_lng;
    if (slat != null && slng != null && !Number.isNaN(slat) && !Number.isNaN(slng)) {
      return { lat: Number(slat), lng: clampLng(Number(slng)) };
    }
  }

  const llat = currentUser.location_lat;
  const llng = currentUser.location_lng;
  if (llat != null && llng != null && !Number.isNaN(llat) && !Number.isNaN(llng)) {
    return { lat: Number(llat), lng: clampLng(Number(llng)) };
  }

  const blat = currentUser.base_lat;
  const blng = currentUser.base_lng;
  if (blat != null && blng != null && !Number.isNaN(blat) && !Number.isNaN(blng)) {
    return { lat: Number(blat), lng: clampLng(Number(blng)) };
  }

  return null;
}

export function clampLng(deg: number): number {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Bounding box for radius prefilter (lat/lng in degrees, radius in km). */
export function bboxForRadiusKm(
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 110.574;
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const lngDelta =
    cosLat > 0.0001 ? radiusKm / (111.32 * cosLat) : radiusKm / 111.32;
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: clampLng(lng - lngDelta),
    maxLng: clampLng(lng + lngDelta),
  };
}

/**
 * Discovery radius enforced server-side (used by API routes).
 * - Free: up to 20km
 * - Premium: up to 100km
 * Always clamps to plan limits and absolute safety caps.
 */
export function getDiscoveryRadiusKm(
  user: PlanUser | DbUserRow | null | undefined,
  requestedRadiusKm?: number | null
): number {
  const tier = getTier(user ?? {});
  const limits = getLimits(tier);

  const planRadius = limits.discoveryRadiusKm ?? limits.radiusKm;
  const raw =
    typeof requestedRadiusKm === 'number' && Number.isFinite(requestedRadiusKm)
      ? requestedRadiusKm
      : planRadius;

  const planCap = planRadius;
  const absCap = tier === 'premium' ? ABS_MAX_PREMIUM_RADIUS_KM : ABS_MAX_FREE_RADIUS_KM;

  const clamped = Math.max(1, Math.min(raw, planCap, absCap));
  return clamped;
}

/** Haversine distance in km (pure JS). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Returns a rounded display string like "1.2k+", "98+", "17". */
export function roundCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k >= 10 ? `${Math.floor(k)}+` : `${k.toFixed(1)}k+`;
  }
  return `${n}+`;
}
