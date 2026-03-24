import { createServiceSupabase } from '@/lib/supabase-server';
import { isPreviousWorkStorageObjectKey, PREVIOUS_WORK_STORAGE_BUCKET } from '@/lib/previous-work';

/** Same TTL pattern as job attachment signed URLs in the app */
export const PREVIOUS_WORK_SIGNED_URL_TTL_SEC = 60 * 60;

export async function canViewPreviousWorkPortfolio(targetUserId: string, viewerId: string | null) {
  const admin = createServiceSupabase();
  const { data: row, error } = await admin
    .from('users')
    .select('is_public_profile')
    .eq('id', targetUserId)
    .maybeSingle();

  if (error || !row) return { ok: false as const, status: 404 as const, message: 'Profile not found.' };
  if (row.is_public_profile === true || viewerId === targetUserId) {
    return { ok: true as const };
  }
  return { ok: false as const, status: 403 as const, message: 'This portfolio is not visible.' };
}

export async function signPreviousWorkImageUrls(
  paths: string[],
  ownerUserId: string
): Promise<Map<string, string>> {
  const admin = createServiceSupabase();
  const map = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      if (!isPreviousWorkStorageObjectKey(path, ownerUserId)) {
        console.warn('[previous-work] skip signing invalid path', path?.slice(0, 80));
        return;
      }
      const { data, error } = await admin.storage
        .from(PREVIOUS_WORK_STORAGE_BUCKET)
        .createSignedUrl(path, PREVIOUS_WORK_SIGNED_URL_TTL_SEC);
      if (!error && data?.signedUrl) map.set(path, data.signedUrl);
    })
  );
  return map;
}

export function displayNameForPreviousWorkOwner(row: {
  name: string | null;
  business_name: string | null;
  show_business_name_on_profile: boolean | null;
}): string {
  if (row.show_business_name_on_profile && row.business_name?.trim()) {
    return row.business_name.trim();
  }
  return row.name?.trim() || 'TradeHub member';
}
