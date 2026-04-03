/**
 * Profile strength UI: zero scores, breakdown, and null-safe defaults.
 * Uses non-production fixtures at /profiles/test-user-* (see src/lib/e2e/profile-strength-fixtures.ts).
 * Legacy /profile/[id] redirects to /profiles/[id].
 */
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

async function openProfileStrengthPanel(page: Page) {
  await page.getByRole('button', { name: /Profile strength/i }).click();
}

test.describe('Profile strength', () => {
  test('renders profile strength for new user (0 score)', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/test-user-0`);
    await expect(page).toHaveURL(/\/profiles\/test-user-0/);

    const strength = page.getByTestId('profile-strength');
    await expect(strength).toBeVisible();
    await expect(strength.getByRole('heading', { name: 'Profile strength' }).first()).toBeVisible();
    await expect(page.getByTestId('profile-strength-total').first()).toHaveText('0');
    await expect(page.getByTestId('profile-strength-band').first()).toHaveText('LOW');

    await openProfileStrengthPanel(page);
    await expect(page.getByRole('heading', { name: 'Score breakdown' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Improve your score' })).toBeVisible();
  });

  test('renders profile strength for active user', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles/test-user-45`);
    await expect(page.getByTestId('profile-strength-total').first()).toHaveText('45');

    await openProfileStrengthPanel(page);
    const strength = page.getByTestId('profile-strength');
    await expect(page.getByTestId('profile-strength-bar')).toBeVisible();
    await expect(strength.getByText('Activity', { exact: true })).toBeVisible();
    await expect(strength.getByText('Links', { exact: true })).toBeVisible();
  });

  test('E2E fixture still exposes profile strength UI for anonymous Playwright runs', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/test-user-0`);
    const section = page.getByTestId('profile-strength');
    await expect(section).toBeVisible();
  });

  test('handles null profile strength safely', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles/test-user-null`);
    await expect(page.getByTestId('profile-strength')).toBeVisible();
    await expect(page.getByTestId('profile-strength-total').first()).toHaveText('0');
  });
});
