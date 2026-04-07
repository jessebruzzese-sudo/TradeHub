import { describe, expect, it } from 'vitest';
import {
  computeProfileStrengthCategoriesFromProfile,
  effectiveLastActiveIsoFromProfile,
} from '@/lib/profile-strength/client-fallback-compute';
import { sumProfileStrengthCategoryPoints } from '@/lib/profile-strength/compute-total';

describe('client-fallback-compute', () => {
  it('returns zeros when no activity timestamps and no completeness signals', () => {
    const parts = computeProfileStrengthCategoriesFromProfile({
      bio: null,
      location: null,
      mini_bio: null,
      primary_trade: null,
      trades: [],
    });
    expect(parts.activity).toBe(0);
    expect(parts.completeness).toBe(0);
    expect(sumProfileStrengthCategoryPoints(parts)).toBe(0);
  });

  it('picks first non-empty activity timestamp', () => {
    expect(
      effectiveLastActiveIsoFromProfile({
        last_active_at: '',
        updated_at: '2020-01-01T00:00:00.000Z',
        created_at: '2019-01-01T00:00:00.000Z',
      })
    ).toBe('2020-01-01T00:00:00.000Z');
  });

  it('scores ABN from abn_verified flag without relying on wrong field names only', () => {
    const parts = computeProfileStrengthCategoriesFromProfile({
      abn_verified: true,
      abn_status: 'UNVERIFIED',
    });
    expect(parts.abn).toBe(10);
  });
});
