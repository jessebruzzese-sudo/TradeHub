import { canUseSearchFromLocation } from '@/lib/permissions';

export type SearchOriginSource = 'base' | 'searchFrom';

export interface EffectiveSearchOrigin {
  location: string | null;
  postcode: string | null;
  lat?: number | null;
  lng?: number | null;
  source: SearchOriginSource;
}

type UserLike = {
  id?: string;
  // base location
  location?: string | null;
  postcode?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  // search-from fields
  searchLocation?: string | null;
  searchPostcode?: string | null;
  searchLat?: number | null;
  searchLng?: number | null;
} & Record<string, unknown>;

function hasSearchFromData(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  const hasLocation = !!(user.searchLocation && String(user.searchLocation).trim());
  const hasPostcode = !!(user.searchPostcode && String(user.searchPostcode).trim());
  const lat = user.searchLat;
  const lng = user.searchLng;
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);
  return hasLocation || hasPostcode || hasCoords;
}

/**
 * Returns the effective search origin for jobs/tenders matching and radius calculations.
 * - Premium users with search-from set: use searchLocation/searchPostcode/searchLat/searchLng.
 * - Everyone else: use base location/postcode/locationLat/locationLng.
 * Never overwrites base with search-from. Non-premium users always get base, even if search-from fields exist.
 */
export function getEffectiveSearchOrigin(
  user: UserLike | null | undefined
): EffectiveSearchOrigin {
  const base: EffectiveSearchOrigin = {
    location: user?.location ?? null,
    postcode: user?.postcode ?? null,
    lat: user?.locationLat ?? user?.location_lat ?? null,
    lng: user?.locationLng ?? user?.location_lng ?? null,
    source: 'base',
  };

  if (!user) return base;

  if (canUseSearchFromLocation(user) && hasSearchFromData(user)) {
    const loc = (user.searchLocation && String(user.searchLocation).trim()) || null;
    const pc = (user.searchPostcode && String(user.searchPostcode).trim()) || null;
    const lat =
      typeof user.searchLat === 'number' && !Number.isNaN(user.searchLat)
        ? user.searchLat
        : null;
    const lng =
      typeof user.searchLng === 'number' && !Number.isNaN(user.searchLng)
        ? user.searchLng
        : null;
    const hasUsable = !!(loc || pc || (lat != null && lng != null));
    if (hasUsable) {
      return { location: loc, postcode: pc, lat, lng, source: 'searchFrom' as const };
    }
  }

  return base;
}
