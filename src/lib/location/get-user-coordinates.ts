import { hasValidCoordinates } from '@/lib/coordinates';

export type UserCoordinateFields = {
  search_lat?: number | null;
  search_lng?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  /** Legacy column names used by some DBs / migrations */
  lat?: number | null;
  lng?: number | null;
};

function pairFrom(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } | null {
  const la = lat == null || lat === '' ? null : Number(lat);
  const ln = lng == null || lng === '' ? null : Number(lng);
  if (!hasValidCoordinates(la, ln)) return null;
  return { lat: la as number, lng: ln as number };
}

/** Primary business / profile coordinates: `location_lat`/`location_lng`, then legacy `lat`/`lng`. */
export function getPrimaryUserCoordinates(
  row: UserCoordinateFields | null | undefined
): { lat: number; lng: number } | null {
  if (!row) return null;
  return pairFrom(row.location_lat, row.location_lng) ?? pairFrom(row.lat, row.lng);
}

/**
 * Search-area coordinates when both are valid; otherwise primary coordinates.
 * Callers that must ignore search for non-premium users should use `getPrimaryUserCoordinates`.
 */
export function getUserCoordinates(
  row: UserCoordinateFields | null | undefined
): { lat: number; lng: number } | null {
  if (!row) return null;
  const search = pairFrom(row.search_lat, row.search_lng);
  if (search) return search;
  return getPrimaryUserCoordinates(row);
}
