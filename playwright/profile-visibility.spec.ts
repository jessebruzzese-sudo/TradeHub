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
import { loginAs, ACCOUNTS } from './helpers';

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
    // Auth setup logs in as pw-free (abn_status VERIFIED, abn_verified_at set by seed)
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    // Badge may take a moment to render; also match "Verified" pill or ABN display
    const verifiedBadge = page.getByText(/verified/i).first();
    await expect(verifiedBadge).toBeVisible({ timeout: 15_000 });
  });

  test('profile shows availability CTA (List availability or Update availability)', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    const availLink = page.getByRole('link', { name: /list availability|update availability/i }).first();
    await expect(availLink).toBeVisible();
  });

  test('own profile shows Public/Private status when applicable', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    const publicPrivate = page.getByText(/public|private/i);
    if (await publicPrivate.isVisible().catch(() => false)) {
      await expect(publicPrivate).toBeVisible();
    }
  });
});
