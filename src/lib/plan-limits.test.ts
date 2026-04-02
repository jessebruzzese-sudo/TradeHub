/**
 * Plan limits — tier detection and availability horizon tests
 */
import { describe, it, expect } from 'vitest';
import {
  getTier,
  getLimits,
  isPremiumPlanValue,
} from './plan-limits';
import { addDays, startOfDay, isAfter } from 'date-fns';

const FREE_DAYS = 30;
const PREMIUM_DAYS = 90;

describe('isPremiumPlanValue', () => {
  it('should treat premium-like plan values as premium', () => {
    expect(isPremiumPlanValue('SUBCONTRACTOR_PRO_10')).toBe(true);
    expect(isPremiumPlanValue('ALL_ACCESS_PRO_26')).toBe(true);
    expect(isPremiumPlanValue('PRO_10')).toBe(true);
    expect(isPremiumPlanValue('pro')).toBe(true);
    expect(isPremiumPlanValue('premium')).toBe(true);
    expect(isPremiumPlanValue('Pro')).toBe(true);
    expect(isPremiumPlanValue('PREMIUM')).toBe(true);
  });

  it('should treat free/basic values as free', () => {
    expect(isPremiumPlanValue('free')).toBe(false);
    expect(isPremiumPlanValue('basic')).toBe(false);
    expect(isPremiumPlanValue('none')).toBe(false);
    expect(isPremiumPlanValue('approve')).toBe(false);
    expect(isPremiumPlanValue('improve')).toBe(false);
    expect(isPremiumPlanValue('')).toBe(false);
    expect(isPremiumPlanValue(null)).toBe(false);
    expect(isPremiumPlanValue(undefined)).toBe(false);
  });
});

describe('getTier / getLimits', () => {
  it('should give 90 days for canonical premium (paid or complimentary)', () => {
    const premiumUsers = [
      { plan: 'premium', subscription_status: 'ACTIVE' },
      { plan: 'premium', subscription_status: 'active' },
      {
        plan: 'free',
        complimentary_premium_until: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      { subscription_tier: 'premium' },
    ];
    for (const user of premiumUsers) {
      const tier = getTier(user as any);
      const limits = getLimits(tier);
      expect(tier).toBe('premium');
      expect(limits.availabilityDays).toBe(PREMIUM_DAYS);
    }
  });

  it('should give 30 days for free/basic users', () => {
    const freeUsers = [
      null,
      undefined,
      {},
      { plan: 'free', subscription_status: 'ACTIVE' },
      { plan: 'premium', subscription_status: 'CANCELED' },
      { plan: 'premium', subscription_status: 'NONE' },
    ];
    for (const user of freeUsers) {
      const tier = getTier(user as any);
      const limits = getLimits(tier);
      expect(limits.availabilityDays).toBe(FREE_DAYS);
    }
  });
});

describe('availability horizon logic', () => {
  const REF_DATE = new Date('2026-03-01');

  function isDateWithinHorizon(date: Date, horizonDays: number) {
    const today = startOfDay(REF_DATE);
    const maxDate = addDays(today, horizonDays);
    return !isAfter(date, maxDate) && !isAfter(today, date);
  }

  it('Free: 2026-03-20 (19 days ahead) → allowed', () => {
    expect(isDateWithinHorizon(new Date('2026-03-20'), FREE_DAYS)).toBe(true);
  });

  it('Free: 2026-04-10 (40 days ahead) → blocked', () => {
    expect(isDateWithinHorizon(new Date('2026-04-10'), FREE_DAYS)).toBe(false);
  });

  it('Premium: 2026-05-01 (61 days ahead) → allowed', () => {
    expect(isDateWithinHorizon(new Date('2026-05-01'), PREMIUM_DAYS)).toBe(true);
  });

  it('Premium: 2026-06-15 (106 days ahead) → blocked', () => {
    expect(isDateWithinHorizon(new Date('2026-06-15'), PREMIUM_DAYS)).toBe(false);
  });
});
