import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActivityPoints,
  getActivityTier,
  getActivityWarning,
  getInactiveDays,
} from '@/lib/profile-strength/activity-score';
import { isLastActiveStale } from '@/lib/activity/touch-last-active';

describe('profile activity score decay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps inactivity windows to exact points', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    vi.setSystemTime(now);

    expect(getActivityPoints('2026-03-24T00:00:00.000Z')).toBe(32);
    expect(getActivityPoints('2026-03-16T12:00:00.000Z')).toBe(24);
    expect(getActivityPoints('2026-03-09T12:00:00.000Z')).toBe(16);
    expect(getActivityPoints('2026-03-02T12:00:00.000Z')).toBe(8);
    expect(getActivityPoints('2026-02-22T11:59:59.000Z')).toBe(0);
  });

  it('handles null or invalid dates conservatively', () => {
    expect(getInactiveDays(null)).toBeGreaterThanOrEqual(30);
    expect(getActivityPoints(null)).toBe(0);
    expect(getActivityTier('not-a-date')).toBe('inactive');
  });

  it('returns warning states at 22+ and 30+ days', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    vi.setSystemTime(now);

    expect(getActivityWarning('2026-03-02T12:00:00.000Z')).toContain('starting to drop');
    expect(getActivityWarning('2026-02-20T12:00:00.000Z')).toContain('has been inactive');
  });
});

describe('last_active touch throttling', () => {
  it('is stale only when 6 hours or older', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    expect(isLastActiveStale('2026-03-24T10:00:01.000Z', now)).toBe(false);
    expect(isLastActiveStale('2026-03-24T06:00:00.000Z', now)).toBe(true);
    expect(isLastActiveStale(null, now)).toBe(true);
  });
});

