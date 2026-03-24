import { describe, expect, it } from 'vitest';
import {
  getGoogleBusinessBadgeTier,
  getGoogleBusinessStatusLabel,
  getUserClaimToggleNextStatus,
  shouldResetGoogleVerification,
} from '@/lib/google-business';

describe('google business verification helpers', () => {
  it('returns SELF_CONFIRMED badge tier for self-confirmed listing', () => {
    const tier = getGoogleBusinessBadgeTier({
      google_business_url: 'https://maps.google.com/example',
      google_listing_verification_status: 'SELF_CONFIRMED',
    });
    expect(tier).toBe('grey');
    expect(
      getGoogleBusinessStatusLabel({ google_listing_verification_status: 'SELF_CONFIRMED' })
    ).toBe('Self-confirmed');
  });

  it('reverts to UNVERIFIED when user toggles claim off for non-verified', () => {
    expect(getUserClaimToggleNextStatus('SELF_CONFIRMED', false)).toBe('UNVERIFIED');
    expect(getUserClaimToggleNextStatus('PENDING_REVIEW', false)).toBe('UNVERIFIED');
  });

  it('returns blue for platform-verified listing', () => {
    const tier = getGoogleBusinessBadgeTier({
      google_business_url: 'https://maps.google.com/example',
      google_listing_verification_status: 'VERIFIED',
      google_rating: 4.2,
      google_review_count: 5,
      abn_status: 'UNVERIFIED',
    } as any);
    expect(tier).toBe('blue');
  });

  it('returns gold for highly trusted verified listing', () => {
    const tier = getGoogleBusinessBadgeTier({
      google_business_url: 'https://maps.google.com/example',
      google_listing_verification_status: 'VERIFIED',
      google_rating: 4.8,
      google_review_count: 28,
      abn_verified: true,
      abn_status: 'VERIFIED',
    } as any);
    expect(tier).toBe('gold');
  });

  it('resets verified state when listing identity changes', () => {
    const shouldReset = shouldResetGoogleVerification(
      {
        google_listing_verification_status: 'VERIFIED',
        google_business_url: 'https://maps.google.com/a',
      },
      {
        google_business_url: 'https://maps.google.com/b',
      }
    );
    expect(shouldReset).toBe(true);
  });
});
