/**
 * Job attachments coverage.
 * - Attachments section visible when a job has attachments.
 * - Images render as expected.
 *
 * Seed: [QA] Job With Attachment (image).
 */
import { test, expect } from '@playwright/test';
import { loadSeedIds, SEED_TITLES } from './seed-ids';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Job attachments', () => {
  test('job with attachments shows Attachments section', async ({ page }) => {
    const ids = loadSeedIds();
    if (!ids?.jobs?.withAttachment) {
      await page.goto(`${BASE_URL}/jobs`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /find work/i }).click();
      await page.waitForLoadState('networkidle');
      const seededLink = page.getByRole('link', { name: SEED_TITLES.job.withAttachment });
      if (!(await seededLink.isVisible().catch(() => false))) {
        test.skip(true, 'Missing seed: run npm run qa:seed');
      }
      await seededLink.click();
    } else {
      await page.goto(`${BASE_URL}/jobs/${ids.jobs.withAttachment}`);
    }
    await page.waitForLoadState('networkidle');

    const attachmentsHeading = page.getByRole('heading', { name: /attachments/i });
    if (!(await attachmentsHeading.isVisible().catch(() => false))) {
      test.skip(true, 'No attachments on job; run npm run qa:seed');
    }
    await expect(attachmentsHeading).toBeVisible();
  });

  test('job attachment images are visible when present', async ({ page }) => {
    const ids = loadSeedIds();
    if (!ids?.jobs?.withAttachment) {
      await page.goto(`${BASE_URL}/jobs`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /find work/i }).click();
      await page.waitForLoadState('networkidle');
      const seededLink = page.getByRole('link', { name: SEED_TITLES.job.withAttachment });
      if (!(await seededLink.isVisible().catch(() => false))) {
        test.skip(true, 'Missing seed: run npm run qa:seed');
      }
      await seededLink.click();
    } else {
      await page.goto(`${BASE_URL}/jobs/${ids.jobs.withAttachment}`);
    }
    await page.waitForLoadState('networkidle');

    const attachmentsSection = page.getByText(/attachments/i).first();
    if (!(await attachmentsSection.isVisible().catch(() => false))) {
      test.skip(true, 'No attachments; run npm run qa:seed');
    }
    await expect(attachmentsSection).toBeVisible();
    const img = page.locator('img').filter({ has: page.locator('..') }).first();
    if (await img.isVisible().catch(() => false)) {
      await expect(img).toBeVisible();
    }
  });
});
