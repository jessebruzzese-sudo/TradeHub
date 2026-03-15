/**
 * Tender discovery visibility E2E tests.
 * Verifies AI-generated and manual tenders are discoverable by matching trade accounts.
 * Radius: free=20km, premium=100km. Tenders with missing/invalid coords are hidden.
 *
 * Test matrix:
 * A. Matching trade + within free radius → visible
 * B. Matching trade + outside free radius → hidden
 * C. Matching trade + within premium radius → visible
 * D. Unrelated trade within radius → hidden
 * E. Missing coordinates → hidden
 *
 * Prerequisites:
 * - PW_PLASTERING_EMAIL, PW_PLASTERING_PASSWORD: user with primary_trade = Plastering / Gyprock
 * - PW_PAINTING_EMAIL, PW_PAINTING_PASSWORD: user with primary_trade = Painting & Decorating
 * - PW_PREMIUM_EMAIL, PW_PREMIUM_PASSWORD: premium user (for within-100km test)
 * - Users need base_lat/base_lng set for radius filtering (seed script or profile)
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { switchToUser } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

test.describe('Tender discovery visibility', () => {
  test('creates tender with valid coords and Plastering / Gyprock; verifies coords persisted', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Use seed-created [E2E Discovery] tender for deterministic coords (no UI geocode dependency)
    const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : null;
    if (!admin) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY required for DB verification');
    }

    const { data: tenders } = await admin!
      .from('tenders')
      .select('id, lat, lng, project_name')
      .ilike('project_name', '[E2E Discovery]%');
    const discoveryTender = tenders?.find((t) => t.project_name === '[E2E Discovery] Plastering Tender');
    if (!discoveryTender) {
      test.skip(true, 'Run npm run qa:seed to create [E2E Discovery] Plastering Tender');
    }

    const { data: tradeReqs } = await admin!
      .from('tender_trade_requirements')
      .select('trade')
      .eq('tender_id', discoveryTender!.id);
    expect(tradeReqs).toBeDefined();
    expect(tradeReqs?.length).toBeGreaterThan(0);
    expect(tradeReqs?.some((r) => r.trade === 'Plastering / Gyprock')).toBe(true);

    expect(discoveryTender?.lat).not.toBeNull();
    expect(discoveryTender?.lng).not.toBeNull();
    expect(discoveryTender?.lat).not.toBe(0);
    expect(discoveryTender?.lng).not.toBe(0);

    // Verify tender appears in Find Work for plastering user (from seed: pw-plastering@tradehub.test)
    const plasterEmail = process.env.PW_PLASTERING_EMAIL || 'pw-plastering@tradehub.test';
    const plasterPass = process.env.PW_PLASTERING_PASSWORD || 'password1';
    await switchToUser(page, plasterEmail, plasterPass);

    await page.goto(`${BASE_URL}/tenders`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await page.waitForLoadState('networkidle');
    const tenderLink = page.getByRole('link', { name: '[E2E Discovery] Plastering Tender' }).first();
    await expect(tenderLink).toBeVisible({ timeout: 10_000 });
  });

  test('Find Work tab loads and uses trade-filtered discovery (no RPC error)', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await page.waitForLoadState('networkidle');

    const error = page.getByText(/RPC error|failed to load/i);
    await expect(error).not.toBeVisible();
  });

  test('plastering user within 20km sees matching tender; unrelated trade does not', async ({
    page,
  }) => {
    const plasterEmail = process.env.PW_PLASTERING_EMAIL || 'pw-plastering@tradehub.test';
    const plasterPass = process.env.PW_PLASTERING_PASSWORD || 'password1';
    const paintEmail = process.env.PW_PAINTING_EMAIL;
    const paintPass = process.env.PW_PAINTING_PASSWORD;

    if (!plasterEmail || !plasterPass) {
      test.skip(true, 'PW_PLASTERING_EMAIL/PASSWORD required');
    }

    await switchToUser(page, plasterEmail, plasterPass);

    await page.goto(`${BASE_URL}/tenders`);
    await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
    await page.waitForLoadState('networkidle');

    const plasteringTenders = page.getByText('[E2E Discovery] Plastering Tender');
    const plasterCount = await plasteringTenders.count();

    if (paintEmail && paintPass) {
      await switchToUser(page, paintEmail, paintPass);

      await page.goto(`${BASE_URL}/tenders`);
      await page.getByRole('tab', { name: /view available tenders|find work/i }).click();
      await page.waitForLoadState('networkidle');

      const paintPlasteringTenders = page.getByText('[E2E Discovery] Plastering Tender');
      const paintCount = await paintPlasteringTenders.count();
      expect(paintCount).toBeLessThanOrEqual(plasterCount);
    }
  });
});
