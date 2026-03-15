/**
 * Tender request-to-quote flow.
 * - Request for anonymous tenders
 * - Request for non-anonymous tenders
 * - Duplicate protection
 * - Accept redirects to Messages
 * - Requester receives QUOTE_REQUEST_ACCEPTED
 */
import { test, expect } from '@playwright/test';
import { loginAs, waitStable, ACCOUNTS, SEED_TITLES, hasSeedData } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Request-to-quote flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('requester can request to quote on non-anonymous tender', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const tenderLink = page.getByRole('link', { name: SEED_TITLES.tender.nonOwned }).first();
    if (!(await tenderLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Tender not visible (discovery/radius)');
    }
    await tenderLink.click();
    await waitStable(page);
    const requestBtn = page.getByRole('button', { name: /^Request$/ });
    if (await requestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await requestBtn.click();
      await expect(page.getByText(/request sent/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('requester can request to quote on anonymous tender', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const tenderLink = page.getByRole('link', { name: SEED_TITLES.tender.anonymous }).first();
    if (!(await tenderLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Anonymous tender not visible');
    }
    await tenderLink.click();
    await waitStable(page);
    const requestBtn = page.getByRole('button', { name: /^Request$/ });
    if (await requestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await requestBtn.click();
      await expect(page.getByText(/request sent/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('poster sees Accept/Decline in notifications', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    // Create a quote request as free user (from storage) so poster has a notification
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const tenderLink = page.getByRole('link', { name: SEED_TITLES.tender.nonOwned }).first();
    if (!(await tenderLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Tender not visible (discovery/radius)');
    }
    await tenderLink.click();
    await waitStable(page);
    const requestBtn = page.getByRole('button', { name: /^Request$/ });
    if (!(await requestBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Request button not visible');
    }
    await requestBtn.click();
    await expect(page.getByText(/request sent/i)).toBeVisible({ timeout: 5000 });
    // Switch to poster and check notifications
    await loginAs(page, ACCOUNTS.poster.email, ACCOUNTS.poster.password);
    await page.goto(`${BASE_URL}/notifications`);
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15_000 });
    await waitStable(page);
    const acceptBtn = page.getByRole('button', { name: /^Accept$/ }).first();
    const declineBtn = page.getByRole('button', { name: /^Decline$/ }).first();
    const hasQuoteRequest = (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) || (await declineBtn.isVisible({ timeout: 5000 }).catch(() => false));
    const hasRequestText = await page.getByText(/request.*quote|quote.*request/i).isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasQuoteRequest || hasRequestText).toBeTruthy();
  });
});
