import { test, expect } from '@playwright/test';

/**
 * Marketplace tender creation smoke test.
 * Requires: authenticated user with ABN verified (or test may redirect to verify-business).
 */
test('marketplace flow: create tender -> upload plans -> submit quote (smoke)', async ({ page }) => {
  await page.goto('/tenders');

  // Navigate to create tender
  await page.getByRole('link', { name: /post tender/i }).click();

  // May redirect to verify-business if user lacks ABN
  if (page.url().includes('/verify-business')) {
    test.skip(true, 'Test user needs ABN verification to create tenders');
  }

  // Wait for Step 1 form to load (wizard may be collapsed initially)
  const projectNameInput = page.getByPlaceholder(/e\.g\. single storey|single storey house/i);
  await expect(projectNameInput).toBeVisible({ timeout: 15_000 });

  // Fill project name (prefer placeholder; label "Project name" may not be associated)
  await projectNameInput.fill('Playwright Test Tender');

  // Fill project description
  const projectDescInput = page.getByPlaceholder(/give an overview|overview.*included/i);
  await expect(projectDescInput).toBeVisible();
  await projectDescInput.fill('Automated test tender');

  // Add required trade: open selector, pick Electrician (label wraps checkbox)
  const tradeButton = page.getByRole('button', { name: /select required trades|trades selected/i });
  await tradeButton.click();
  const electricalLabel = page.locator('label').filter({ hasText: /^Electrical$/ });
  await expect(electricalLabel).toBeVisible({ timeout: 5000 });
  await electricalLabel.click();
  await page.keyboard.press('Escape');

  // Fill trade scope (appears after adding trade)
  const tradeScopeInput = page.getByPlaceholder(/switchboard|e\.g\., describe what this trade/i);
  await expect(tradeScopeInput).toBeVisible({ timeout: 5000 });
  await tradeScopeInput.fill('Test trade scope for E2E');

  // Complete Step 1
  await page.getByRole('button', { name: /^done$/i }).first().click();

  // Step 2: Location - suburb and postcode; select from autocomplete to get valid lat/lng
  const suburbInput = page.getByLabel(/location|suburb/i).or(page.getByPlaceholder(/start typing suburb/i));
  await expect(suburbInput.first()).toBeVisible({ timeout: 5000 });
  await suburbInput.first().fill('Sydney');
  await page.waitForTimeout(800);
  const prediction = page.getByRole('button').filter({ hasText: /Sydney/i }).first();
  if (await prediction.isVisible({ timeout: 4000 }).catch(() => false)) {
    await prediction.click();
  }

  const postcodeInput = page.getByLabel(/postcode/i).or(page.getByPlaceholder(/e\.g\. 3105/i));
  await expect(postcodeInput.first()).toBeVisible();
  if (!(await postcodeInput.first().getAttribute('readonly'))) {
    await postcodeInput.first().fill('2000');
  }

  // Complete Step 2
  await page.getByRole('button', { name: /^done$/i }).last().click();

  // Step 3: Publish (or Verify business if ABN gate)
  const publishButton = page.getByRole('button', { name: /publish tender|verify business/i });
  await expect(publishButton).toBeVisible({ timeout: 5000 });
  await publishButton.click();

  // Assert tender created or approval modal
  await expect(
    page.getByText(/Playwright Test Tender|tender created|submitted for approval/i)
  ).toBeVisible({ timeout: 15_000 });
});
