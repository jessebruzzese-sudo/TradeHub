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
    expect(parsed?.total).toBe(69);
    expect(parsed?.band).toBe('HIGH');
    expect(parsed?.activity).toBe(16);
    expect(parsed?.abn).toBe(10);
    expect(parsed?.last_active_at).toBe('2026-03-01T10:00:00.000Z');
    expect(parsed?.inactive_days).toBe(23);
    expect(parsed?.activity_tier).toBe('stale');
  });

  it('derives total and band from category sum (ignores stale RPC total when it disagrees)', () => {
    const parsed = parseProfileStrengthRpcResult({
      total: 0,
      band: 'LOW',
      activity_points: 5,
      links_points: 5,
      google_points: 5,
      likes_points: 5,
      completeness_points: 5,
      abn_points: 5,
    });

    expect(parsed?.total).toBe(30);
    expect(parsed?.band).toBe('LOW');
  });

  it('maps Postgres user_not_found envelope to zeroed categories (no longer returns null)', () => {
    const parsed = parseProfileStrengthRpcResult({ error: 'user_not_found' });
    expect(parsed).toBeTruthy();
    expect(parsed?.total).toBe(0);
    expect(parsed?.band).toBe('LOW');
    expect(parsed?.activity).toBe(0);
  });

  it('accepts legacy numeric RPC return as total-only payload', () => {
    const parsed = parseProfileStrengthRpcResult(42);
    expect(parsed?.total).toBe(42);
    expect(parsed?.band).toBe('MEDIUM');
  });

  it('unwraps nested single-element arrays so category keys are not lost', () => {
    const inner = {
      activity_points: 32,
      links_points: 6,
      google_points: 4,
      likes_points: 2,
      completeness_points: 5,
      abn_points: 10,
    };
    const parsed = parseProfileStrengthRpcResult([[inner]]);
    expect(parsed?.activity).toBe(32);
    expect(parsed?.total).toBe(59);
  });
});

