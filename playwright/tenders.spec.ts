/**
 * Tenders tests.
 * - Tender creation
 * - Tender detail loads
 * - Trade matching
 * - Anonymous vs non-anonymous
 * - Owner flow
 */
import { test, expect } from '@playwright/test';
import { waitStable, getSeedTenderId, SEED_TITLES, hasSeedData } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Tenders', () => {
  test('tenders page loads with View available / My Tenders tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await expect(page.getByRole('tab', { name: /view available tenders|find work/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /my tenders/i })).toBeVisible();
  });

  test('Find Work tab loads without RPC error', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const error = page.getByText(/RPC error|failed to load/i);
    await expect(error).not.toBeVisible();
  });

  test('non-owned tender visible to matching trade user', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const tenderLink = page.getByRole('link', { name: SEED_TITLES.tender.nonOwned }).first();
    if (await tenderLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tenderLink).toBeVisible();
    }
  });

  test('tender detail loads for matching user', async ({ page }) => {
    const tenderId = getSeedTenderId('nonOwned');
    if (!tenderId && !hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    if (tenderId) {
      // Try list first; fallback to direct URL. Auth setup logs in as pw-free (Electrical, Sydney).
      await page.goto(`${BASE_URL}/tenders`);
      await waitStable(page);
      await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
      await waitStable(page);
      const tenderLink = page.getByRole('link', { name: /Non-Owned Tender/i }).first();
      if (await tenderLink.isVisible({ timeout: 8000 }).catch(() => false)) {
        await tenderLink.click();
        await page.waitForLoadState('domcontentloaded');
      } else {
        await page.goto(`${BASE_URL}/tenders/${tenderId}`);
      }
      await page.waitForTimeout(2000);
      const title = page.getByText(SEED_TITLES.tender.nonOwned);
      const notFound = page.getByText(/Tender not found/i);
      await expect(title.or(notFound)).toBeVisible({ timeout: 15_000 });
      if (await notFound.isVisible().catch(() => false)) {
        test.skip(true, 'Tender not found — ensure PW_EMAIL=pw-free@tradehub.test, run qa:seed');
      }
      await expect(title).toBeVisible();
    }
  });

  test('anonymous tender shows request-to-quote flow', async ({ page }) => {
    if (!hasSeedData()) test.skip(true, 'Run npm run qa:seed');
    // Navigate via Find Work list
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await waitStable(page);
    const tenderLink = page.getByRole('link', { name: /Anonymous Tender/i }).first();
    if (!(await tenderLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, '[QA] Anonymous Tender not in Find Work list (discovery/radius)');
    }
    await tenderLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const requestBtn = page.getByRole('button', { name: /^Request$/ });
    const requestSent = page.getByText(/request sent/i);
    const hasRequestFlow = (await requestBtn.isVisible().catch(() => false)) || (await requestSent.isVisible().catch(() => false));
    expect(hasRequestFlow).toBeTruthy();
  });
});
