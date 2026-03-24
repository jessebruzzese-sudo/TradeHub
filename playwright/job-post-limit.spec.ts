import { test, expect } from '@playwright/test';
import { loginAs, ACCOUNTS } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const LIMIT_MESSAGE =
  'Free accounts can post 1 job every 30 days. Upgrade to Premium for unlimited job posting.';

function makeJobPayload(tradeCategory: string) {
  const now = Date.now();
  return {
    title: `PW Limit Test ${now}`,
    description: 'Playwright test job for free-tier posting limit enforcement.',
    trade_category: tradeCategory,
    location: 'Sydney NSW',
    postcode: '2000',
    dates: [new Date(now + 24 * 60 * 60 * 1000).toISOString()],
    start_time: '08:00',
    duration: 1,
    pay_type: 'fixed',
    rate: 1000,
    location_place_id: `pw-limit-${now}`,
    location_lat: -33.8688,
    location_lng: 151.2093,
  };
}

const TRADE_CANDIDATES = [
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Tiling',
  'Roofing',
  'Landscaping',
  'Concreting',
  'Plastering',
  'Bricklaying',
];

test.describe('Job posting limit enforcement', () => {
  test('free account cannot post more than one job in 30 days', async ({ page }) => {
    await loginAs(page, ACCOUNTS.poster.email, ACCOUNTS.poster.password);

    const limitRes = await page.request.get(`${BASE_URL}/api/jobs/post-limit`);
    expect(limitRes.ok()).toBeTruthy();
    const limitData = await limitRes.json();
    expect(limitData.unlimited).toBeFalsy();
    const used = Number(limitData.usedInWindow ?? 0);

    const postJob = (trade: string) =>
      page.request.post(`${BASE_URL}/api/jobs`, {
        data: makeJobPayload(trade),
      });

    /** First POST that succeeds (consumes free slot). */
    async function postFirstAllowedJob(): Promise<string> {
      for (const trade of TRADE_CANDIDATES) {
        const res = await postJob(trade);
        const body = await res.json().catch(() => ({}));
        const err = String(body?.error ?? '');

        if (/verify your abn/i.test(err)) {
          test.skip(true, 'Posting test account is ABN-gated; cannot validate post limit.');
        }

        if (res.ok()) {
          return trade;
        }

        if (res.status() === 403 && err.includes(LIMIT_MESSAGE)) {
          throw new Error(
            'POST limit returned before first successful job; check /api/jobs/post-limit vs job_post_events.'
          );
        }

        if (res.status() === 403 && /listed trade\(s\)/i.test(err)) {
          continue;
        }

        throw new Error(`Unexpected POST /api/jobs for trade "${trade}": ${res.status()} ${err}`);
      }
      throw new Error('No candidate trade matched this account’s listed trades.');
    }

    if (used >= 1) {
      for (const trade of TRADE_CANDIDATES) {
        const res = await postJob(trade);
        const body = await res.json().catch(() => ({}));
        const err = String(body?.error ?? '');

        if (/verify your abn/i.test(err)) {
          test.skip(true, 'Posting test account is ABN-gated; cannot validate post limit.');
        }

        if (res.status() === 403 && err.includes(LIMIT_MESSAGE)) {
          return;
        }

        if (res.status() === 403 && /listed trade\(s\)/i.test(err)) {
          continue;
        }

        if (res.ok()) {
          throw new Error(
            'Expected free-tier limit block when usedInWindow >= 1, but POST succeeded.'
          );
        }

        throw new Error(`Unexpected POST /api/jobs when at limit for trade "${trade}": ${res.status()} ${err}`);
      }
      throw new Error('Could not observe free-tier limit (403) with any candidate trade.');
    }

    // used < 1 — first successful POST consumes the free slot in this window.
    const trade = await postFirstAllowedJob();

    const second = await postJob(trade);
    expect(second.status()).toBe(403);
    const data = await second.json();
    expect(String(data?.error ?? '')).toContain(LIMIT_MESSAGE);
  });
});
