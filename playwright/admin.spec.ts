/**
 * Admin smoke checks.
 * - Admin can access admin pages
 * - No 404 on known admin routes
 */
import { test, expect } from '@playwright/test';
import { switchToUser, waitStable, ACCOUNTS } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Admin', () => {
  test.skip(!ACCOUNTS.admin.email || !ACCOUNTS.admin.password, 'PW_ADMIN_EMAIL/PASSWORD required');
  test.skip(!process.env.PW_ADMIN_EMAIL, 'Admin account must be seeded. Run npm run qa:seed');

  test('admin can access admin dashboard', async ({ page }) => {
    await switchToUser(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await page.goto(`${BASE_URL}/admin`);
    await waitStable(page);
    await expect(page).not.toHaveURL(/404|not-found/);
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin users page loads', async ({ page }) => {
    await switchToUser(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await page.goto(`${BASE_URL}/admin/users`);
    await waitStable(page);
    await expect(page).not.toHaveURL(/404|not-found/);
  });

  test('admin jobs page loads', async ({ page }) => {
    await switchToUser(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await page.goto(`${BASE_URL}/admin/jobs`);
    await waitStable(page);
    await expect(page).not.toHaveURL(/404|not-found/);
  });
});
