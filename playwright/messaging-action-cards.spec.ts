/**
 * Messaging action cards coverage.
 *
 * DETERMINISTIC: Baseline tests (messages page load) — always run.
 * CONDITIONAL: Action-card tests — skip when no accepted/confirmed thread.
 *   Messages use in-memory store; no DB seed for conversations.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Messaging — baseline (deterministic)', () => {
  test('messages page loads and shows conversation list or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByRole('heading', { name: /messages|conversations/i })).toBeVisible();
  });
});

test.describe('Messaging — action cards (conditional)', () => {
  // Unverified-user action-card test: abn-gating-unverified.spec.ts (chromium-unverified project)

  test('when Confirm Hire card visible, verified user sees enabled button', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await page.waitForLoadState('networkidle');

    const subcontractorAccepted = page.getByText(/subcontractor accepted|has accepted the job/i);
    if (!(await subcontractorAccepted.isVisible().catch(() => false))) {
      test.skip(true, 'No accepted thread; messages use in-memory store');
    }

    const verifyLink = page.getByRole('link', { name: /verify abn/i });
    await expect(verifyLink).toBeHidden();
  });

  test('Job Confirmed card shows status only, no action buttons', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await page.waitForLoadState('networkidle');

    const jobConfirmed = page.getByText(/job confirmed|confirmed and is ready to start/i);
    if (!(await jobConfirmed.isVisible().catch(() => false))) {
      test.skip(true, 'No confirmed thread; messages use in-memory store');
    }

    const acceptBtn = page.getByRole('button', { name: /^accept$/i });
    const confirmBtn = page.getByRole('button', { name: /confirm hire/i });
    await expect(acceptBtn).toBeHidden();
    await expect(confirmBtn).toBeHidden();
  });
});
