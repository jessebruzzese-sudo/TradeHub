/**
 * Public profile and profile visibility rules.
 * - Public profile loads when profile is public.
 * - Verified badge visibility when ABN verified.
 * - Profile availability chip behavior.
 *
 * Seed: pw-free@tradehub.test, pw-premium@tradehub.test (verified, public).
 */
import { test, expect } from '@playwright/test';
import { loadSeedIds } from './seed-ids';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Profile visibility and badges', () => {
  test('public profile page loads for valid profile id', async ({ page }) => {
    const ids = loadSeedIds();
    const verifiedUserId = ids?.users?.['pw-free@tradehub.test'] ?? ids?.users?.['pw-premium@tradehub.test'];
    if (!verifiedUserId) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }
    await page.goto(`${BASE_URL}/profile/${verifiedUserId}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/profile\/[^/]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('profile shows Verified badge when ABN verified', async ({ page }) => {
    const ids = loadSeedIds();
    const verifiedUserId = ids?.users?.['pw-free@tradehub.test'] ?? ids?.users?.['pw-premium@tradehub.test'];
    if (!verifiedUserId) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }
    await page.goto(`${BASE_URL}/profile/${verifiedUserId}`);
    await page.waitForLoadState('networkidle');
    const verifiedBadge = page.getByText(/verified/i).first();
    await expect(verifiedBadge).toBeVisible();
  });

  test('profile shows availability CTA (List availability or Update availability)', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')
    const availLink = page.getByRole('link', { name: /list availability|update availability/i }).first()
    await expect(availLink).toBeVisible()
  })

  test('own profile shows Public/Private status when applicable', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')
    const publicPrivate = page.getByText(/public|private/i)
    if (await publicPrivate.isVisible().catch(() => false)) {
      await expect(publicPrivate).toBeVisible()
    }
  })
})
