import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const QA_FREE_EMAIL = 'pw-free@tradehub.test';
const QA_PREMIUM_EMAIL = 'pw-premium@tradehub.test';
const QA_PASSWORD = 'password1';

type ApiResult = {
  status: number;
  location: string | null;
  json: unknown;
  text: string | null;
};

async function postFromPage(page: Page, path: string): Promise<ApiResult> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  return page.evaluate(async (targetPath) => {
    const res = await fetch(targetPath, { method: 'POST' });
    const location = res.headers.get('location');
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      status: res.status,
      location,
      json,
      text: text || null,
    };
  }, path);
}

test.describe('Stripe smoke (minimal reliable surface)', () => {
  test('A) unauthenticated checkout request is rejected', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.post('/api/billing/create-checkout-session');
    const location = res.headers()['location'] ?? null;
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    console.log(
      `[stripe-smoke][unauth-checkout] status=${res.status()} location=${location ?? 'none'} body=${text || '<empty>'}`
    );
    expect([401, 503]).toContain(res.status());
    await unauthRequest.dispose();
  });

  test('B) authenticated verified free user can create checkout session', async ({ page }) => {
    await loginAs(page, QA_FREE_EMAIL, QA_PASSWORD);
    const result = await postFromPage(page, '/api/billing/create-checkout-session');

    console.log(
      `[stripe-smoke][free-checkout] status=${result.status} location=${result.location ?? 'none'} body=${result.text || '<empty>'}`
    );
    expect(result.status).toBe(200);
    expect(
      typeof (result.json as { url?: unknown } | null)?.url === 'string' &&
        ((result.json as { url: string }).url.startsWith('http://') ||
          (result.json as { url: string }).url.startsWith('https://'))
    ).toBeTruthy();
  });

  test('C) authenticated premium user can create billing portal session', async ({ page }) => {
    await loginAs(page, QA_PREMIUM_EMAIL, QA_PASSWORD);
    let result = await postFromPage(page, '/api/billing/portal');

    // Minimal self-heal for seeded premium users that exist but lack stripe_customer_id.
    if (
      result.status === 400 &&
      typeof (result.json as { error?: unknown } | null)?.error === 'string' &&
      ((result.json as { error: string }).error.includes('No billing account found') ||
        (result.text || '').includes('No billing account found'))
    ) {
      const checkoutBootstrap = await postFromPage(page, '/api/billing/create-checkout-session');
      console.log(
        `[stripe-smoke][premium-bootstrap-checkout] status=${checkoutBootstrap.status} location=${checkoutBootstrap.location ?? 'none'} body=${checkoutBootstrap.text || '<empty>'}`
      );
      result = await postFromPage(page, '/api/billing/portal');
    }

    console.log(
      `[stripe-smoke][premium-portal] status=${result.status} location=${result.location ?? 'none'} body=${result.text || '<empty>'}`
    );
    expect(result.status).toBe(200);
    expect(
      typeof (result.json as { url?: unknown } | null)?.url === 'string' &&
        (result.json as { url: string }).url.includes('stripe.com')
    ).toBeTruthy();
  });
});
