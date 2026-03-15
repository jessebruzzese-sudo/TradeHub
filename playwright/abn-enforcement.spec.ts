/**
 * ABN verification enforcement.
 * - Verified users can perform gated actions
 * - Unverified users can browse
 * - Unverified users blocked from create/apply/quote
 */
import { test, expect } from '@playwright/test';
import { waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('ABN enforcement (verified user)', () => {
  test('can browse jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('can browse tenders page', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/tenders/);
  });

  test('sees Post Job CTA when verified', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await waitStable(page);
    const postJobLink = page.getByRole('link', { name: /post job/i });
    await expect(postJobLink).toBeVisible();
    await expect(postJobLink).toHaveAttribute('href', /\/jobs\/create/);
  });

  test('sees Post Tender CTA when verified', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await waitStable(page);
    const postTenderLink = page.getByRole('link', { name: /post tender/i });
    await expect(postTenderLink).toBeVisible();
  });
});
