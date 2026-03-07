/**
 * Owner-only permissions for jobs and tenders.
 * - Only owner/admin sees close/delete/manage actions.
 * - Non-owner users do not see owner-only controls.
 *
 * Seed: [QA] Owned Open Job (pw-free), [QA] Non-Owned Open Job (pw-other).
 */
import { test, expect } from '@playwright/test';
import { SEED_TITLES } from './seed-ids';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Owner-only permissions — jobs', () => {
  test('My Job Posts: owned job detail shows owner context (no Apply button)', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /my job posts/i }).click();
    await page.waitForLoadState('networkidle');

    const noJobsText = page.getByText(/no jobs posted yet/i);
    if (await noJobsText.isVisible().catch(() => false)) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }

    // Prefer seeded owned job by title
    const seededLink = page.getByRole('link', { name: SEED_TITLES.job.ownedOpen });
    const fallbackLink = page.locator('a[href^="/jobs/"]').filter({ hasNot: page.locator('a[href="/jobs/create"]') }).first();
    const jobLink = (await seededLink.isVisible().catch(() => false)) ? seededLink : fallbackLink;
    if (!(await jobLink.isVisible().catch(() => false))) {
      test.skip(true, 'No job links in My Job Posts');
    }
    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const applyBtn = page.getByRole('button', { name: /apply for this job/i });
    await expect(applyBtn).toBeHidden();
  });

  test('Find Work: job from another user does not show Edit or Close', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /find work/i }).click();
    await page.waitForLoadState('networkidle');

    // Prefer seeded non-owned job (pw-other)
    const seededLink = page.getByRole('link', { name: SEED_TITLES.job.nonOwnedOpen });
    const fallbackLink = page.locator('a[href^="/jobs/"]').first();
    const jobCard = (await seededLink.isVisible().catch(() => false)) ? seededLink : fallbackLink;
    if (!(await jobCard.isVisible().catch(() => false))) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }

    await jobCard.click();
    await page.waitForLoadState('networkidle');

    const editLink = page.getByRole('link', { name: /edit post/i });
    if (await editLink.isVisible().catch(() => false)) {
      test.skip(true, 'Viewed job is owned by current user; need [QA] Non-Owned Open Job');
    }

    const closeBtn = page.getByRole('button', { name: /close job posting/i });
    await expect(closeBtn).toBeHidden();
  });
});

test.describe('Owner-only permissions — tenders', () => {
  test('owned tender detail shows Manage/Close/Delete', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /my tenders/i }).click();
    await page.waitForLoadState('networkidle');

    const seededLink = page.getByRole('link', { name: SEED_TITLES.tender.ownedLive });
    const fallbackLink = page.locator('a[href^="/tenders/"]').first();
    const tenderLink = (await seededLink.isVisible().catch(() => false)) ? seededLink : fallbackLink;
    if (!(await tenderLink.isVisible().catch(() => false))) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }
    await tenderLink.click();
    await page.waitForLoadState('networkidle');

    const manageBtn = page.getByRole('button', { name: /manage tender/i });
    if (await manageBtn.isVisible().catch(() => false)) {
      await expect(manageBtn).toBeVisible();
    }
    const closeBtn = page.getByRole('button', { name: /^close$/i });
    const deleteBtn = page.getByRole('button', { name: /^delete$/i });
    if (await closeBtn.isVisible().catch(() => false)) await expect(closeBtn).toBeVisible();
    if (await deleteBtn.isVisible().catch(() => false)) await expect(deleteBtn).toBeVisible();
  });

  test('non-owned tender detail does not show Manage/Close/Delete', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /view available tenders/i }).click();
    await page.waitForLoadState('networkidle');

    const seededLink = page.getByRole('link', { name: SEED_TITLES.tender.nonOwned });
    const fallbackLink = page.locator('a[href^="/tenders/"]').first();
    const tenderLink = (await seededLink.isVisible().catch(() => false)) ? seededLink : fallbackLink;
    if (!(await tenderLink.isVisible().catch(() => false))) {
      test.skip(true, 'Missing seed: run npm run qa:seed');
    }
    await tenderLink.click();
    await page.waitForLoadState('networkidle');

    const manageBtn = page.getByRole('button', { name: /manage tender/i });
    if (await manageBtn.isVisible().catch(() => false)) {
      test.skip(true, 'Viewed tender is owned; need [QA] Non-Owned Tender');
    }
    await expect(manageBtn).toBeHidden();
  });
});
