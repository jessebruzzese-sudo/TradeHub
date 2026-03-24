export type GoogleListingVerificationStatus =
  | 'UNVERIFIED'
  | 'SELF_CONFIRMED'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export type GoogleBusinessBadgeTier = 'none' | 'grey' | 'blue' | 'gold';

type GoogleBusinessLike = {
  google_business_url?: string | null;
  google_place_id?: string | null;
  google_business_name?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_listing_verification_status?: string | null;
  google_listing_claimed_by_user?: boolean | null;
};

export function normalizeGoogleListingVerificationStatus(
  status: unknown
): GoogleListingVerificationStatus {
  const value = String(status || '').trim().toUpperCase();
  if (
    value === 'UNVERIFIED' ||
    value === 'SELF_CONFIRMED' ||
    value === 'PENDING_REVIEW' ||
    value === 'VERIFIED' ||
    value === 'REJECTED'
  ) {
    return value;
  }
  return 'UNVERIFIED';
}

export function getGoogleBusinessBadgeTier(user: GoogleBusinessLike): GoogleBusinessBadgeTier {
  const status = normalizeGoogleListingVerificationStatus(user.google_listing_verification_status);
  if (status === 'SELF_CONFIRMED') return 'grey';
  if (status !== 'VERIFIED') return 'none';
  const rating = typeof user.google_rating === 'number' ? user.google_rating : Number(user.google_rating);
  const reviews =
    typeof user.google_review_count === 'number' ? user.google_review_count : Number(user.google_review_count);
  const abnVerified =
    (user as any)?.abn_verified === true ||
    (user as any)?.abnVerified === true ||
    String((user as any)?.abn_status || (user as any)?.abnStatus || '')
      .trim()
      .toUpperCase() === 'VERIFIED';
  if (abnVerified && Number.isFinite(rating) && rating >= 4.5 && Number.isFinite(reviews) && reviews >= 10) {
    return 'gold';
  }
  return 'blue';
}

export function getGoogleBusinessBadgeLabel(user: GoogleBusinessLike): string | null {
  const tier = getGoogleBusinessBadgeTier(user);
  if (tier === 'grey') return 'Self-confirmed';
  if (tier === 'blue') return 'Verified by TradeHub';
  if (tier === 'gold') return 'Highly trusted';
  return null;
}

export function getGoogleBusinessStatusLabel(user: GoogleBusinessLike): string {
  const status = normalizeGoogleListingVerificationStatus(user.google_listing_verification_status);
  if (status === 'SELF_CONFIRMED') return 'Self-confirmed';
  if (status === 'PENDING_REVIEW') return 'Pending TradeHub review';
  if (status === 'VERIFIED') return 'Verified by TradeHub';
  if (status === 'REJECTED') return 'Verification rejected';
  return 'No verification yet';
}

export function shouldResetGoogleVerification(
  previous: GoogleBusinessLike,
  next: GoogleBusinessLike
): boolean {
  const previousStatus = normalizeGoogleListingVerificationStatus(previous.google_listing_verification_status);
  if (previousStatus !== 'VERIFIED') return false;
  const prevUrl = String(previous.google_business_url || '').trim();
  const nextUrl = String(next.google_business_url || '').trim();
  const prevPlaceId = String(previous.google_place_id || '').trim();
  const nextPlaceId = String(next.google_place_id || '').trim();
  const prevName = String(previous.google_business_name || '').trim();
  const nextName = String(next.google_business_name || '').trim();
  return prevUrl !== nextUrl || prevPlaceId !== nextPlaceId || prevName !== nextName;
}

export function getUserClaimToggleNextStatus(
  currentStatus: GoogleListingVerificationStatus,
  claimedByUser: boolean
): GoogleListingVerificationStatus {
  if (claimedByUser) {
    if (currentStatus === 'UNVERIFIED' || currentStatus === 'REJECTED') return 'SELF_CONFIRMED';
    return currentStatus;
  }
  if (currentStatus === 'VERIFIED') return 'VERIFIED';
  return 'UNVERIFIED';
}

export function getGoogleVerificationScoreContribution(user: GoogleBusinessLike): number {
  const hasUrl = !!String(user.google_business_url || '').trim();
  if (!hasUrl) return 0;
  const hasRating = Number.isFinite(Number(user.google_rating));
  const hasReviewCount = Number.isFinite(Number(user.google_review_count));
  const status = normalizeGoogleListingVerificationStatus(user.google_listing_verification_status);
  let score = 4;
  if (hasRating && hasReviewCount) score += 4;
  if (status === 'SELF_CONFIRMED') score += 3;
  if (status === 'VERIFIED') score += 8;
  if (getGoogleBusinessBadgeTier(user) === 'gold') score += 1;
  return score;
}
