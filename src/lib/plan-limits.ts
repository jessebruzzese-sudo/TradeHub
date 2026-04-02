/**
 * Central plan limits: Free vs Premium.
 * Used for server-side enforcement of radius and availability.
 */

import { hasPremiumAccess, type BillingUserLike } from '@/lib/billing/has-premium-access';

export type PlanTier = 'free' | 'premium';

/** User-shaped input for tier: canonical billing fields only (see hasPremiumAccess). */
export type PlanUser = BillingUserLike & {
  subscription_tier?: string | null;
};

type TierUser = PlanUser & { id?: string };

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
  /** Discovery/search radius cap (used for job discovery) */
  discoveryRadiusKm: number;
  /** Back-compat alias (some older callers may still use radiusKm) */
  radiusKm: number;
  availabilityDays: number;
};

const FREE_LIMITS: PlanLimits = {
  discoveryRadiusKm: 20,
  radiusKm: 20,
  availabilityDays: 30,
};

const PREMIUM_LIMITS: PlanLimits = {
  discoveryRadiusKm: 100,
  radiusKm: 100,
  availabilityDays: 90,
};

function isPremium(user: TierUser | null | undefined): boolean {
  if (!user) return false;
  if (hasPremiumAccess(user)) return true;
  if (isPremiumPlanValue(user.subscription_tier)) return true;
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
