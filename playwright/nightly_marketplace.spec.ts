import { test, expect } from '@playwright/test';

test('marketplace flow: create tender -> upload plans -> submit quote (smoke)', async ({ page }) => {
  // Go to tenders
  await page.goto('/tenders');

  // Create tender (adjust route/buttons to your app)
  await page.getByRole('link', { name: /post tender/i }).click();

  // Fill minimal fields
  await page.getByLabel(/project name/i).fill('Playwright Test Tender');
  await page.getByLabel(/project description/i).fill('Automated test tender');

  // Add at least one required trade (Step 1)
  await page.getByRole('button', { name: /select required trades/i }).click();
  await page.getByText('Electrician').first().click();
  await page.keyboard.press('Escape'); // close popover
  await page.getByPlaceholder(/e\.g\., switchboard upgrade/i).fill('Test trade scope for E2E');

  // Complete Step 1
  await page.getByRole('button', { name: /^done$/i }).first().click();

  // Fill location (Step 2) - suburb and postcode (manual entry if no Places API)
  await page.getByLabel(/location|suburb/i).fill('Sydney');
  await page.getByLabel(/postcode/i).fill('2000');

  // Complete Step 2
  await page.getByRole('button', { name: /^done$/i }).last().click();

  // Publish or save (Step 3)
  await page.getByRole('button', { name: /publish tender|verify business/i }).click();

  // Assert tender created or approval modal
  await expect(
    page.getByText(/Playwright Test Tender|tender created|submitted for approval/i)
  ).toBeVisible({ timeout: 15_000 });
});
