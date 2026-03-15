/**
 * Trade lock tests – Free users cannot change primary trade after signup.
 */
import { describe, it, expect } from 'vitest';
import { canChangePrimaryTrade, canMultiTrade } from './capability-utils';

describe('canChangePrimaryTrade', () => {
  it('returns true for admin regardless of premium', () => {
    expect(canChangePrimaryTrade({ is_admin: true })).toBe(true);
    expect(canChangePrimaryTrade({ is_admin: true, is_premium: false })).toBe(true);
  });

  it('returns true for premium users', () => {
    expect(canChangePrimaryTrade({ is_premium: true })).toBe(true);
    expect(canChangePrimaryTrade({ activePlan: 'ALL_ACCESS_PRO_26', subscriptionStatus: 'ACTIVE' })).toBe(true);
    expect(canChangePrimaryTrade({ complimentaryPremiumUntil: new Date(Date.now() + 86400000) })).toBe(true);
  });

  it('returns false for free users', () => {
    expect(canChangePrimaryTrade({})).toBe(false);
    expect(canChangePrimaryTrade({ is_premium: false })).toBe(false);
    expect(canChangePrimaryTrade({ active_plan: 'NONE' })).toBe(false);
  });
});

describe('canMultiTrade (premium trade behavior preserved)', () => {
  it('returns true for premium users', () => {
    expect(canMultiTrade({ is_premium: true })).toBe(true);
    expect(canMultiTrade({ activePlan: 'SUBCONTRACTOR_PRO_10', subscriptionStatus: 'ACTIVE' })).toBe(true);
  });

  it('returns false for free users', () => {
    expect(canMultiTrade({})).toBe(false);
    expect(canMultiTrade({ is_premium: false })).toBe(false);
  });
});
