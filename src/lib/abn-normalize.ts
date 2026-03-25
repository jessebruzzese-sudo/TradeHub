/**
 * Canonical ABN storage: digits only, or null when empty / non-digits.
 */
export function normalizeAbnForDb(input: string | null | undefined): string | null {
  if (input == null) return null;
  const digits = String(input).replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * True only when auth user_metadata records an ABR-backed verification from our app
 * (signup after "Verify ABN" or explicit flags). Does not treat abn_status strings in metadata as proof.
 */
export function userMetadataIndicatesAbrVerified(meta: Record<string, unknown>): boolean {
  if (meta.abn_abr_verified === true) return true;
  if (meta.abnVerified === true) return true;
  if (meta.abn_verified === true) return true;
  return false;
}

/** ISO timestamp from metadata when present and parseable; otherwise null. */
export function abrVerifiedAtFromUserMetadata(meta: Record<string, unknown>): string | null {
  const raw = meta.abn_verified_at ?? meta.abnVerifiedAt;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
