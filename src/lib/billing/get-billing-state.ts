import {
  hasPremiumAccess,
  isComplimentaryPremiumActive,
  type BillingUserLike,
} from './has-premium-access';

export type BillingState = {
  hasPremiumAccess: boolean;
  isComplimentaryPremium: boolean;
  /** Paid via subscription: premium plan + ACTIVE (may overlap with complimentary window). */
  isPaidPremium: boolean;
  subscriptionStatus: string | null;
  /** Normalised plan label from the user row, lowercased when free/premium. */
  plan: string | null;
};

export function getBillingState(user: BillingUserLike | null | undefined): BillingState {
  const isComplimentary = isComplimentaryPremiumActive(user);
  const hasAccess = hasPremiumAccess(user);

  const rawPlan = user?.plan != null && String(user.plan).trim() !== '' ? String(user.plan).trim() : null;
  const planLower = rawPlan != null ? rawPlan.toLowerCase() : null;

  const rawStatus = user?.subscription_status ?? user?.subscriptionStatus ?? null;
  const subscriptionStatus =
    rawStatus != null && String(rawStatus).trim() !== ''
      ? String(rawStatus).trim().toUpperCase()
      : null;

  const isPaidPremium = planLower === 'premium' && subscriptionStatus === 'ACTIVE';

  return {
    hasPremiumAccess: hasAccess,
    isComplimentaryPremium: isComplimentary,
    isPaidPremium,
    subscriptionStatus,
    plan: rawPlan,
  };
}
