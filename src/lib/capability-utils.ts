import { SubscriptionPlan, Capability } from './types';
import { BILLING_SIM_ALLOWED, getSimulatedPremium } from './billing-sim';
import { MVP_FREE_MODE, MVP_RADIUS_KM, MVP_AVAILABILITY_HORIZON_DAYS, MVP_HIDE_BUSINESS_NAME_UNTIL_ENGAGEMENT } from './feature-flags';

/**
 * Minimal structural type that matches any user-shaped object:
 *   – CurrentUser  (auth-context, camelCase)
 *   – User         (types.ts, camelCase)
 *   – UserLike     (permissions.ts)
 *   – DB rows      (snake_case)
 *
 * Every field is optional and nullable so callers never need `as any`.
 * No index signature — keeps structural assignability simple.
 */
export type CapabilityUser = {
  /* identity */
  id?: string | null;
  role?: string | null;

  /* subscription / premium — camelCase */
  activePlan?: string | null;
  subscriptionStatus?: string | null;
  complimentaryPremiumUntil?: string | Date | null;
  contractorPlan?: string | null;
  subcontractorPlan?: string | null;
  isPremium?: boolean | null;
  premiumUntil?: string | Date | null;

  /* subscription / premium — snake_case */
  active_plan?: string | null;
  subscription_status?: string | null;
  complimentary_premium_until?: string | Date | null;
  contractor_plan?: string | null;
  subcontractor_plan?: string | null;
  is_premium?: boolean | null;
  premium_until?: string | Date | null;

  /* suspension — camelCase */
  accountSuspended?: boolean | null;
  suspensionEndsAt?: Date | string | null;

  /* suspension — snake_case */
  account_suspended?: boolean | null;
  suspension_ends_at?: Date | string | null;
};

/** Dev-only: when billing sim is enabled and toggled on, treat as premium. */
function isSimulatingPremium(): boolean {
  return BILLING_SIM_ALLOWED && getSimulatedPremium();
}

/** Complimentary premium from DB: if date is in the future, user has full premium. */
function hasComplimentaryPremiumActive(user: CapabilityUser): boolean {
  if (!user?.complimentaryPremiumUntil) return false;
  const until = new Date(user.complimentaryPremiumUntil);
  return !Number.isNaN(until.getTime()) && until > new Date();
}

/**
 * Derives capabilities from DB: active_plan + subscription_status, or complimentary_premium_until.
 * Billing sim remains a dev override only.
 */
export function getUserCapabilities(user: CapabilityUser): Capability[] {
  if (isSimulatingPremium()) {
    return ['BUILDER', 'CONTRACTOR', 'SUBCONTRACTOR'];
  }
  if (hasComplimentaryPremiumActive(user)) {
    return ['BUILDER', 'CONTRACTOR', 'SUBCONTRACTOR'];
  }
  const status = (user.subscriptionStatus || '').toUpperCase();
  if (status !== 'ACTIVE') return [];
  const plan = (user.activePlan || 'NONE').toUpperCase();
  switch (plan) {
    case 'BUSINESS_PRO_20':
      return ['BUILDER', 'CONTRACTOR'];
    case 'SUBCONTRACTOR_PRO_10':
      return ['SUBCONTRACTOR'];
    case 'ALL_ACCESS_PRO_26':
      return ['BUILDER', 'CONTRACTOR', 'SUBCONTRACTOR'];
    default:
      return [];
  }
}

export function hasCapability(user: CapabilityUser, capability: Capability): boolean {
  const capabilities = getUserCapabilities(user);
  return capabilities.includes(capability);
}

export function hasBuilderPremium(user: CapabilityUser): boolean {
  if (MVP_FREE_MODE && user) return true;
  return hasCapability(user, 'BUILDER') || isSimulatingPremium();
}

export function hasContractorPremium(user: CapabilityUser): boolean {
  if (MVP_FREE_MODE && user) return true;
  return hasCapability(user, 'CONTRACTOR') || isSimulatingPremium();
}

export function hasSubcontractorPremium(user: CapabilityUser): boolean {
  if (MVP_FREE_MODE && user) return true;
  return hasCapability(user, 'SUBCONTRACTOR') || isSimulatingPremium();
}

export function canPostPremiumTenders(user: CapabilityUser): boolean {
  return hasBuilderPremium(user);
}

/** Single-account model: any logged-in user can post jobs (ABN enforced at action time via permissions.ts). */
export function canPostJobs(user: CapabilityUser): boolean {
  return !!user;
}

/** Single-account model: anyone with any premium plan can use unlimited radius. */
export function canUseUnlimitedRadius(user: CapabilityUser): boolean {
  return hasContractorPremium(user) || hasSubcontractorPremium(user) || hasBuilderPremium(user);
}

/** Single-account model: anyone with subcontractor premium can broadcast availability. */
export function canBroadcastAvailability(user: CapabilityUser): boolean {
  return hasSubcontractorPremium(user);
}

export function canCustomSearchLocation(user: CapabilityUser): boolean {
  return (
    hasBuilderPremium(user) ||
    hasContractorPremium(user) ||
    hasSubcontractorPremium(user)
  );
}

export function canHideBusinessName(user: CapabilityUser): boolean {
  if (MVP_FREE_MODE && MVP_HIDE_BUSINESS_NAME_UNTIL_ENGAGEMENT) return true;
  return hasBuilderPremium(user);
}

export function getMaxRadius(user: CapabilityUser): number {
  if (MVP_FREE_MODE) return MVP_RADIUS_KM;
  if (canUseUnlimitedRadius(user)) {
    return Infinity;
  }
  return 15;
}

/** Single-account model: subcontractor premium = 60 days, else 14. MVP gives everyone 60 days. */
export function getMaxAvailabilityHorizonDays(user: CapabilityUser): number {
  if (MVP_FREE_MODE) return MVP_AVAILABILITY_HORIZON_DAYS;
  return hasSubcontractorPremium(user) ? 60 : 14;
}

export function getMaxTenderQuotes(user: CapabilityUser, tenderType: 'basic' | 'premium'): number {
  if (tenderType === 'premium') {
    return Infinity;
  }
  return 3;
}

export function getPlanName(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'BUSINESS_PRO_20':
      return 'Business Pro';
    case 'SUBCONTRACTOR_PRO_10':
      return 'Subcontractor Pro';
    case 'ALL_ACCESS_PRO_26':
      return 'All-Access Pro';
    default:
      return 'Free';
  }
}

export function getPlanPrice(plan: SubscriptionPlan): number {
  switch (plan) {
    case 'BUSINESS_PRO_20':
      return 20;
    case 'SUBCONTRACTOR_PRO_10':
      return 10;
    case 'ALL_ACCESS_PRO_26':
      return 26;
    default:
      return 0;
  }
}

export function getPlanDescription(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'BUSINESS_PRO_20':
      return 'Post tenders and hire subcontractors';
    case 'SUBCONTRACTOR_PRO_10':
      return 'Enhanced subcontractor tools';
    case 'ALL_ACCESS_PRO_26':
      return 'Everything: Builder + Contractor + Subcontractor';
    default:
      return 'Basic access';
  }
}

export function getUpgradePath(currentPlan: SubscriptionPlan, targetCapabilities: Capability[]): SubscriptionPlan | null {
  const hasBuilder = targetCapabilities.includes('BUILDER');
  const hasContractor = targetCapabilities.includes('CONTRACTOR');
  const hasSubcontractor = targetCapabilities.includes('SUBCONTRACTOR');

  if (hasBuilder && hasContractor && hasSubcontractor) {
    return 'ALL_ACCESS_PRO_26';
  }

  if ((hasBuilder && hasContractor) || (hasBuilder && !hasSubcontractor) || (hasContractor && !hasSubcontractor)) {
    return 'BUSINESS_PRO_20';
  }

  if (hasSubcontractor && !hasBuilder && !hasContractor) {
    return 'SUBCONTRACTOR_PRO_10';
  }

  return null;
}

export function isSubscriptionActive(user: CapabilityUser): boolean {
  return user.subscriptionStatus === 'ACTIVE';
}

export function getTenderCloseHours(user: CapabilityUser): number {
  const plan = user.activePlan || 'NONE';

  switch (plan) {
    case 'BUSINESS_PRO_20':
      return 72; // 3 days
    case 'ALL_ACCESS_PRO_26':
      return 168; // 7 days
    case 'SUBCONTRACTOR_PRO_10':
      return 24; // 1 day (though subcontractors typically can't post tenders)
    default:
      return 24; // 1 day for free tier
  }
}

export function canAccessFeature(user: CapabilityUser, feature: string): boolean {
  if (user.accountSuspended) {
    if (user.suspensionEndsAt && new Date() < new Date(user.suspensionEndsAt)) {
      return false;
    }
    if (!user.suspensionEndsAt) {
      return false;
    }
  }

  switch (feature) {
    case 'post_premium_tender':
      return canPostPremiumTenders(user);
    case 'post_job':
      return canPostJobs(user);
    case 'unlimited_radius':
      return canUseUnlimitedRadius(user);
    case 'broadcast_availability':
      return canBroadcastAvailability(user);
    case 'hide_business_name':
      return canHideBusinessName(user);
    default:
      return true;
  }
}

export interface FeatureLock {
  locked: boolean;
  reason?: string;
  upgradeUrl?: string;
  upgradePlan?: SubscriptionPlan;
  upgradePlanName?: string;
  upgradePlanPrice?: number;
}

export function getFeatureLock(user: CapabilityUser, feature: string): FeatureLock {
  const unlocked: FeatureLock = { locked: false };

  if (canAccessFeature(user, feature)) {
    return unlocked;
  }

  switch (feature) {
    case 'post_premium_tender':
      return {
        locked: true,
        reason: 'Premium tenders require Business Pro',
        upgradeUrl: '/pricing',
        upgradePlan: 'BUSINESS_PRO_20',
        upgradePlanName: 'Business Pro',
        upgradePlanPrice: 20,
      };
    case 'unlimited_radius':
      return {
        locked: true,
        reason: 'Expand your work radius beyond 15km',
        upgradeUrl: '/pricing',
        upgradePlan: 'ALL_ACCESS_PRO_26',
        upgradePlanName: 'All-Access Pro',
        upgradePlanPrice: 26,
      };
    case 'broadcast_availability':
      return {
        locked: true,
        reason: 'Notify contractors when you are available',
        upgradeUrl: '/pricing',
        upgradePlan: 'SUBCONTRACTOR_PRO_10',
        upgradePlanName: 'Subcontractor Pro',
        upgradePlanPrice: 10,
      };
    default:
      return unlocked;
  }
}
