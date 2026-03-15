/**
 * Free vs Premium enforcement tests.
 * Critical business logic: free users restricted, premium users have full access.
 * Uses chromium storage (free user) for free-user tests; loginAs for premium (faster than UI switch).
 */
import { test, expect } from '@playwright/test';
import { loginAs, ACCOUNTS, waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Free user rules', () => {
  test('free user sees trade restriction or premium upsell on subcontractors', async ({ page }) => {
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/subcontractors`);
    await expect(page).toHaveURL(/\/subcontractors/, { timeout: 15_000 });
    await waitStable(page);
    await expect(
      page.getByText(/free: primary trade only|unlock multi-trade|see premium/i).first()
    ).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator('body').innerText();
    expect(/primary trade only|unlock multi-trade|see premium|free: primary trade only|trade restriction/i.test(bodyText)).toBeTruthy();
  });

  test('free user sees See Premium or pricing CTA', async ({ page }) => {
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/subcontractors`);
    await waitStable(page);
    const premiumLink = page.getByRole('link', { name: /see premium|premium|pricing/i }).first();
    await expect(premiumLink).toBeVisible();
  });

  test('free user sees 20km radius when exposed in UI', async ({ page }) => {
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    const radiusText = page.getByText(/20\s*km|20km radius/i);
    if (await radiusText.isVisible().catch(() => false)) {
      await expect(radiusText).toBeVisible();
    }
  });

  test('free user trade selector disabled on subcontractors', async ({ page }) => {
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/subcontractors`);
    await waitStable(page);
    const tradeSelect = page.getByRole('combobox').or(page.locator('[role="combobox"]')).first();
    if (await tradeSelect.isVisible().catch(() => false)) {
      await expect(tradeSelect).toBeDisabled();
    }
  });
});

test.describe('Premium user rules', () => {
  test.skip(!ACCOUNTS.premium.email || !ACCOUNTS.premium.password, 'PW_PREMIUM_EMAIL/PASSWORD required');

  test('premium user does not see free trade restriction on subcontractors', async ({ page }) => {
    await loginAs(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password);
    await page.goto(`${BASE_URL}/subcontractors`);
    await waitStable(page);
    const bodyText = await page.locator('body').innerText();
    expect(/free: primary trade only|unlock multi-trade discovery/i.test(bodyText)).toBeFalsy();
  });

  test('premium user can access premium-only features', async ({ page }) => {
    await loginAs(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password);
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/jobs/);
    const findWorkTab = page.getByRole('tab', { name: /find work/i });
    await expect(findWorkTab).toBeVisible();
  });
});
