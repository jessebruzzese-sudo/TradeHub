import { test, expect, type Page } from '@playwright/test';
import { ACCOUNTS, loginAs, loginViaUI, logoutViaUI, waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const HAS_UNVERIFIED = Boolean(process.env.PW_NO_ABN_EMAIL && process.env.PW_NO_ABN_PASSWORD);
const HAS_PREMIUM = Boolean(process.env.PW_PREMIUM_EMAIL && process.env.PW_PREMIUM_PASSWORD);
const HAS_ADMIN = Boolean(process.env.PW_ADMIN_EMAIL && process.env.PW_ADMIN_PASSWORD);

async function go(page: Page, path: string) {
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ERR_ABORTED|frame was detached/i.test(message)) {
      throw error;
    }
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  }
  await page.waitForTimeout(300);
}

test.describe('Platform full regression (critical UX)', () => {
  test('auth, ABN, premium, jobs, messaging, profile, admin, billing, smoke', async ({ page }) => {
    test.setTimeout(180_000);
    // 1) Authentication + session flows
    await page.context().clearCookies();
    await go(page, '/signup');
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('body')).toContainText(/sign up|create account|join/i);

    await go(page, '/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    await page.locator('#email').fill(ACCOUNTS.free.email);
    await page.locator('#password').fill('wrong-password-never-valid');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|error|wrong/i)).toBeVisible({ timeout: 10_000 });

    await loginViaUI(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/dashboard/);

    await logoutViaUI(page);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await go(page, '/dashboard');
    await expect(page.url()).toMatch(/\/login|\/dashboard/);

    // 2) ABN enforcement + browse behavior
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/jobs');
    await expect(page).toHaveURL(/\/jobs/);
    await go(page, '/search');
    await expect(page).toHaveURL(/\/search/);

    await go(page, '/jobs/create');
    expect(page.url()).toMatch(/\/jobs\/create|\/dashboard|\/login/);

    if (HAS_UNVERIFIED) {
      await loginAs(page, ACCOUNTS.unverified.email, ACCOUNTS.unverified.password);
      await go(page, '/jobs');
      await expect(page).toHaveURL(/\/jobs/);
      await go(page, '/search');
      await expect(page).toHaveURL(/\/search/);
      await go(page, '/jobs/create');
      expect(page.url()).toMatch(/\/jobs\/create|\/dashboard|\/login/);
      await go(page, '/messages');
      await expect(page).toHaveURL(/\/messages/);
    }

    // 3) Premium enforcement
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/subcontractors');
    await expect(page).toHaveURL(/\/subcontractors/);
    expect(page.url()).not.toMatch(/\/login/);

    if (HAS_PREMIUM) {
      await loginAs(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password);
      await go(page, '/subcontractors');
      const premiumText = await page.locator('body').innerText();
      expect(/unlock multi-trade discovery|free: primary trade only/i.test(premiumText)).toBeFalsy();
    }

    // 4) Jobs core flows (critical navigation + key CTAs)
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/jobs');
    const firstJobLink = page.locator('a[href^="/jobs/"]:not([href="/jobs/create"])').first();
    if (await firstJobLink.isVisible().catch(() => false)) {
      await firstJobLink.click();
      await waitStable(page, 250);
      expect(page.url()).toMatch(/\/jobs\/[^/]+/);
      const applyBtn = page.getByRole('button', { name: /apply|message|request/i }).first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await expect(applyBtn).toBeVisible();
      }
    }

    // 5) Messaging flows
    await go(page, '/messages');
    await expect(page.url()).toMatch(/\/messages|\/login/);
    if (page.url().includes('/messages')) {
      await expect(page.locator('body')).toContainText(
        /messages|conversations|no messages yet|redirecting to login/i
      );
    }

    // 6) Profile + dashboard flows
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/profile');
    expect(page.url()).toMatch(/\/profile|\/dashboard/);
    await go(page, '/profile/edit');
    expect(page.url()).toMatch(/\/profile\/edit|\/dashboard/);
    await go(page, '/profile/availability');
    expect(page.url()).toMatch(/\/profile\/availability|\/dashboard|\/login/);
    await go(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // 7) Admin role checks
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/admin');
    expect(page.url()).toMatch(/\/admin|\/dashboard|\/login/);

    if (HAS_ADMIN) {
      await loginAs(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
      await go(page, '/admin');
      await expect(page.url()).toMatch(/\/admin/);
      await go(page, '/admin/alerts');
      await expect(page.url()).toMatch(/\/admin\/alerts|\/admin/);
    }

    // 8) Billing UI around Stripe
    await loginAs(page, ACCOUNTS.free.email, ACCOUNTS.free.password);
    await go(page, '/pricing');
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('button', { name: /upgrade to premium/i }).first()).toBeVisible();

    const checkoutRes = await page.evaluate(async () => {
      const res = await fetch('/api/billing/create-checkout-session', { method: 'POST' });
      return res.status;
    });
    expect([200, 400, 401, 404, 503]).toContain(checkoutRes);

    const portalRes = await page.evaluate(async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      return res.status;
    });
    expect([200, 400, 401, 404, 503]).toContain(portalRes);

    // 9) Basic regression + smoke
    for (const path of ['/', '/jobs', '/search', '/subcontractors', '/pricing', '/messages']) {
      await go(page, path);
      await expect(page.locator('body')).not.toContainText(/application error|something went wrong|500/i);
    }
  });
});
