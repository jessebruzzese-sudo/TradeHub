import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

const PUBLIC_USER_ID = process.env.PW_PUBLIC_PROFILE_ID ?? '';
const PRIVATE_USER_ID = process.env.PW_PRIVATE_PROFILE_ID ?? '';
const MISSING_USER_ID =
  process.env.PW_MISSING_PROFILE_ID ?? '00000000-0000-0000-0000-000000000000';
const JOB_ID = process.env.PW_JOB_ID ?? '';
/** Default local QA account; override with PW_EMAIL / PW_PASSWORD in CI or other envs. */
const EMAIL = process.env.PW_EMAIL ?? 'test123@test.com';
const PASSWORD = process.env.PW_PASSWORD ?? 'password1';

const NEXT_404 = 'This page could not be found.';
const PROFILE_HREF_RE = /^\/profiles\/[0-9a-f-]+$/i;

function profilesPathSuffix(id: string): RegExp {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`/profiles/${escaped}$`, 'i');
}

/** Public /profiles/* tests must run logged out; link tests log in explicitly. */
test.use({ storageState: { cookies: [], origins: [] } });

async function loginIfNeeded(page: Page) {
  if (!EMAIL?.trim() || !PASSWORD) {
    test.skip(true, 'Set PW_EMAIL and PW_PASSWORD for authenticated routing tests');
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).not.toHaveURL(/login/);
}

test.describe('TradeHub public profile routing', () => {
  test('public profile page loads at /profiles/[id]', async ({ page }) => {
    if (!PUBLIC_USER_ID) {
      test.skip(true, 'Set PW_PUBLIC_PROFILE_ID to a user with a public directory row');
    }

    await page.goto(`${BASE_URL}/profiles/${PUBLIC_USER_ID}`);
    await expect(page).toHaveURL(profilesPathSuffix(PUBLIC_USER_ID));

    await expect(page.getByText(NEXT_404, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('profile-not-found')).toHaveCount(0);

    await expect(
      page.getByText(/member since|profile strength|about|reviews/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('legacy /profile/[id] redirects to /profiles/[id]', async ({ page }) => {
    if (!PUBLIC_USER_ID) {
      test.skip(true, 'Set PW_PUBLIC_PROFILE_ID');
    }

    await page.goto(`${BASE_URL}/profile/${PUBLIC_USER_ID}`);
    await expect(page).toHaveURL(profilesPathSuffix(PUBLIC_USER_ID));
  });

  test('/users/[id] redirects to /profiles/[id]', async ({ page }) => {
    if (!PUBLIC_USER_ID) {
      test.skip(true, 'Set PW_PUBLIC_PROFILE_ID');
    }

    await page.goto(`${BASE_URL}/users/${PUBLIC_USER_ID}`);
    await expect(page).toHaveURL(profilesPathSuffix(PUBLIC_USER_ID));
  });

  test('missing user shows friendly empty state, not Next.js 404', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles/${MISSING_USER_ID}`);
    await expect(page).toHaveURL(profilesPathSuffix(MISSING_USER_ID));

    await expect(page.getByText(NEXT_404, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('profile-not-found')).toBeVisible();
  });

  test('private user shows friendly empty state, not Next.js 404', async ({ page }) => {
    if (!PRIVATE_USER_ID) {
      test.skip(true, 'Set PW_PRIVATE_PROFILE_ID to a real user id that is not in public_profile_directory');
    }

    await page.goto(`${BASE_URL}/profiles/${PRIVATE_USER_ID}`);
    await expect(page).toHaveURL(profilesPathSuffix(PRIVATE_USER_ID));

    await expect(page.getByText(NEXT_404, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('profile-not-found')).toBeVisible();
  });

  test('search results include a profile link under /profiles/[id]', async ({ page }) => {
    await loginIfNeeded(page);

    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle').catch(() => {});

    const firstProfileLink = page.locator('a[href^="/profiles/"]').first();
    const count = await firstProfileLink.count();
    if (count === 0) {
      test.skip(true, 'No search results with /profiles/ links — seed or adjust filters');
    }

    const href = await firstProfileLink.getAttribute('href');
    expect(href, 'search profile link href').toMatch(PROFILE_HREF_RE);
  });

  test('jobs detail “View profile” link points to /profiles/[id]', async ({ page }) => {
    await loginIfNeeded(page);

    if (!JOB_ID) {
      test.skip(true, 'Set PW_JOB_ID to an existing job the test user can open');
    }

    await page.goto(`${BASE_URL}/jobs/${JOB_ID}`);
    await page.waitForLoadState('networkidle').catch(() => {});

    const viewProfile = page.getByRole('link', { name: /view profile/i }).first();
    if ((await viewProfile.count()) === 0) {
      test.skip(true, 'No “View profile” link on this job detail page (e.g. job not found or no poster)');
    }

    const href = await viewProfile.getAttribute('href');
    expect(href, 'jobs View profile href').toMatch(PROFILE_HREF_RE);
  });

  test('messages “View profile” link points to /profiles/[id] when present', async ({ page }) => {
    await loginIfNeeded(page);

    await page.goto(`${BASE_URL}/messages`);
    await page.waitForLoadState('networkidle').catch(() => {});

    const viewProfile = page.getByRole('link', { name: /view profile/i }).first();
    if ((await viewProfile.count()) === 0) {
      test.skip(true, 'No “View profile” link in messages — no conversation with profile link in seed');
    }

    const href = await viewProfile.getAttribute('href');
    expect(href, 'messages View profile href').toMatch(PROFILE_HREF_RE);
  });
});
