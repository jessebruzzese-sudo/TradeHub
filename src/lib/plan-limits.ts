/**
 * Central plan limits: Free vs Premium.
 * Used for server-side enforcement of radius, availability, tenders, and quotes.
 */

export type PlanTier = 'free' | 'premium';

export type PlanUser = {
  is_premium?: boolean | null;
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
  subscription_tier?: string | null;
  active_plan?: string | null;
  activePlan?: string | null;
  subcontractor_plan?: string | null;
  subcontractorPlan?: string | null;
  premium_until?: string | Date | null;
  premiumUntil?: string | Date | null;
  complimentary_premium_until?: string | Date | null;
  complimentaryPremiumUntil?: string | Date | null;
};

type TierUser = PlanUser & {
  id?: string;
  subcontractor_sub_status?: string | null;
  subcontractorSubStatus?: string | null;
};

function isFutureDate(d: unknown): boolean {
  if (!d) return false;
  const dt = d instanceof Date ? d : new Date(d as string);
  return !Number.isNaN(dt.getTime()) && dt.getTime() > Date.now();
}

export type PlanLimits = {
  /** Discovery/search radius cap (used for jobs + tenders discovery) */
  discoveryRadiusKm: number;
  /** Back-compat alias (some older callers may still use radiusKm) */
  radiusKm: number;
  availabilityDays: number;
  tenderPerMonth: number | 'unlimited';
  quotesPerTender: number | 'unlimited';
};

const FREE_LIMITS: PlanLimits = {
  discoveryRadiusKm: 20,
  radiusKm: 20,
  availabilityDays: 30,
  tenderPerMonth: 1,
  quotesPerTender: 3,
};

const PREMIUM_LIMITS: PlanLimits = {
  discoveryRadiusKm: 100,
  radiusKm: 100,
  availabilityDays: 90,
  tenderPerMonth: 'unlimited',
  quotesPerTender: 'unlimited',
};

function isPremium(user: TierUser | null | undefined): boolean {
  if (!user) return false;

  // Strong explicit flag
  if (user.is_premium === true) return true;

  // Complimentary premium (admin grant)
  if (
    isFutureDate(user.complimentary_premium_until) ||
    isFutureDate(user.complimentaryPremiumUntil)
  ) {
    return true;
  }

  // Time-boxed premium
  if (isFutureDate(user.premium_until) || isFutureDate(user.premiumUntil)) {
    return true;
  }

  const tier = (user.subscription_tier ?? '').toString().toLowerCase();
  if (tier === 'premium') return true;

  const status = (user.subscription_status ?? user.subscriptionStatus ?? '').toString().toLowerCase();
  const plan = (user.active_plan ?? user.activePlan ?? '').toString().toLowerCase();
  const subPlan = (user.subcontractor_plan ?? user.subcontractorPlan ?? '').toString().toLowerCase();

  // Strict: only treat as premium when ACTIVE and plan indicates premium/pro
  if (status === 'active') {
    if (['pro', 'premium'].includes(plan)) return true;
    if (['pro', 'premium'].includes(subPlan)) return true;
  }

  return false;
}

/** Determine tier from database-backed user. Never accept tier from request body. */
export function getTier(user: TierUser | null | undefined): PlanTier {
  if (!user) return 'free';
  return isPremium(user) ? 'premium' : 'free';
}

/** Get limits for a tier. */
export function getLimits(tier: PlanTier): PlanLimits {
  return tier === 'premium' ? { ...PREMIUM_LIMITS } : { ...FREE_LIMITS };
}
