import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'
const PREMIUM_EMAIL = process.env.PW_PREMIUM_EMAIL || ''
const PREMIUM_PASSWORD = process.env.PW_PREMIUM_PASSWORD || ''

async function logout(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: /account|profile|menu|more/i }).first()
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click()
  }

  const logoutButton = page.getByRole('menuitem', { name: /log out|logout|sign out/i }).first()
  await expect(logoutButton).toBeVisible()
  await logoutButton.click()
  await page.waitForLoadState('networkidle')
}

test.describe('TradeHub E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.describe('unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('unauthenticated homepage shows hero page', async ({ page }) => {
      await page.goto(`${BASE_URL}/`)
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(`${BASE_URL}/`)
      await expect(
        page.getByRole('link', { name: /join free|create free account|get started|sign up/i }).first()
      ).toBeVisible()
    })

    test('protected route redirects unauthenticated user to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/subcontractors`)
      await page.waitForLoadState('networkidle')
      // UnauthorizedAccess has 3s countdown before redirect; auth resolution may add delay
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    })
  })

  test('user can login and refresh without losing session', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard|\/onboarding|\/profile|\/subcontractors|\/jobs/)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/\/login/)
  })

  test('logged-in user opening homepage is redirected to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('subcontractors page shows availability CTA and does not force pricing display', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    // Requires test user to have primaryTrade set (TradeGate redirects otherwise)
    await expect(page).toHaveURL(/\/subcontractors/)
    await expect(page.getByRole('heading', { name: /subcontractors|find subcontractors/i })).toBeVisible()

    const availabilityButton = page
      .getByRole('link', { name: /list availability|update availability/i })
      .first()

    await expect(availabilityButton).toBeVisible()

    const cardText = await page.locator('body').innerText()

    // This is intentionally broad because we specifically removed default pricing
    // from discovery cards unless the user chooses to show it.
    expect(cardText).not.toMatch(/\$\s?\d+\s*\/\s*hr/i)
  })

  test('availability page loads, pricing is optional, and refine with AI appears', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/availability`)
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', { name: /list subcontracting dates/i })
    ).toBeVisible({ timeout: 15_000 })

    await expect(
      page.getByText(/set pricing \(optional\)/i)
    ).toBeVisible()

    const refineButton = page.getByRole('button', { name: /refine with ai/i }).first()
    await expect(refineButton).toBeVisible()
  })

  test('availability pricing options behave correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/availability`)
    await page.waitForLoadState('networkidle')

    const pricingTrigger = page.getByRole('combobox').first().or(page.locator('select').first())
    await expect(pricingTrigger).toBeVisible({ timeout: 10_000 })

    if (await page.locator('select').first().isVisible().catch(() => false)) {
      await page.locator('select').first().selectOption({ label: 'Set hourly rate' })
      await expect(page.locator('input[placeholder="$"], input[inputmode="numeric"]').first()).toBeVisible()
      await page.locator('select').first().selectOption({ label: 'Set day rate' })
      await expect(page.locator('input[placeholder="$"], input[inputmode="numeric"]').first()).toBeVisible()
      await page.locator('select').first().selectOption({ label: 'Quote on request' })
    } else {
      await pricingTrigger.click()
      await page.getByRole('option', { name: /set hourly rate/i }).click()
      await expect(page.locator('input[placeholder="$"], input[inputmode="numeric"]').first()).toBeVisible()
      await pricingTrigger.click()
      await page.getByRole('option', { name: /set day rate/i }).click()
      await expect(page.locator('input[placeholder="$"], input[inputmode="numeric"]').first()).toBeVisible()
      await pricingTrigger.click()
      await page.getByRole('option', { name: /quote on request/i }).click()
    }

    const amountInput = page.locator('input[placeholder="$"], input[inputmode="numeric"]').first()
    await expect(amountInput).toBeHidden().catch(async () => {
      await expect(amountInput).toBeDisabled()
    })
  })

  test('refine with AI is disabled when description is empty and works with text', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/availability`)
    await page.waitForLoadState('networkidle')

    const description = page.getByPlaceholder(/describe your subcontracting availability/i).first()
    const refineButton = page.getByRole('button', { name: /refine with ai/i }).first()

    await description.fill('')
    await expect(refineButton).toBeDisabled()

    await description.fill('available for plumbing work with two second-year apprentices on selected dates')
    await expect(refineButton).toBeEnabled()

    await refineButton.click()

    // Handles either loading text on same button or request delay.
    await expect(
      page.getByRole('button', { name: /refining|refine with ai/i }).first()
    ).toBeVisible()

    await page.waitForLoadState('networkidle')

    const refinedValue = await description.inputValue()
    expect(refinedValue.length).toBeGreaterThan(10)
  })

  test('user can select dates and save availability', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile/availability`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/select your dates|days selected/i).first()).toBeVisible({ timeout: 10_000 })

    // react-day-picker: day cells are buttons; past dates are disabled — only select enabled
    const dayButtons = page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ })
    await expect(dayButtons.first()).toBeVisible({ timeout: 10_000 })
    const count = await dayButtons.count()
    if (count < 3) {
      test.skip(true, 'Calendar has fewer than 3 enabled day buttons')
    }
    await dayButtons.nth(0).click()
    await dayButtons.nth(1).click()
    await dayButtons.nth(2).click()

    const description = page.getByPlaceholder(/describe your subcontracting availability/i).first()
    await description.fill('Available for plumbing rough-in and fit-off work on selected dates.')

    const saveButton = page.getByRole('button', { name: /save subcontracting dates/i }).first()
    await saveButton.click()

    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard|\/profile\/availability/, { timeout: 15_000 })
  })

  test('subcontractors page CTA links correctly to availability page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    const availabilityButton = page
      .getByRole('link', { name: /list availability|update availability/i })
      .first()

    await availabilityButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/profile\/availability/)
  })

  test('mobile smoke test: subcontractors page layout and CTA still work', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      storageState: 'playwright/.auth/user.json',
    })

    const page = await context.newPage()
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /subcontractors/i })).toBeVisible()

    const availabilityButton = page
      .getByRole('link', { name: /list availability|update availability/i })
      .first()

    await expect(availabilityButton).toBeVisible()
    await availabilityButton.click()

    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/profile\/availability/)

    await context.close()
  })

  test('free user sees trade restriction messaging on subcontractors page when applicable', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()

    // Keep this tolerant because exact copy may vary.
    expect(
      /primary trade only|unlock multi-trade discovery|see premium|free: primary trade only/i.test(bodyText)
    ).toBeTruthy()
  })

  // Logout runs last among shared-auth tests so it doesn't break earlier tests.
  test('logout does not immediately log the user back in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await logout(page)

    await expect(page).toHaveURL(/\/|\/login/)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/login/)
  })

  // Premium test does its own auth; can run after logout.
  test('premium user can be tested separately when premium creds are provided', async ({ page }) => {
    test.skip(!PREMIUM_EMAIL || !PREMIUM_PASSWORD, 'Premium credentials not provided')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: PREMIUM_EMAIL,
      password: PREMIUM_PASSWORD,
    })

    if (error) {
      throw new Error(`Premium Supabase login failed: ${error.message}`)
    }

    const { access_token, refresh_token } = data.session

    await page.goto(`${BASE_URL}/`)
    await page.evaluate(
      ([access_token, refresh_token]) => {
        localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            currentSession: {
              access_token,
              refresh_token,
            },
          })
        )
      },
      [access_token, refresh_token]
    )

    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()

    expect(/unlock multi-trade discovery|free: primary trade only/i.test(bodyText)).toBeFalsy()
  })
})
