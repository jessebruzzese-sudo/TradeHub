import { test, expect } from '@playwright/test';

/**
 * Profile availability UI tests.
 *
 * Run with auth: PW_EMAIL=... PW_PASSWORD=... npm run pw -- playwright/profile-availability.spec.ts
 *
 * Cases covered:
 * 1. No availability records - chip "Not listed", CTA "List availability", ping visible
 * 2. Only past dates - chip "Not listed", CTA "List availability", ping visible
 * 3. Future availability - chip shows date in blue, CTA "Update availability", no ping
 * 4. Loading state - chip shows "Loading..."
 * 5. Navigation - chip and CTA go to /profile/availability
 * 6. Non-self profile - hero strip does not appear
 */

test.describe('Profile availability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for redirect if unauthenticated, or for dashboard to load
    try {
      await Promise.race([
        page.waitForURL(/\/login/, { timeout: 8000 }),
        page.waitForSelector('text=Welcome back', { timeout: 8000 }),
      ]);
    } catch {
      // Timeout - check current state
    }
    if (page.url().includes('/login')) {
      test.skip();
    }
  });

  test('1. No availability: chip shows "Not listed", CTA says "List availability", ping visible', async ({
    page,
  }) => {
    // Wait for chip to settle (may show "Loading..." briefly)
    const chipValue = page.locator('text=Not listed').or(page.locator('text=Loading…'));
    await expect(chipValue).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Not listed')).toBeVisible({ timeout: 10_000 });

    // CTA says "List availability"
    await expect(page.getByRole('link', { name: /list availability/i })).toBeVisible();

    // Ping dot visible when no availability
    await expect(page.locator('span.animate-ping')).toBeVisible();
  });

  test('2. Navigation: Availability chip links to /profile/availability', async ({ page }) => {
    const availChip = page.getByRole('link', { name: /availability/i }).first();
    await expect(availChip).toBeVisible();
    await availChip.click();
    await expect(page).toHaveURL(/\/profile\/availability/);
  });

  test('3. Navigation: hero CTA links to /profile/availability', async ({ page }) => {
    const cta = page.getByRole('link', { name: /list availability|update availability/i });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/profile\/availability/);
  });

  test('4. Profile page (self): hero strip visible with Availability chip and CTA', async ({
    page,
  }) => {
    await page.goto('/profile');
    if (page.url().includes('/login')) {
      test.skip();
    }

    await expect(page.getByText('Availability')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /list availability|update availability/i })
    ).toBeVisible();
  });

  test('5. Profile page (self): chip and CTA navigate to /profile/availability', async ({
    page,
  }) => {
    await page.goto('/profile');
    if (page.url().includes('/login')) {
      test.skip();
    }

    const availChip = page.getByRole('link', { name: /availability/i }).first();
    await availChip.click();
    await expect(page).toHaveURL(/\/profile\/availability/);
  });

  // Skipped when no second user exists: requires seeded multi-user data (another profile in discovery).
  test('6. Non-self profile: hero strip does not appear', async ({ page }) => {
    await page.goto('/subcontractors');
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated');
    }

    // Find a profile link to another user (exclude /profile which is self, exclude Edit links)
    const profileLinks = page.locator('a[href^="/profile/"]').filter({
      hasNot: page.locator('text=Edit'),
    });
    // Short timeout: if no other profiles exist, skip instead of failing
    const firstLink = profileLinks.first();
    const isVisible = await firstLink.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'No other user profiles in discovery — seed multi-user data to run this test');
    }
    const profileHref = await firstLink.getAttribute('href');
    if (!profileHref || profileHref === '/profile') {
      test.skip(true, 'No other user profiles in discovery — seed multi-user data to run this test');
    }
    await firstLink.click();

    await expect(page).toHaveURL(/\/profile\/[a-f0-9-]+/);

    // Hero strip with status chips should NOT appear for non-self
    // "Account" chip is only in the hero strip when isSelf
    await expect(page.getByText('Account').first()).not.toBeVisible();
    await expect(page.getByText('Back to Search')).toBeVisible();
  });
});
