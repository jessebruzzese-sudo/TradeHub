import { test, expect } from '@playwright/test';

test('loads homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TradeHub/i);
});

test('logged in user can open dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText(/dashboard|welcome back/i).first()).toBeVisible({ timeout: 15_000 });
});
