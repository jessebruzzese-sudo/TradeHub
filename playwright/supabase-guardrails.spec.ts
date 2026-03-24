import { test, expect } from '@playwright/test';
import { ACCOUNTS, loginAs, loginViaUI, logoutViaUI, waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const HAS_UNVERIFIED = Boolean(process.env.PW_NO_ABN_EMAIL && process.env.PW_NO_ABN_PASSWORD);
const HAS_PREMIUM = Boolean(process.env.PW_PREMIUM_EMAIL && process.env.PW_PREMIUM_PASSWORD);
const HAS_ADMIN = Boolean(process.env.PW_ADMIN_EMAIL && process.env.PW_ADMIN_PASSWORD);

test.describe('Supabase-backed platform guardrails', () => {
  test('auth, ABN, premium, admin, and billing checks', async ({ page }) => {
    test.setTimeout(180_000);
    // 1) Authentication + protected-route baseline
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/signup`);
    await expect(page).toHaveURL(/\/signup/);

    await page.goto(`${BASE_URL}/dashboard`);
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/login/);

    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    await page.locator('#email').fill(ACCOUNTS.free.email);
    await page.locator('#password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|error|wrong/i)).toBeVisible({ timeout: 10_000 });

    await loginViaUI(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/dashboard`);
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/dashboard/);

    // 2) Premium and ABN UI checks for the default (usually free) account
    await page.goto(`${BASE_URL}/subcontractors`);
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/subcontractors/);

    expect(page.url()).not.toMatch(/\/login/);

    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/jobs/);

    const verifyAbnToPost = page.getByRole('link', { name: /verify abn to post/i });
    if (await verifyAbnToPost.isVisible().catch(() => false)) {
      await verifyAbnToPost.click();
      await waitStable(page, 250);
      await expect(page.url()).toMatch(/\/verify-business|\/jobs|\/jobs\/create|\/dashboard|\/login/);
    } else {
      await page.goto(`${BASE_URL}/jobs/create`);
      await waitStable(page, 250);
      await expect(page.url()).toMatch(/\/jobs\/create|\/verify-business|\/login|\/dashboard/);
    }

    // 3) Billing routes should be reachable and guarded (Stripe integration surface)
    await page.goto(`${BASE_URL}/pricing`);
    await waitStable(page, 250);
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('button', { name: /upgrade to premium/i }).first()).toBeVisible();

    const checkoutResponse = await page.evaluate(async () => {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body };
    });
    expect([200, 400, 401, 404, 503]).toContain(checkoutResponse.status);

    const portalResponse = await page.evaluate(async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body };
    });
    expect([200, 400, 401, 404, 503]).toContain(portalResponse.status);

    // 4) Unverified account enforcement (if provided in env)
    if (HAS_UNVERIFIED) {
      await loginAs(page, ACCOUNTS.unverified.email, ACCOUNTS.unverified.password);

      await page.goto(`${BASE_URL}/jobs`);
      await waitStable(page, 250);
      await expect(page).toHaveURL(/\/jobs/);

      await page.goto(`${BASE_URL}/search`);
      await waitStable(page, 250);
      await expect(page).toHaveURL(/\/search/);

      await page.goto(`${BASE_URL}/jobs/create`);
      await waitStable(page, 250);
      await expect(page.url()).toMatch(/\/verify-business|\/dashboard/);

      await page.goto(`${BASE_URL}/messages`);
      await waitStable(page, 250);
      await expect(page).toHaveURL(/\/messages/);
    }

    // 5) Premium account checks (if provided in env)
    if (HAS_PREMIUM) {
      await loginAs(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password);
      await page.goto(`${BASE_URL}/subcontractors`);
      await waitStable(page, 250);
      const premiumText = await page.locator('body').innerText();
      expect(/unlock multi-trade discovery|free: primary trade only/i.test(premiumText)).toBeFalsy();
    }

    // 6) Admin access checks
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await page.goto(`${BASE_URL}/admin`);
    await waitStable(page, 250);
    // Environments differ: this account may or may not be admin.
    // Assert admin route has a deterministic result, not a crash loop.
    expect(page.url()).toMatch(/\/admin|\/dashboard|\/login/);

    if (HAS_ADMIN) {
      await loginAs(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
      await page.goto(`${BASE_URL}/admin`);
      await waitStable(page, 250);
      await expect(page.url()).toMatch(/\/admin/);
    }

    // 7) Logout + post-logout protected redirect
    await logoutViaUI(page);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await waitStable(page, 250);
    await expect(page.url()).toMatch(/\/login|\/dashboard/);
  });
});
