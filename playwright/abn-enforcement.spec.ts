/**
 * ABN verification enforcement.
 * - Verified users can perform gated actions
 * - Unverified users can browse
 * - Unverified users can create jobs; apply may still require ABN
 */
import { test, expect } from '@playwright/test';
import { waitStable, switchToUser, ACCOUNTS } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('ABN enforcement (verified user)', () => {
  test('can browse jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('sees Post Job CTA', async ({ page }) => {
    await switchToUser(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password);
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    const postJobLink = page.getByRole('link', { name: /post job/i });
    await expect(postJobLink.first()).toBeVisible();
    await expect(postJobLink.first()).toHaveAttribute('href', /\/jobs\/create/);
  });

});
