/**
 * Central plan limits: Free vs Premium.
 * Used for server-side enforcement of radius, availability, tenders, and quotes.
 */

export type PlanTier = 'free' | 'premium';

type TierUser = {
  id?: string;
  is_premium?: boolean | null;
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
  subscription_tier?: string | null;
  active_plan?: string | null;
  activePlan?: string | null;
  subcontractor_plan?: string | null;
  subcontractor_sub_status?: string | null;
  subcontractorPlan?: string | null;
  subcontractorSubStatus?: string | null;
};


export const FREE_LIMITS = {
  radiusKm: 20,
  availabilityDays: 30,
  tenderPerMonth: 1 as const,
  quotesPerTender: 3 as const,
} as const;

export const PREMIUM_LIMITS = {
  radiusKm: 100,
  availabilityDays: 90,
  tenderPerMonth: 'unlimited' as const,
  quotesPerTender: 'unlimited' as const,
} as const;

export type PlanLimits = {
  radiusKm: number;
  availabilityDays: number;
  tenderPerMonth: number | 'unlimited';
  quotesPerTender: number | 'unlimited';
};

function isPremium(user: TierUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_premium === true) return true;
  const tier = (user.subscription_tier ?? '').toString().toLowerCase();
  if (tier === 'premium') return true;
  const status = (user.subscription_status ?? user.subscriptionStatus ?? '').toString().toLowerCase();
  const subStatus = (user.subcontractor_sub_status ?? user.subcontractorSubStatus ?? '').toString().toLowerCase();
  const plan = (user.active_plan ?? user.activePlan ?? '').toString().toLowerCase();
  const subPlan = (user.subcontractor_plan ?? user.subcontractorPlan ?? '').toString().toLowerCase();
  return (
    ['active', 'trialing'].includes(status) ||
    ['active', 'trialing'].includes(subStatus) ||
    ['pro', 'premium'].includes(plan) ||
    ['pro', 'premium'].includes(subPlan)
  );
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
