import { User } from './types';
import { hasBuilderPremium, hasContractorPremium, hasSubcontractorPremium } from './capability-utils';

export type SearchOriginSource = 'base' | 'searchFrom';

export interface EffectiveSearchOrigin {
  location: string | null;
  postcode: string | null;
  lat?: number | null;
  lng?: number | null;
  source: SearchOriginSource;
}

type UserLike = Record<string, unknown>;

/**
 * Returns true if the user's Premium tier allows using a custom search-from location.
 */
function canUseSearchFromLocation(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  return (
    hasBuilderPremium(user as User) ||
    hasContractorPremium(user as User) ||
    hasSubcontractorPremium(user as User)
  );
}

function hasSearchFromData(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  const u = user as Record<string, unknown>;
  const hasLocation = !!(u.searchLocation && String(u.searchLocation).trim());
  const hasPostcode = !!(u.searchPostcode && String(u.searchPostcode).trim());
  const lat = u.searchLat as number | null | undefined;
  const lng = u.searchLng as number | null | undefined;
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
    location: (user as any)?.location ?? null,
    postcode: (user as any)?.postcode ?? null,
    lat: (user as any)?.locationLat ?? (user as any)?.location_lat ?? null,
    lng: (user as any)?.locationLng ?? (user as any)?.location_lng ?? null,
    source: 'base',
  };

  if (!user) return base;

  if (canUseSearchFromLocation(user) && hasSearchFromData(user)) {
    const u = user as Record<string, unknown>;
    const loc = (u.searchLocation && String(u.searchLocation).trim()) || null;
    const pc = (u.searchPostcode && String(u.searchPostcode).trim()) || null;
    const lat =
      typeof u.searchLat === 'number' && !Number.isNaN(u.searchLat)
        ? u.searchLat
        : null;
    const lng =
      typeof u.searchLng === 'number' && !Number.isNaN(u.searchLng)
        ? u.searchLng
        : null;
    const hasUsable = !!(loc || pc || (lat != null && lng != null));
    if (hasUsable) {
      return { location: loc, postcode: pc, lat, lng, source: 'searchFrom' as const };
    }
  }

  return base;
}
