export const PREVIOUS_WORK_CAPTION_MAX = 2000;
export const PREVIOUS_WORK_TITLE_MAX = 100;
export const PREVIOUS_WORK_LOCATION_MAX = 120;
export const PREVIOUS_WORK_MAX_IMAGES = 5;
export const PREVIOUS_WORK_MAX_BYTES_PER_IMAGE = 10 * 1024 * 1024; // matches bucket limit

/** Supabase Storage bucket id for Completed Works images (must match migrations). */
export const PREVIOUS_WORK_STORAGE_BUCKET = 'previous-work';

/** Loose UUID v1–v5 check for API params and storage key segments */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(s: string): boolean {
  return UUID_RE.test(String(s).trim());
}

/**
 * Validates `previous-work` object keys: `{ownerUserId}/{previousWorkId}/{filename}`.
 * Prevents path traversal and signing/removing objects outside the owner's namespace.
 */
export function isPreviousWorkStorageObjectKey(
  path: string,
  ownerUserId: string,
  previousWorkId?: string
): boolean {
  if (!path || typeof path !== 'string') return false;
  const p = path.trim();
  if (!p || p.includes('..') || p.includes('\\') || p.startsWith('/')) return false;
  const parts = p.split('/').filter(Boolean);
  if (parts.length !== 3) return false;
  const [uid, wid, file] = parts;
  if (uid !== ownerUserId || !isUuidString(uid)) return false;
  if (!isUuidString(wid)) return false;
  if (previousWorkId != null && wid !== previousWorkId) return false;
  if (!file || file.includes('/') || file.includes('..') || file.length > 200) return false;
  return true;
}

export const PREVIOUS_WORK_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export function extForImageMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/webp') return 'webp';
  return 'bin';
}

export function normalizePreviousWorkTitle(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return { ok: false, error: 'Please add a title.' };
  if (s.length > PREVIOUS_WORK_TITLE_MAX) {
    return { ok: false, error: `Title must be ${PREVIOUS_WORK_TITLE_MAX} characters or less.` };
  }
  return { ok: true, value: s };
}

export function normalizePreviousWorkCaption(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return { ok: false, error: 'Please add a short description for this project.' };
  if (s.length > PREVIOUS_WORK_CAPTION_MAX) {
    return { ok: false, error: `Description must be ${PREVIOUS_WORK_CAPTION_MAX} characters or less.` };
  }
  return { ok: true, value: s };
}

export function normalizePreviousWorkLocation(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw == null || raw === '') return { ok: true, value: null };
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return { ok: true, value: null };
  if (s.length > PREVIOUS_WORK_LOCATION_MAX) {
    return { ok: false, error: `Location must be ${PREVIOUS_WORK_LOCATION_MAX} characters or less.` };
  }
  return { ok: true, value: s };
}

export type PreviousWorkListItem = {
  id: string;
  title: string;
  caption: string;
  location: string | null;
  created_at: string;
  images: { id: string; sort_order: number; url: string }[];
};

/** Owner summary for completed-work detail API and pages */
export type PreviousWorkOwnerSummary = {
  id: string;
  displayName: string;
  primaryTrade: string | null;
  avatar: string | null;
};
