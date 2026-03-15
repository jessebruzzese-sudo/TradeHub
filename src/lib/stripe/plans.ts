/**
 * Map internal plan keys to Stripe price IDs via env vars.
 * Server-only: never trust plan or price IDs from the client.
 */

export const BILLING_PLANS = [
  'PREMIUM',
  'BUSINESS_PRO_20',
  'SUBCONTRACTOR_PRO_10',
  'ALL_ACCESS_PRO_26',
] as const;

export type BillingPlanKey = (typeof BILLING_PLANS)[number];

const ENV_MAP: Record<BillingPlanKey, string> = {
  PREMIUM: 'STRIPE_PREMIUM_PRICE_ID',
  BUSINESS_PRO_20: 'STRIPE_PRICE_BUSINESS_PRO_20',
  SUBCONTRACTOR_PRO_10: 'STRIPE_PRICE_SUBCONTRACTOR_PRO_10',
  ALL_ACCESS_PRO_26: 'STRIPE_PRICE_ALL_ACCESS_PRO_26',
};

/** Primary premium price ID from env. Used for unified premium checkout. */
export function getPremiumPriceId(): string | null {
  // Prefer STRIPE_PRICE_PREMIUM first for compatibility with older env files
  // that may contain duplicate STRIPE_PREMIUM_PRICE_ID entries.
  const v = process.env.STRIPE_PRICE_PREMIUM ?? process.env.STRIPE_PREMIUM_PRICE_ID;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Returns true if the given Stripe price ID is the premium subscription price. */
export function isPremiumPriceId(priceId: string): boolean {
  return getPremiumPriceId() === priceId;
}

/**
 * Returns Stripe price ID for the given plan. Server-only.
 * Returns null if env var is not set.
 */
export function getPriceIdForPlan(plan: BillingPlanKey): string | null {
  const envKey = ENV_MAP[plan];
  const value = process.env[envKey];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isAllowedPlan(plan: string): plan is BillingPlanKey {
  return BILLING_PLANS.includes(plan as BillingPlanKey);
}

/** Map Stripe price ID back to internal plan (for webhook). */
export function getPlanForPriceId(priceId: string): BillingPlanKey | null {
  if (isPremiumPriceId(priceId)) return 'ALL_ACCESS_PRO_26';
  for (const plan of BILLING_PLANS) {
    if (getPriceIdForPlan(plan) === priceId) return plan;
  }
  return null;
}
