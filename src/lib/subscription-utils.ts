import { SubcontractorPlan, SubcontractorSubStatus } from './types';
import { MVP_FREE_MODE, MVP_RADIUS_KM, MVP_AVAILABILITY_HORIZON_DAYS } from './feature-flags';

/** Structural type covering both User (types.ts) and CurrentUser (auth-context). */
type SubscriptionUser = {
  complimentaryPremiumUntil?: string | Date | null;
  subscriptionStatus?: string | null;
  activePlan?: string | null;
  subcontractorPlan?: string | null;
  subcontractorSubStatus?: string | null;
  radius?: number;
  subcontractorPreferredRadiusKm?: number;
};

export interface SubcontractorTierLimits {
  name: string;
  price: number;
  maxRadiusKm: number;
  availabilityHorizonDays: number;
  alertChannels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  features: string[];
}

export const TIER_LIMITS: Record<SubcontractorPlan, SubcontractorTierLimits> = {
  NONE: {
    name: 'Free',
    price: 0,
    maxRadiusKm: 15,
    availabilityHorizonDays: 14,
    alertChannels: {
      inApp: true,
      email: true,
      sms: true,
    },
    features: [
      'Browse jobs matching your trade',
      'Apply to jobs within 15km',
      'Work alerts via in-app, email & SMS',
      'Set availability up to 14 days ahead',
      'Messaging with contractors',
      'Profile visibility',
    ],
  },
  PRO_10: {
    name: 'Pro',
    price: 10,
    maxRadiusKm: 999,
    availabilityHorizonDays: 60,
    alertChannels: {
      inApp: true,
      email: true,
      sms: true,
    },
    features: [
      'All Free features',
      'Expanded radius up to 999km',
      'Set availability up to 60 days ahead',
      'Availability broadcast to contractors',
      'Pro badge on profile',
      'Priority messaging access',
    ],
  },
};

export function hasComplimentaryPremium(user: SubscriptionUser | null | undefined): boolean {
  if (!user) return false;
  if (!user.complimentaryPremiumUntil) return false;
  return new Date(user.complimentaryPremiumUntil) > new Date();
}

/** Single-account: based on plan/subscription status only, not role. Uses unified active_plan + subscription_status, or legacy subcontractor fields. */
export function isSubcontractorPro(user: SubscriptionUser | null | undefined): boolean {
  if (!user) return false;

  if (hasComplimentaryPremium(user)) return true;

  // Unified model (from users.active_plan + subscription_status)
  const status = (user.subscriptionStatus || '').toUpperCase();
  if (status === 'ACTIVE' && user.activePlan === 'SUBCONTRACTOR_PRO_10') return true;
  if (status === 'ACTIVE' && user.activePlan === 'ALL_ACCESS_PRO_26') return true;

  // Legacy subcontractor fields
  return (
    user.subcontractorPlan === 'PRO_10' &&
    user.subcontractorSubStatus === 'ACTIVE'
  );
}

/** Single-account: based on plan only. MVP: cap at MVP_RADIUS_KM. */
export function getEffectiveRadiusKm(user: SubscriptionUser): number {
  if (MVP_FREE_MODE) {
    const preferred = user?.subcontractorPreferredRadiusKm || user?.radius || MVP_RADIUS_KM;
    return Math.min(preferred, MVP_RADIUS_KM);
  }

  if (!user || !isSubcontractorPro(user)) {
    return user?.radius || 15;
  }

  const preferredRadius = user.subcontractorPreferredRadiusKm || 15;
  const isPro = isSubcontractorPro(user);
  const maxRadius = isPro ? TIER_LIMITS.PRO_10.maxRadiusKm : TIER_LIMITS.NONE.maxRadiusKm;

  return Math.min(preferredRadius, maxRadius);
}

/** Single-account: based on plan only. MVP: everyone gets 60-day horizon. */
export function getAvailabilityHorizonDays(user: SubscriptionUser): number {
  if (MVP_FREE_MODE) return MVP_AVAILABILITY_HORIZON_DAYS;

  if (!user || !isSubcontractorPro(user)) {
    return 14;
  }

  const isPro = isSubcontractorPro(user);
  return isPro ? TIER_LIMITS.PRO_10.availabilityHorizonDays : TIER_LIMITS.NONE.availabilityHorizonDays;
}

/** Single-account: based on plan only. MVP: all channels enabled for everyone. */
export function canUseAlertChannel(
  user: SubscriptionUser,
  channel: 'inApp' | 'email' | 'sms'
): boolean {
  if (MVP_FREE_MODE) return true;

  if (!user || !isSubcontractorPro(user)) return false;

  const isPro = isSubcontractorPro(user);
  const limits = isPro ? TIER_LIMITS.PRO_10 : TIER_LIMITS.NONE;

  return limits.alertChannels[channel];
}

/** Single-account: based on plan only. */
export function getCurrentPlanLimits(user: SubscriptionUser | null | undefined): SubcontractorTierLimits {
  if (!user || !isSubcontractorPro(user)) {
    return TIER_LIMITS.NONE;
  }

  const isPro = isSubcontractorPro(user);
  return isPro ? TIER_LIMITS.PRO_10 : TIER_LIMITS.NONE;
}

export function getPlanDisplayName(plan: SubcontractorPlan): string {
  return TIER_LIMITS[plan].name;
}

export function getSubscriptionStatusDisplay(status: SubcontractorSubStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', color: 'green' };
    case 'PAST_DUE':
      return { label: 'Past Due', color: 'yellow' };
    case 'CANCELED':
      return { label: 'Canceled', color: 'gray' };
    case 'NONE':
    default:
      return { label: 'No Subscription', color: 'gray' };
  }
}

export function shouldShowProBadge(user: SubscriptionUser | null | undefined): boolean {
  return isSubcontractorPro(user);
}

/** Single-account: based on plan only. */
export function getSubscriptionDisplayText(user: SubscriptionUser | null | undefined): {
  plan: string;
  badge?: string;
  expiryDate?: string;
} {
  if (!user || !isSubcontractorPro(user)) {
    return { plan: 'Free' };
  }

  if (hasComplimentaryPremium(user)) {
    return {
      plan: 'Premium',
      badge: 'Complimentary',
      expiryDate: user.complimentaryPremiumUntil
        ? String(user.complimentaryPremiumUntil)
        : undefined,
    };
  }

  const status = (user.subscriptionStatus || '').toUpperCase();
  if (status === 'ACTIVE' && (user.activePlan === 'SUBCONTRACTOR_PRO_10' || user.activePlan === 'ALL_ACCESS_PRO_26')) {
    return { plan: 'Premium' };
  }
  if (user.subcontractorPlan === 'PRO_10' && user.subcontractorSubStatus === 'ACTIVE') {
    return { plan: 'Premium' };
  }

  return { plan: 'Free' };
}

/** Single-account: anyone with plan or settings can use work alerts. */
export function canUseWorkAlerts(user: SubscriptionUser | null | undefined): boolean {
  if (!user) return false;
  return true;
}

/** Single-account: based on plan only. */
export function canUseAvailabilityBroadcast(user: SubscriptionUser | null | undefined): boolean {
  if (!user) return false;
  return isSubcontractorPro(user);
}

export function validateWorkAlerts(
  inApp: boolean,
  email: boolean,
  sms: boolean
): { valid: boolean; message?: string } {
  if (!inApp && !email && !sms) {
    return {
      valid: false,
      message: 'Choose at least one alert type (In-app, Email, or SMS) to stay notified.',
    };
  }
  return { valid: true };
}
