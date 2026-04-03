/**
 * Regression: public profile must not show a false "Profile not found" when the directory view
 * misses but `users` fallback (or owner bypass) would succeed.
 *
 * The profile route is server-rendered; Playwright cannot intercept Supabase. When
 * `loadPublicProfileForPage` honors `?__e2e_public_profile=…` (and optional `__e2e_viewer`) for a
 * single synthetic UUID only in non-production (see `public-profile-search-params.ts`).
 */
import { expect, test } from '@playwright/test';

/** Must match `E2E_PUBLIC_PROFILE_REGRESSION_ID` in `src/lib/e2e/public-profile-search-params.ts`. */
const REGRESSION_PROFILE_ID = '00000000-0000-4000-8000-00000000e2e01';
const OTHER_VIEWER_ID = '22222222-2222-4222-8222-222222222222';

/** RSC reads these when `E2E_PUBLIC_PROFILE_LOADER=1` (Playwright webServer). */
function e2eProfileQuery(scenario: string, viewer?: string | null): string {
  const p = new URLSearchParams();
  p.set('__e2e_public_profile', scenario);
  if (viewer !== undefined) {
    p.set('__e2e_viewer', viewer === null ? '_' : viewer);
  }
  return `?${p.toString()}`;
}

test.describe('Public profile loading fallback (regression)', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      !!process.env.PW_BASE_URL,
      'Synthetic E2E profile seam is not available against a remote PW_BASE_URL target'
    );
  });

  test('loads public profile when directory view misses but users fallback succeeds', async ({ page }) => {
    await page.goto(`/profile/${REGRESSION_PROFILE_ID}${e2eProfileQuery('dir_miss_users_public')}`);
    await expect(page).toHaveURL(new RegExp(`/profiles/${REGRESSION_PROFILE_ID}(\\?.*)?$`, 'i'));

    await expect(page.getByTestId('profile-not-found')).toHaveCount(0);
    await expect(page.getByTestId('public-profile-page')).toBeVisible();
    await expect(page.getByTestId('profile-name')).toContainText('Jesse Bruzzese');
    await expect(page.getByTestId('profile-strength')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Profile not found' })).toHaveCount(0);
  });

  test('shows not found when user is absent from both directory and users fallback', async ({ page }) => {
    await page.goto(`/profiles/${REGRESSION_PROFILE_ID}${e2eProfileQuery('both_miss')}`);

    await expect(page.getByTestId('profile-not-found')).toBeVisible();
    await expect(page.getByTestId('public-profile-page')).toHaveCount(0);
  });

  test('private profile still loads for owner through owner-only fallback', async ({ page }) => {
    await page.goto(
      `/profile/${REGRESSION_PROFILE_ID}${e2eProfileQuery('owner_private_ok', REGRESSION_PROFILE_ID)}`
    );

    await expect(page.getByTestId('profile-not-found')).toHaveCount(0);
    await expect(page.getByTestId('public-profile-page')).toBeVisible();
    await expect(page.getByTestId('profile-name')).toContainText('Private Owner Fixture');
    await expect(page.getByTestId('profile-strength')).toBeVisible();
  });

  test('private profile does not load for non-owner', async ({ page }) => {
    await page.goto(
      `/profiles/${REGRESSION_PROFILE_ID}${e2eProfileQuery('non_owner_private', OTHER_VIEWER_ID)}`
    );

    await expect(page.getByTestId('profile-not-found')).toBeVisible();
    await expect(page.getByTestId('public-profile-page')).toHaveCount(0);
  });
});
