/**
 * Regression: profile strength hero total / progress / band must stay aligned with
 * visible breakdown category points (canonical sum in UI).
 *
 * Requires real credentials:
 *   PW_EMAIL, PW_PASSWORD
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.PW_EMAIL ?? '';
const PASSWORD = process.env.PW_PASSWORD ?? '';

async function login(page: Page) {
  test.skip(!EMAIL || !PASSWORD, 'Set PW_EMAIL and PW_PASSWORD for profile strength E2E test');

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).not.toHaveURL(/login/);
}

async function readCategoryPoints(page: Page): Promise<number> {
  const ids = [
    'profile-strength-activity',
    'profile-strength-links',
    'profile-strength-google-rating',
    'profile-strength-likes',
    'profile-strength-completeness',
    'profile-strength-abn-verification',
  ] as const;

  let sum = 0;
  for (const id of ids) {
    const raw = (await page.getByTestId(id).innerText()).trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid points for ${id}: "${raw}"`);
    }
    sum += n;
  }
  return sum;
}

test.describe('Profile strength consistency (logged-in)', () => {
  test('hero total equals sum of visible breakdown category points', async ({ page }) => {
    await login(page);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile\/?$/);

    const section = page.getByTestId('profile-strength');
    await expect(section).toBeVisible({ timeout: 30_000 });

    const headerTotal = page.getByTestId('profile-strength-total').first();
    await expect(headerTotal).toBeVisible();
    const totalFromHeader = parseInt((await headerTotal.innerText()).trim(), 10);
    expect(Number.isFinite(totalFromHeader)).toBeTruthy();

    await page.getByRole('button', { name: /Profile strength/i }).click();

    await expect(page.getByTestId('profile-strength-activity')).toBeVisible({ timeout: 15_000 });

    const sumBreakdown = await readCategoryPoints(page);
    expect(totalFromHeader).toBe(sumBreakdown);

    const expandedTotals = page.getByTestId('profile-strength-total');
    await expect(expandedTotals).toHaveCount(2);
    await expect(expandedTotals.nth(1)).toHaveText(String(sumBreakdown));

    const progress = page.getByTestId('profile-strength-progress');
    await expect(progress).toBeVisible();
    if (sumBreakdown > 0) {
      const progressWidth = await progress.evaluate((el) => window.getComputedStyle(el).width);
      expect(progressWidth).not.toMatch(/^0px$/);
    }
  });
});
