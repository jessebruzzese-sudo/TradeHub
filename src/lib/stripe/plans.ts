/**
 * Map internal plan keys to Stripe price IDs via env vars.
 * Server-only: never trust plan or price IDs from the client.
 */

export const BILLING_PLANS = [
  'BUSINESS_PRO_20',
  'SUBCONTRACTOR_PRO_10',
  'ALL_ACCESS_PRO_26',
] as const;

export type BillingPlanKey = (typeof BILLING_PLANS)[number];

const ENV_MAP: Record<BillingPlanKey, string> = {
  BUSINESS_PRO_20: 'STRIPE_PRICE_BUSINESS_PRO_20',
  SUBCONTRACTOR_PRO_10: 'STRIPE_PRICE_SUBCONTRACTOR_PRO_10',
  ALL_ACCESS_PRO_26: 'STRIPE_PRICE_ALL_ACCESS_PRO_26',
};

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
  for (const plan of BILLING_PLANS) {
    if (getPriceIdForPlan(plan) === priceId) return plan;
  }
  return null;
}
