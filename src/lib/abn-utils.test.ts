import { describe, expect, it } from 'vitest';
import { hasValidABN, hasABNButNotVerified } from '@/lib/abn-utils';

const abn = '12345678901';

describe('hasValidABN (strict: non-empty ABN + status VERIFIED)', () => {
  it('returns false for null user', () => {
    expect(hasValidABN(null)).toBe(false);
  });

  it('returns false when ABN empty even if status VERIFIED', () => {
    expect(hasValidABN({ abn: '', abn_status: 'VERIFIED' })).toBe(false);
    expect(hasValidABN({ abn: '   ', abnStatus: 'VERIFIED' })).toBe(false);
  });

  it('returns false for UNVERIFIED / PENDING / REJECTED with ABN', () => {
    expect(hasValidABN({ abn, abn_status: 'UNVERIFIED' })).toBe(false);
    expect(hasValidABN({ abn, abn_status: 'PENDING' })).toBe(false);
    expect(hasValidABN({ abn, abn_status: 'REJECTED' })).toBe(false);
  });

  it('returns true only for non-empty ABN and VERIFIED status', () => {
    expect(hasValidABN({ abn, abn_status: 'VERIFIED' })).toBe(true);
    expect(hasValidABN({ abn, abnStatus: 'verified' })).toBe(true);
  });

  it('does not treat boolean or timestamp alone as verified', () => {
    expect(
      hasValidABN({
        abn,
        abn_status: 'UNVERIFIED',
        abn_verified: true,
        abn_verified_at: '2020-01-01T00:00:00.000Z',
      })
    ).toBe(false);
    expect(
      hasValidABN({
        abn,
        abn_status: 'UNVERIFIED',
        abn_verified_at: '2020-01-01T00:00:00.000Z',
      })
    ).toBe(false);
  });
});

describe('hasABNButNotVerified', () => {
  it('true when ABN present but not VERIFIED', () => {
    expect(hasABNButNotVerified({ abn, abn_status: 'UNVERIFIED' })).toBe(true);
  });

  it('false when verified', () => {
    expect(hasABNButNotVerified({ abn, abn_status: 'VERIFIED' })).toBe(false);
  });
});
