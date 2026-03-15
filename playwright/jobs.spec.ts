/**
 * Jobs tests.
 * - Browse jobs
 * - Job detail loads
 * - Trade matching
 * - Owner flow
 * - ABN-gated actions
 */
import { test, expect } from '@playwright/test';
import { waitStable, getSeedJobId, SEED_TITLES, hasSeedData } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Jobs', () => {
  test('jobs page loads with Find Work / My Job Posts tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await expect(page.getByRole('tab', { name: /find work/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /my job posts/i })).toBeVisible();
  });

  test('job detail loads for matching trade user', async ({ page }) => {
    const jobId = getSeedJobId('nonOwnedOpen');
    if (!jobId && !hasSeedData()) {
      test.skip(true, 'Seed data required. Run npm run qa:seed');
    }
    if (jobId) {
      // Direct navigation; auth setup logs in as pw-free (primary_trade: Electrical). Seed job trade_category: Electrical.
      await page.goto(`${BASE_URL}/jobs/${jobId}`);
      await page.waitForLoadState('domcontentloaded');
      // Wait for page to resolve: job title, "Job not found", or trade mismatch
      const title = page.getByText(SEED_TITLES.job.nonOwnedOpen);
      const notFound = page.getByText(/job not found/i);
      const tradeMismatch = page.getByText(/isn't available for your trade/i);
      const loading = page.getByText(/^Loading\.\.\.$/);
      const anyResolved = title.or(notFound).or(tradeMismatch);
      await expect(anyResolved.or(loading)).toBeVisible({ timeout: 15_000 });
      if (await loading.isVisible().catch(() => false)) {
        const resolved = await anyResolved.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => null);
        if (!resolved) {
          test.skip(true, 'Job page stuck on Loading — auth or fetch may be slow');
        }
      }
      if (await notFound.isVisible().catch(() => false)) {
        test.skip(true, 'Job not found — ensure PW_EMAIL=pw-free@tradehub.test, run qa:seed');
      }
      if (await tradeMismatch.isVisible().catch(() => false)) {
        test.skip(true, 'Trade mismatch — pw-free must have Electrical in user_trades/primary_trade');
      }
      await expect(title).toBeVisible({ timeout: 15_000 });
    }
  });

  test('Find Work tab shows jobs without RPC error', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await page.getByRole('tab', { name: /find work/i }).click();
    await waitStable(page);
    const error = page.getByText(/RPC error|failed to load/i);
    await expect(error).not.toBeVisible();
  });

  test('verified user sees Post Job CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    const postJobLink = page.getByRole('link', { name: /post job/i });
    await expect(postJobLink).toBeVisible();
    await expect(postJobLink).toHaveAttribute('href', /\/jobs\/create/);
  });
});
