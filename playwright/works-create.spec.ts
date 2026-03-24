/**
 * Completed Works — create flow (/works/create).
 * - Auth gate (redirect to login)
 * - Form UI and validation
 * - Happy path: upload image + publish (requires Supabase + storage; same as local dev)
 */
import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import { waitStable } from './helpers';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

/** Minimal valid 1×1 PNG for upload tests. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('works/create (authenticated)', () => {
  test('shows Add completed work form and navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await expect(page.getByRole('heading', { name: /add completed work/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /description/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^publish$/i })).toBeVisible();

    const back = page.getByRole('link', { name: /back to completed works/i });
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute('href', '/works');

    const cancel = page.getByRole('link', { name: /cancel/i });
    await expect(cancel).toHaveAttribute('href', '/works');
  });

  test('submit without title shows validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await expect(page.getByRole('heading', { name: /add completed work/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /^publish$/i }).click();
    await expect(page.getByText('Please add a title.')).toBeVisible({ timeout: 10_000 });
  });

  test('submit with title only does not POST (description required)', async ({ page }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await expect(page.getByRole('heading', { name: /add completed work/i })).toBeVisible({
      timeout: 20_000,
    });
    let previousWorkPosts = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/profile/previous-work')) {
        previousWorkPosts += 1;
      }
    });
    await page.locator('#cw-title').fill('PW validation title');
    await page.getByRole('button', { name: /^publish$/i }).click();
    await page.evaluate(() => undefined);
    expect(previousWorkPosts).toBe(0);
    await expect(page).toHaveURL(/\/works\/create$/);
  });

  test('submit with title and description but no images does not POST', async ({ page }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await expect(page.getByRole('heading', { name: /add completed work/i })).toBeVisible({
      timeout: 20_000,
    });
    let previousWorkPosts = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/profile/previous-work')) {
        previousWorkPosts += 1;
      }
    });
    await page.locator('#cw-title').fill('PW validation title');
    await page.locator('#cw-caption').fill('PW validation description body.');
    await page.getByRole('button', { name: /^publish$/i }).click();
    await page.evaluate(() => undefined);
    expect(previousWorkPosts).toBe(0);
    await expect(page).toHaveURL(/\/works\/create$/);
  });

  test('can attach a PNG and publish, then lands on completed works with success', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await expect(page.getByRole('heading', { name: /add completed work/i })).toBeVisible({
      timeout: 20_000,
    });

    const unique = `PW E2E ${Date.now()}`;
    await page.locator('#cw-title').fill(unique);
    await page.locator('#cw-caption').fill('Playwright completed-work body.');

    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await fileInput.setInputFiles({
      name: 'pw-test.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    await page.getByRole('button', { name: /^publish$/i }).click();

    await expect(page).toHaveURL(/\/works/, { timeout: 45_000 });
    await waitStable(page);
    await expect(page.getByRole('heading', { name: /completed works/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(unique, { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('works/create (unauthenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to login with returnUrl', async ({ page }) => {
    await page.goto(`${BASE_URL}/works/create`);
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('returnUrl')).toBe('/works/create');
  });
});
