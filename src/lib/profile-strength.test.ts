import { describe, expect, it } from 'vitest';
import { parseProfileStrengthRpcResult } from '@/lib/profile-strength';

describe('parseProfileStrengthRpcResult', () => {
  it('includes activity decay fields in normalized breakdown', () => {
    const parsed = parseProfileStrengthRpcResult({
      total: 71,
      band: 'HIGH',
      activity_points: 16,
      links_points: 10,
      google_points: 14,
      likes_points: 6,
      completeness_points: 13,
      abn_points: 10,
      last_active_at: '2026-03-01T10:00:00.000Z',
      inactive_days: 23,
      activity_tier: 'stale',
    });

    expect(parsed).toBeTruthy();
    expect(parsed?.activity).toBe(16);
    expect(parsed?.abn).toBe(10);
    expect(parsed?.last_active_at).toBe('2026-03-01T10:00:00.000Z');
    expect(parsed?.inactive_days).toBe(23);
    expect(parsed?.activity_tier).toBe('stale');
  });
});

