import { describe, expect, it } from 'vitest';
import {
  profileStrengthBandFromTotal,
  sumProfileStrengthCategoryPoints,
} from '@/lib/profile-strength/compute-total';

describe('sumProfileStrengthCategoryPoints', () => {
  it('sums categories and clamps to 0–100', () => {
    expect(
      sumProfileStrengthCategoryPoints({
        activity: 32,
        links: 0,
        google: 0,
        likes: 0,
        completeness: 0,
        abn: 10,
      })
    ).toBe(42);
  });
});

describe('profileStrengthBandFromTotal', () => {
  it('matches SQL thresholds', () => {
    expect(profileStrengthBandFromTotal(0)).toBe('LOW');
    expect(profileStrengthBandFromTotal(39)).toBe('LOW');
    expect(profileStrengthBandFromTotal(40)).toBe('MEDIUM');
    expect(profileStrengthBandFromTotal(64)).toBe('MEDIUM');
    expect(profileStrengthBandFromTotal(65)).toBe('HIGH');
    expect(profileStrengthBandFromTotal(84)).toBe('HIGH');
    expect(profileStrengthBandFromTotal(85)).toBe('ELITE');
  });
});
