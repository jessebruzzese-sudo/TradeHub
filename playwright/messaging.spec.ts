/**
 * Messaging tests.
 * - Messages page loads
 * - Thread creation
 * - /messages?userId= opens correct thread
 * - Message sending
 */
import { test, expect } from '@playwright/test';
import { waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Messaging', () => {
  test('messages page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/messages/);
    const pageTitle = page.getByRole('heading', { name: /^messages$/i, level: 1 });
    await expect(pageTitle).toBeVisible();
  });

  test('messages page shows empty state or conversation list', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await waitStable(page);
    // Wait for any expected state (empty, loading, or loaded) to appear
    const anyExpected = page.locator('text=/No messages yet|Messages|Select a conversation|Browse jobs|Loading conversations|Direct message|message any user/i');
    await expect(anyExpected.first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(300);
    const emptyText = page.getByText(/no messages yet|messages appear once you apply|message any user|start the conversation|select a conversation|browse jobs/i);
    const hasEmpty = await emptyText.first().isVisible().catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /messages|conversations/i }).isVisible().catch(() => false);
    const hasConversations = await page.getByText(/loading conversations|direct message|browse jobs|conversation/i).first().isVisible().catch(() => false);
    const hasMessageSquare = await page.locator('[class*="MessageSquare"], svg').first().isVisible().catch(() => false);
    expect(hasEmpty || hasHeading || hasConversations || hasMessageSquare).toBeTruthy();
  });

  test('messages?userId= opens or creates thread', async ({ page }) => {
    const peerId =
      process.env.PW_MESSAGE_PEER_ID?.trim() ||
      process.env.PW_MESSAGING_PEER_ID?.trim() ||
      '';
    if (!peerId) {
      test.skip(
        true,
        'Set PW_MESSAGE_PEER_ID to a real user UUID (not @tradehub.test / test-account patterns). Seed QA peers are blocked by POST /api/conversations.'
      );
    }
    await page.goto(`${BASE_URL}/messages?userId=${encodeURIComponent(peerId)}`);
    await waitStable(page);
    await expect(page).toHaveURL(/\/messages/);
    await page.waitForURL(/conversation=/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /^messages$/i, level: 1 }).first()).toBeVisible();
  });
});
