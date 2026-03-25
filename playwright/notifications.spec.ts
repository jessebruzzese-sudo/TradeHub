/**
 * Notifications tests.
 * - Notification badge
 * - Notifications page
 * - In-app notifications list / bell
 */
import { test, expect } from '@playwright/test';
import { waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Notifications', () => {
  test('notifications page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/notifications/);
    const heading = page.getByRole('heading', { name: /notifications/i }).first();
    await expect(heading).toBeVisible();
  });

  test('notifications page shows empty state or notification list', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitStable(page);
    const emptyText = page.getByText(/no notifications yet/i);
    const hasEmpty = await emptyText.isVisible().catch(() => false);
    // Page has no main; when notifications exist, "Mark all as read" button is visible
    const hasList = await page.getByRole('button', { name: /mark all as read/i }).isVisible().catch(() => false);
    expect(hasEmpty || hasList).toBeTruthy();
  });

  test('notification bell link exists in nav', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitStable(page);
    const bellLink = page.locator('a[href="/notifications"]').or(page.getByRole('link', { name: /notification/i }));
    await expect(bellLink.first()).toBeVisible();
  });
});
