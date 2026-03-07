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

/** Normalise plan string for comparison. Returns empty string for null/undefined. */
function normalisePlanString(plan?: string | null): string {
  if (plan == null) return '';
  return String(plan).trim().toLowerCase();
}

/**
 * Returns true if the plan string indicates premium/pro entitlement.
 * Handles: pro, premium, SUBCONTRACTOR_PRO_10, ALL_ACCESS_PRO_26, PRO_10, etc.
 * Avoids false positives like "approve", "improve" (requires _pro, pro_, or exact match).
 */
export function isPremiumPlanValue(plan?: string | null): boolean {
  const p = normalisePlanString(plan);
  if (!p) return false;
  // Exact premium names
  if (p === 'pro' || p === 'premium') return true;
  // Premium-like names: _pro, pro_, or premium anywhere (avoids approve/improve)
  if (p.includes('_pro') || p.includes('pro_') || p.includes('premium')) return true;
  return false;
}

export type PlanLimits = {
  /** Discovery/search radius cap (used for jobs + tenders discovery) */
  discoveryRadiusKm: number;
  /** Back-compat alias (some older callers may still use radiusKm) */
  radiusKm: number;
  availabilityDays: number;
  tenderPerMonth: number | 'unlimited';
  quotesPerTender: number | 'unlimited';
  /** Total quotes per month across all tenders (Free plan cap) */
  quotesPerMonth?: number | 'unlimited';
};

const FREE_LIMITS: PlanLimits = {
  discoveryRadiusKm: 20,
  radiusKm: 20,
  availabilityDays: 30,
  tenderPerMonth: 1,
  quotesPerTender: 3,
  quotesPerMonth: 3,
};

const PREMIUM_LIMITS: PlanLimits = {
  discoveryRadiusKm: 100,
  radiusKm: 100,
  availabilityDays: 90,
  tenderPerMonth: 'unlimited',
  quotesPerTender: 'unlimited',
  quotesPerMonth: 'unlimited',
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

  if (isPremiumPlanValue(user.subscription_tier)) return true;

  const status = (user.subscription_status ?? user.subscriptionStatus ?? '').toString().trim().toLowerCase();
  const activePlan = user.active_plan ?? user.activePlan;
  const subPlan = user.subcontractor_plan ?? user.subcontractorPlan;

  // Treat as premium when ACTIVE and plan indicates premium/pro
  if (status === 'active') {
    if (isPremiumPlanValue(activePlan)) return true;
    if (isPremiumPlanValue(subPlan)) return true;
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
