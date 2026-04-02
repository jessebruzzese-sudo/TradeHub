/**
 * Trade lock tests – Free users cannot change primary trade after signup.
 */
import { describe, it, expect } from 'vitest';
import { canChangePrimaryTrade, canMultiTrade } from './capability-utils';

describe('canChangePrimaryTrade', () => {
  it('returns true for admin regardless of premium', () => {
    expect(canChangePrimaryTrade({ is_admin: true })).toBe(true);
    expect(canChangePrimaryTrade({ is_admin: true, plan: 'free' })).toBe(true);
  });

  it('returns true for premium users', () => {
    expect(canChangePrimaryTrade({ plan: 'premium', subscriptionStatus: 'ACTIVE' })).toBe(true);
    expect(canChangePrimaryTrade({ complimentaryPremiumUntil: new Date(Date.now() + 86400000) })).toBe(true);
  });

  it('returns false for free users', () => {
    expect(canChangePrimaryTrade({})).toBe(false);
    expect(canChangePrimaryTrade({ plan: 'premium', subscriptionStatus: 'CANCELED' })).toBe(false);
    expect(canChangePrimaryTrade({ plan: 'free', subscriptionStatus: 'ACTIVE' })).toBe(false);
  });
});

describe('canMultiTrade (premium trade behavior preserved)', () => {
  it('returns true for premium users', () => {
    expect(canMultiTrade({ plan: 'premium', subscriptionStatus: 'ACTIVE' })).toBe(true);
    expect(canMultiTrade({ complimentaryPremiumUntil: new Date(Date.now() + 86400000) })).toBe(true);
  });

  it('returns false for free users', () => {
    expect(canMultiTrade({})).toBe(false);
    expect(canMultiTrade({ plan: 'premium', subscriptionStatus: 'NONE' })).toBe(false);
  });
});
