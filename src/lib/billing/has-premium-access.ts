/**
 * Canonical premium access (users.plan + users.subscription_status + complimentary_premium_until).
 * Do not read legacy columns (is_premium, active_plan, premium_until, subcontractor_*, builder_*, contractor_*).
 */

export type BillingUserLike = {
  plan?: string | null;
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
  complimentary_premium_until?: string | Date | null;
  complimentaryPremiumUntil?: string | Date | null;
};

function normaliseSubscriptionStatus(raw: string): string {
  return raw.trim().toUpperCase();
}

/** True when complimentary_premium_until is set and strictly after now. */
export function isComplimentaryPremiumActive(user: BillingUserLike | null | undefined): boolean {
  if (!user) return false;
  const v = user.complimentary_premium_until ?? user.complimentaryPremiumUntil;
  if (v == null || v === '') return false;
  const t = v instanceof Date ? v.getTime() : new Date(v as string).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/**
 * Premium access:
 * - plan is 'premium' (case-insensitive) AND subscription_status is 'ACTIVE' (case-insensitive), OR
 * - complimentary_premium_until is in the future.
 */
export function hasPremiumAccess(user: BillingUserLike | null | undefined): boolean {
  if (!user) return false;
  if (isComplimentaryPremiumActive(user)) return true;

  const plan = String(user.plan ?? '').trim().toLowerCase();
  const status = normaliseSubscriptionStatus(
    String(user.subscription_status ?? user.subscriptionStatus ?? '')
  );

  return plan === 'premium' && status === 'ACTIVE';
}
