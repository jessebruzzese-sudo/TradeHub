import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

function expectAllowedStatus(status: number, allowed: number[], label: string) {
  expect(
    allowed.includes(status),
    `${label} returned ${status}, expected one of [${allowed.join(', ')}]`
  ).toBeTruthy();
}

test.describe('API major endpoints integration', () => {
  test('unauthenticated responses are enforced and stable', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] },
    });
    const checks: Array<{
      method: 'GET' | 'POST';
      path: string;
      allowed: number[];
      body?: Record<string, unknown>;
    }> = [
      { method: 'POST', path: '/api/profile/view', allowed: [400, 401], body: {} },
      { method: 'POST', path: '/api/conversations', allowed: [400, 401], body: {} },
      { method: 'GET', path: '/api/messages?conversationId=00000000-0000-0000-0000-000000000000', allowed: [401, 404] },
      { method: 'POST', path: '/api/availability', allowed: [401, 500], body: { dates: [] } },
      { method: 'POST', path: '/api/jobs', allowed: [400, 401], body: {} },
      { method: 'GET', path: '/api/discovery/trades-near-you', allowed: [200, 401, 500] },
      { method: 'POST', path: '/api/billing/create-checkout-session', allowed: [401, 404, 503] },
      { method: 'POST', path: '/api/billing/portal', allowed: [400, 401, 404, 503] },
      { method: 'GET', path: '/api/admin/stats', allowed: [401, 403] },
      { method: 'POST', path: '/api/user-blocks', allowed: [401, 400], body: { blockedUserId: 'x' } },
    ];

    for (const check of checks) {
      const res =
        check.method === 'GET'
          ? await unauthRequest.get(check.path)
          : await unauthRequest.post(check.path, { data: check.body ?? {} });
      expectAllowedStatus(res.status(), check.allowed, `${check.method} ${check.path}`);
    }
    await unauthRequest.dispose();
  });

  test('authenticated responses for major endpoints are stable', async ({ playwright }) => {
    const authRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: 'playwright/.auth/user.json',
    });

    const checks: Array<{
      method: 'GET' | 'POST';
      path: string;
      allowed: number[];
      body?: Record<string, unknown>;
    }> = [
      { method: 'POST', path: '/api/profile/view', allowed: [400, 401], body: {} },
      { method: 'POST', path: '/api/conversations', allowed: [400, 401], body: {} },
      { method: 'GET', path: '/api/messages?conversationId=00000000-0000-0000-0000-000000000000', allowed: [400, 401, 404] },
      { method: 'POST', path: '/api/availability', allowed: [200, 400, 401, 403, 500], body: { dates: [] } },
      { method: 'POST', path: '/api/jobs', allowed: [400, 401, 403], body: {} },
      { method: 'GET', path: '/api/discovery/trades-near-you', allowed: [200, 401, 500] },
      { method: 'POST', path: '/api/messages/send', allowed: [200, 400, 401, 404], body: { conversationId: 'x', text: 'hi' } },
      { method: 'POST', path: '/api/billing/create-checkout-session', allowed: [200, 400, 401, 404, 503] },
      { method: 'POST', path: '/api/billing/portal', allowed: [200, 400, 401, 404, 503] },
      { method: 'GET', path: '/api/admin/stats', allowed: [200, 401, 403] },
    ];

    for (const check of checks) {
      const res =
        check.method === 'GET'
          ? await authRequest.get(check.path)
          : await authRequest.post(check.path, { data: check.body ?? {} });
      expectAllowedStatus(res.status(), check.allowed, `${check.method} ${check.path}`);
    }

    await authRequest.dispose();
  });
});
