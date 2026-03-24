import { createServiceSupabase } from '@/lib/supabase-server';
import {
  normalizeGoogleListingVerificationStatus,
  type GoogleListingVerificationStatus,
} from '@/lib/google-business';

type UpdateGoogleListingVerificationStatusInput = {
  userId: string;
  status: GoogleListingVerificationStatus;
  verificationMethod?: 'SELF_CONFIRMED' | 'ADMIN_REVIEW' | 'GOOGLE_MATCH' | 'GOOGLE_API' | 'DOCUMENT_REVIEW' | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
};

export async function updateGoogleListingVerificationStatus({
  userId,
  status,
  verificationMethod,
  verifiedBy,
  rejectionReason,
}: UpdateGoogleListingVerificationStatusInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedStatus = normalizeGoogleListingVerificationStatus(status);
  if (!userId) return { ok: false, error: 'Missing userId' };
  if (normalizedStatus === 'SELF_CONFIRMED' || normalizedStatus === 'UNVERIFIED') {
    return { ok: false, error: 'Use user-safe profile update flow for this status' };
  }

  const supabase = createServiceSupabase() as any;
  const patch: Record<string, unknown> = {
    google_listing_verification_status: normalizedStatus,
    google_listing_verification_method: verificationMethod ?? 'ADMIN_REVIEW',
  };

  if (normalizedStatus === 'VERIFIED') {
    patch.google_listing_verified_at = new Date().toISOString();
    patch.google_listing_verified_by = verifiedBy ?? null;
    patch.google_listing_rejection_reason = null;
    patch.google_listing_claimed_by_user = true;
  } else if (normalizedStatus === 'REJECTED') {
    patch.google_listing_verified_at = null;
    patch.google_listing_verified_by = verifiedBy ?? null;
    patch.google_listing_rejection_reason = rejectionReason?.trim() || null;
  } else {
    patch.google_listing_verified_at = null;
    patch.google_listing_verified_by = null;
  }

  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) return { ok: false, error: error.message || 'Failed to update verification status' };
  return { ok: true };
}
