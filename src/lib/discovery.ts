/**
 * Discovery helpers: radius, haversine distance, count formatting,
 * premium detection, viewer center, and bounding-box prefilter.
 */

type PremiumUser = {
  is_premium?: boolean | null;
  subscription_status?: string | null;
  subcontractor_sub_status?: string | null;
  active_plan?: string | null;
  subcontractor_plan?: string | null;
};

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
  const r = row as Record<string, unknown> | null | undefined;
  if (!r) return false;
  const status = (r.subscription_status ?? '').toString().toLowerCase();
  const subStatus = (r.subcontractor_sub_status ?? '').toString().toLowerCase();
  const activePlan = (r.active_plan ?? '').toString().toLowerCase();
  const subPlan = (r.subcontractor_plan ?? '').toString().toLowerCase();

  return (
    r.is_premium === true ||
    status === 'active' ||
    status === 'trialing' ||
    subStatus === 'active' ||
    subStatus === 'trialing' ||
    activePlan === 'pro' ||
    activePlan === 'premium' ||
    subPlan === 'pro' ||
    subPlan === 'premium'
  );
}

/** Strict premium detection to avoid accidental 50km radius. */
export function isPremiumForDiscovery(
  currentUser: PremiumUser | null | undefined
): boolean {
  if (!currentUser) return false;

  const status = (currentUser.subscription_status ?? '').toLowerCase();
  const subStatus = (currentUser.subcontractor_sub_status ?? '').toLowerCase();
  const plan = (currentUser.active_plan ?? '').toLowerCase();
  const subPlan = (currentUser.subcontractor_plan ?? '').toLowerCase();

  return (
    currentUser.is_premium === true ||
    ['active', 'trialing'].includes(status) ||
    ['active', 'trialing'].includes(subStatus) ||
    ['pro', 'premium'].includes(plan) ||
    ['pro', 'premium'].includes(subPlan)
  );
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

import { getTier, getLimits } from './plan-limits';

/** Discovery radius: free = 20km, premium = 100km. Uses plan-limits. */
export function getDiscoveryRadiusKm(
  currentUser: PremiumUser | null | undefined
): number {
  return getLimits(getTier(currentUser)).radiusKm;
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
