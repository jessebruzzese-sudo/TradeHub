import type { ProfileStrengthCategoryParts } from '@/lib/profile-strength/compute-total';

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Same coalesce order as activity scoring (snake + camel). */
export function effectiveLastActiveIsoFromProfile(profile: Record<string, unknown>): string | null {
  const u = profile;
  const activityDate =
    str(u.last_active_at) ||
    str(u.lastActiveAt) ||
    str(u.last_seen_at) ||
    str(u.lastSeenAt) ||
    str(u.updated_at) ||
    str(u.updatedAt) ||
    str(u.created_at) ||
    str(u.createdAt) ||
    null;
  return activityDate;
}

function activityPointsFromProfileDate(profile: Record<string, unknown>): number {
  const u = profile;
  const activityDate =
    str(u.last_active_at) ||
    str(u.lastActiveAt) ||
    str(u.last_seen_at) ||
    str(u.lastSeenAt) ||
    str(u.updated_at) ||
    str(u.updatedAt) ||
    str(u.created_at) ||
    str(u.createdAt) ||
    null;

  if (process.env.NODE_ENV === 'development') {
    console.log('ACTIVITY DEBUG', {
      last_active_at: u.last_active_at ?? u.lastActiveAt,
      last_seen_at: u.last_seen_at ?? u.lastSeenAt,
      updated_at: u.updated_at ?? u.updatedAt,
      created_at: u.created_at ?? u.createdAt,
      chosen: activityDate,
    });
  }

  let activityPoints = 0;
  if (activityDate) {
    const t = new Date(activityDate).getTime();
    if (!Number.isFinite(t)) return 0;
    const daysSince = (Date.now() - t) / (1000 * 60 * 60 * 24);
    if (daysSince <= 1) activityPoints = 32;
    else if (daysSince <= 7) activityPoints = 24;
    else if (daysSince <= 30) activityPoints = 16;
    else if (daysSince <= 90) activityPoints = 8;
  }
  return activityPoints;
}

function abnPointsFromProfile(profile: Record<string, unknown>): number {
  const verifiedFlag =
    profile.abn_verified === true ||
    profile.abnVerified === true ||
    profile.is_abn_verified === true ||
    profile.isAbnVerified === true;
  const status = str(profile.abn_status ?? profile.abnStatus).toUpperCase();
  if (verifiedFlag || status === 'VERIFIED') return 10;
  return 0;
}

function likesPointsFromCount(likesN: number): number {
  const n = Math.max(0, likesN);
  return Math.min(10, 10 * (1 - 1 / (1 + n / 16.0)));
}

/**
 * Client-side mirror of `public.calculate_profile_strength` category points.
 * Used when RPC breakdown is unavailable (`strengthCalc == null`).
 */
export function computeProfileStrengthCategoriesFromProfile(
  profile: Record<string, unknown>
): ProfileStrengthCategoryParts {
  const activity = activityPointsFromProfileDate(profile);

  const w = str(profile.website_url ?? profile.website ?? profile.websiteUrl);
  const i = str(profile.instagram_url ?? profile.instagram ?? profile.instagramUrl);
  const f = str(profile.facebook_url ?? profile.facebook ?? profile.facebookUrl);
  const l = str(profile.linkedin_url ?? profile.linkedin ?? profile.linkedinUrl);

  let linkPts = 0;
  if (w) linkPts += 6;
  if (i) linkPts += 3;
  if (f) linkPts += 2;
  if (l) linkPts += 2;
  const linkCount = [w, i, f, l].filter(Boolean).length;
  if (linkCount >= 2) linkPts += 2;
  const links = Math.min(15, Math.floor(linkPts));

  const g = str(profile.google_business_url ?? profile.googleBusinessUrl);
  const googleStatus = str(profile.google_listing_verification_status ?? profile.googleListingVerificationStatus).toUpperCase();
  const googleRatingValue = num(
    profile.google_business_rating ?? profile.google_rating ?? profile.googleRating ?? profile.googleBusinessRating,
    NaN
  );
  const googleReviewCountValue = num(
    profile.google_business_review_count ??
      profile.google_review_count ??
      profile.googleReviewCount ??
      profile.googleBusinessReviewCount,
    NaN
  );

  let googlePts = 0;
  if (g) {
    googlePts += 4;
    if (Number.isFinite(googleRatingValue) && Number.isFinite(googleReviewCountValue)) {
      googlePts += 4;
    }
    if (googleStatus === 'SELF_CONFIRMED') {
      googlePts += 3;
    } else if (googleStatus === 'VERIFIED') {
      googlePts += 8;
      const abnOk =
        profile.abn_verified === true ||
        profile.abnVerified === true ||
        str(profile.abn_status ?? profile.abnStatus).toUpperCase() === 'VERIFIED';
      if (abnOk && googleRatingValue >= 4.5 && googleReviewCountValue >= 10) {
        googlePts += 1;
      }
    }
    googlePts = Math.min(20, googlePts);
  }

  const likesN = num(profile.profile_likes_count ?? profile.profileLikesCount ?? profile.likes_count, 0);
  const likes = Math.floor(likesPointsFromCount(likesN));

  let comp = 0;
  const avatar = str(profile.avatar);
  if (avatar) comp += 2;
  const bio = str(profile.bio);
  if (bio.length >= 40) comp += 3;
  const trades = profile.trades;
  const primaryTrade = str(
    profile.primary_trade ??
      profile.primaryTrade ??
      (Array.isArray(trades) && trades.length ? trades[0] : '')
  );
  if (primaryTrade) comp += 2;
  const location = str(profile.location);
  if (location) comp += 2;
  const pricingType = str(profile.pricing_type ?? profile.pricingType);
  if (pricingType.length > 0) comp += 2;
  const miniBio = str(profile.mini_bio ?? profile.miniBio);
  if (miniBio.length >= 20) comp += 2;
  const completeness = Math.min(13, comp);

  const abn = abnPointsFromProfile(profile);

  return { activity, links, google: googlePts, likes, completeness, abn };
}
