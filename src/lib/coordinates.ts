/**
 * Coordinate validity helpers for job discovery.
 * Used in job flows, discovery RPC, and tests.
 *
 * Valid coordinates:
 * - lat and lng must both be finite numbers
 * - not null
 * - not 0 (0/0 is invalid - typically a placeholder)
 * - within real coordinate ranges (lat -90..90, lng -180..180)
 */

/** Australia lat range (approximate): -44 to -10 */
const MIN_LAT_AU = -45;
const MAX_LAT_AU = -9;
/** Australia lng range (approximate): 113 to 154 */
const MIN_LNG_AU = 110;
const MAX_LNG_AU = 156;

export function hasValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat == null || lng == null) return false;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la === 0 && ln === 0) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  return true;
}

/**
 * Strict Australia-only check (optional, for discovery in AU).
 * Use when you want to reject obviously wrong AU coordinates.
 */
export function hasValidCoordinatesAU(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (!hasValidCoordinates(lat, lng)) return false;
  const la = Number(lat);
  const ln = Number(lng);
  return la >= MIN_LAT_AU && la <= MAX_LAT_AU && ln >= MIN_LNG_AU && ln <= MAX_LNG_AU;
}

/**
 * Normalize coords for DB: return null if invalid, else { lat, lng }.
 */
export function normalizeCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): { lat: number; lng: number } | null {
  if (!hasValidCoordinates(lat, lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}
