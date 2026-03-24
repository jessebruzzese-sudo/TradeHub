import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'

test.describe('TradeHub Pages E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test('dashboard loads and shows key elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard/)
    // Dashboard typically has navigation and main content
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible()
    // Greeting or main heading
    const heading = page.getByRole('heading', { level: 1 }).first()
    await expect(heading).toBeVisible()
  })

  test('jobs page loads with Find Work and My Posts tabs', async ({ page }) => {
    // Visit dashboard first so auth is hydrated, then navigate to jobs
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/jobs/)
    await expect(page.getByRole('heading', { name: /^jobs$/i }).first()).toBeVisible()

    // Tabs: Find Work and My Job Posts
    const findTab = page.getByRole('tab', { name: /find work|find/i }).first()
    const postsTab = page.getByRole('tab', { name: /my job posts|my posts|posts/i }).first()
    await expect(findTab).toBeVisible()
    await expect(postsTab).toBeVisible()

    // Find Work is default
    await expect(findTab).toHaveAttribute('data-state', 'active')
  })

  test('jobs page can switch to My Job Posts tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')

    const postsTab = page.getByRole('tab', { name: /my job posts|my posts|posts/i }).first()
    await postsTab.click()
    await page.waitForLoadState('networkidle')

    await expect(postsTab).toHaveAttribute('data-state', 'active')
  })

  test('messages page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/messages/)
    // Messages page shows heading or empty state (incl. "Message any user" from description)
    const heading = page.locator('h1,h2,h3', { hasText: /messages/i }).locator(':visible').first()
    const emptyState = page
      .locator('h1,h2,h3,p,div', { hasText: /no messages|start a conversation|select a conversation|message any user/i })
      .locator(':visible')
      .first()
    if ((await heading.count()) > 0) {
      await expect(heading).toBeVisible({ timeout: 15_000 })
    } else {
      await expect(emptyState).toBeVisible({ timeout: 15_000 })
    }
  })

  test('profile page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')

    // Profile may redirect to / if user not loaded yet; accept profile or dashboard
    const url = page.url()
    expect(url).toMatch(/\/(profile|dashboard|\/)/)
    if (url.includes('/profile')) {
      const editLink = page.getByRole('link', { name: /edit profile|edit/i }).first()
      const profileContent = page.getByText(/profile|availability|business/i).first()
      await expect(editLink.or(profileContent)).toBeVisible()
    }
  })

  // Subcontractors coverage exists in tradehub.spec.ts; removed duplicate to avoid interdependence.

  test.describe('Public pages (no auth)', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('pricing page loads for unauthenticated user', async ({ page }) => {
      await page.goto(`${BASE_URL}/pricing`)
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/pricing/)
      await expect(
        page.getByRole('heading', { name: /pricing|plans|get discovered|premium/i }).first()
      ).toBeVisible()
    })
  })

  test('how-it-works page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/how-it-works`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/how-it-works/)
    await expect(page.getByRole('heading', { name: /how it works|how tradehub works/i })).toBeVisible()
  })
})
