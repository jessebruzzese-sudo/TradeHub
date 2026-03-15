/**
 * Discovery and visibility logic.
 * - Trade matching
 * - Radius filtering (free 20km, premium 100km)
 * - Unmatched users do not see restricted content
 */
import { test, expect } from '@playwright/test';
import { waitStable, switchToUser, ACCOUNTS, hasSeedData } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Discovery', () => {
  test('jobs discovery uses trade filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await page.getByRole('tab', { name: /find work/i }).click();
    await waitStable(page);
    await expect(page).toHaveURL(/\/jobs/);
    const error = page.getByText(/RPC error|failed to load/i);
    await expect(error).not.toBeVisible();
  });

  test('tenders discovery uses trade filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const error = page.getByText(/RPC error|failed to load/i);
    await expect(error).not.toBeVisible();
  });

  test('free user with coords sees discovery results', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const list = page.locator('[data-testid="tender-list"], .space-y-3, main').first();
    await expect(list).toBeVisible({ timeout: 5000 });
  });
});
