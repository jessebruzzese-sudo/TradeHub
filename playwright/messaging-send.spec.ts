/**
 * End-to-end: open a direct thread and invoke POST /api/messages/send.
 *
 * Seeded QA users use @tradehub.test emails; the API treats them as restricted recipients,
 * so send often returns 403 RECIPIENT_RESTRICTED. That still proves the client → API path works.
 *
 * For a greenfield "message delivered" assertion, set PW_MESSAGE_PEER_ID to a UUID whose
 * users.email is not a test pattern (see src/lib/test-account.ts).
 */
import { test, expect } from '@playwright/test';
import { waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Messaging send', () => {
  test('direct thread: composer send hits API (200 or recipient restricted)', async ({ page }) => {
    const peerId = process.env.PW_MESSAGE_PEER_ID?.trim() || process.env.PW_MESSAGING_PEER_ID?.trim() || '';
    if (!peerId) {
      test.skip(
        true,
        'Set PW_MESSAGE_PEER_ID to a user UUID you can message (non-test-account email). Seeded @tradehub.test users cannot start threads via API.'
      );
    }

    await page.goto(`${BASE_URL}/messages?userId=${encodeURIComponent(peerId)}`);
    await waitStable(page, 300);

    await expect(page).toHaveURL(/\/messages/, { timeout: 15_000 });
    await page.waitForURL(/conversation=/, { timeout: 30_000 });

    const input = page.getByPlaceholder('Type a message...');
    await expect(input).toBeVisible({ timeout: 20_000 });
    await expect(input).toBeEnabled({ timeout: 10_000 });

    const body = `e2e-send-${Date.now()}`;
    const sendRespPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/messages/send') &&
        r.request().method() === 'POST' &&
        r.request().resourceType() === 'fetch',
      { timeout: 25_000 }
    );
    await input.fill(body);
    await input.press('Enter');

    const response = await sendRespPromise;
    const status = response.status();
    const json = await response.json().catch(() => ({} as Record<string, unknown>));

    if (status === 200) {
      expect(json.ok).toBeTruthy();
      await expect(page.getByText(body, { exact: false })).toBeVisible({ timeout: 10_000 });
      return;
    }

    if (status === 403 && json.code === 'RECIPIENT_RESTRICTED') {
      expect(String(json.error || '')).toBeTruthy();
      return;
    }

    throw new Error(`Unexpected send response: ${status} ${JSON.stringify(json)}`);
  });
});
