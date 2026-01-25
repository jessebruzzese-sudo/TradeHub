import { User, SubscriptionPlan, Capability } from './types';
import { BILLING_SIM_ALLOWED, getSimulatedPremium } from './billing-sim';

export function getUserCapabilities(user: User): Capability[] {
  const plan = user.activePlan || 'NONE';

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

function isSimulatingPremium(): boolean {
  return BILLING_SIM_ALLOWED && getSimulatedPremium();
}

export function hasCapability(user: User, capability: Capability): boolean {
  const capabilities = getUserCapabilities(user);
  return capabilities.includes(capability);
}

export function hasBuilderPremium(user: User): boolean {
  return hasCapability(user, 'BUILDER') || isSimulatingPremium();
}

export function hasContractorPremium(user: User): boolean {
  return hasCapability(user, 'CONTRACTOR') || isSimulatingPremium();
}

export function hasSubcontractorPremium(user: User): boolean {
  return hasCapability(user, 'SUBCONTRACTOR') || isSimulatingPremium();
}

export function canPostPremiumTenders(user: User): boolean {
  return hasBuilderPremium(user);
}

export function canPostJobs(user: User): boolean {
  return user.role === 'contractor';
}

export function canUseUnlimitedRadius(user: User): boolean {
  if (user.role === 'contractor') {
    return hasContractorPremium(user);
  }
  if (user.role === 'subcontractor') {
    return hasSubcontractorPremium(user);
  }
  return hasBuilderPremium(user);
}

export function canBroadcastAvailability(user: User): boolean {
  return user.role === 'subcontractor' && hasSubcontractorPremium(user);
}

export function canHideBusinessName(user: User): boolean {
  return hasBuilderPremium(user);
}

export function getMaxRadius(user: User): number {
  if (canUseUnlimitedRadius(user)) {
    return Infinity;
  }
  return 15;
}

export function getMaxAvailabilityHorizonDays(user: User): number {
  if (user.role === 'subcontractor' && hasSubcontractorPremium(user)) {
    return 60;
  }
  return 14;
}

export function getMaxTenderQuotes(user: User, tenderType: 'basic' | 'premium'): number {
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

export function isSubscriptionActive(user: User): boolean {
  return user.subscriptionStatus === 'ACTIVE';
}

export function getTenderCloseHours(user: User): number {
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

export function canAccessFeature(user: User, feature: string): boolean {
  if (user.accountSuspended) {
    if (user.suspensionEndsAt && new Date() < user.suspensionEndsAt) {
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

export function getFeatureLock(user: User, feature: string): FeatureLock {
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
      if (user.role === 'subcontractor') {
        return {
          locked: true,
          reason: 'Increase your work radius beyond 15km',
          upgradeUrl: '/pricing',
          upgradePlan: 'SUBCONTRACTOR_PRO_10',
          upgradePlanName: 'Subcontractor Pro',
          upgradePlanPrice: 10,
        };
      }
      return {
        locked: true,
        reason: 'Expand your work radius',
        upgradeUrl: '/pricing',
        upgradePlan: 'BUSINESS_PRO_20',
        upgradePlanName: 'Business Pro',
        upgradePlanPrice: 20,
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
