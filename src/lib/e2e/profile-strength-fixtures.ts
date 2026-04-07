import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';

/**
 * Deterministic public-profile payloads for Playwright (non-production only).
 * Routes: `/profiles/test-user-0`, `test-user-45`, `test-user-null` (redirects from `/profile/...`).
 */
export const E2E_PROFILE_STRENGTH_IDS = ['test-user-0', 'test-user-45', 'test-user-null'] as const;

export type E2EProfileStrengthId = (typeof E2E_PROFILE_STRENGTH_IDS)[number];

export function isE2EProfileStrengthFixtureId(id: string): id is E2EProfileStrengthId {
  return (E2E_PROFILE_STRENGTH_IDS as readonly string[]).includes(id);
}

const baseProfile = {
  name: 'Fixture Trade User',
  business_name: 'Fixture Plumbing Co',
  avatar: null,
  cover_url: null,
  location: 'Melbourne',
  postcode: '3000',
  mini_bio: 'Fixture profile for automated tests.',
  bio: 'This is a fixture bio used only in non-production E2E tests for profile strength.',
  rating: 4.2,
  reliability_rating: 4,
  completed_jobs: 2,
  member_since: '2024-01-01',
  abn_status: null,
  abn_verified_at: null,
  premium_now: false,
  website: null,
  instagram: null,
  facebook: null,
  linkedin: null,
  tiktok: null,
  youtube: null,
  abn: null,
  trades: ['Plumbing'],
  is_public_profile: true,
};

export function getE2EProfileStrengthFixture(id: E2EProfileStrengthId): {
  profile: Record<string, unknown>;
  strengthCalc: ProfileStrengthCalc | null;
} {
  if (id === 'test-user-0') {
    return {
      profile: {
        ...baseProfile,
        id: 'test-user-0',
        profile_strength_score: 0,
        profile_strength_band: 'LOW',
        last_active_at: null,
      },
      strengthCalc: {
        total: 0,
        band: 'LOW',
        activity: 0,
        links: 0,
        google: 0,
        likes: 0,
        completeness: 0,
        abn: 0,
        inactive_days: 0,
      },
    };
  }

  if (id === 'test-user-45') {
    return {
      profile: {
        ...baseProfile,
        id: 'test-user-45',
        profile_strength_score: 45,
        profile_strength_band: 'MEDIUM',
        last_active_at: new Date().toISOString(),
      },
      strengthCalc: {
        total: 45,
        band: 'MEDIUM',
        activity: 15,
        links: 12,
        google: 8,
        likes: 5,
        completeness: 3,
        abn: 2,
        inactive_days: 2,
      },
    };
  }

  // test-user-null — no strengthCalc; UI uses client fallback (must stay 0: no trade/bio/location so completeness+links don't inflate)
  return {
    profile: {
      ...baseProfile,
      id: 'test-user-null',
      profile_strength_band: 'LOW',
      last_active_at: null,
      last_seen_at: null,
      updated_at: null,
      created_at: null,
      bio: null,
      mini_bio: null,
      location: null,
      trades: [],
      primary_trade: null,
    },
    strengthCalc: null,
  };
}
