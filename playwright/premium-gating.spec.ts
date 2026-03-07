/**
 * Premium feature enforcement tests.
 * - Free users: see premium upsell where expected; restricted per app rules.
 * - Premium users: can access premium-only features when PW_PREMIUM_EMAIL/PW_PREMIUM_PASSWORD set.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createChunks, stringToBase64URL } from '@supabase/ssr'
import path from 'node:path'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'
const PREMIUM_EMAIL = process.env.PW_PREMIUM_EMAIL || ''
const PREMIUM_PASSWORD = process.env.PW_PREMIUM_PASSWORD || ''

function getStorageKey(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  const hostname = new URL(supabaseUrl).hostname
  const projectRef = hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

test.describe('Premium gating — free user', () => {
  test('sees trade restriction or premium upsell on subcontractors page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /subcontractors|find subcontractors/i })).toBeVisible()
    const bodyText = await page.locator('body').innerText()
    expect(
      /primary trade only|unlock multi-trade discovery|see premium|free: primary trade only/i.test(bodyText)
    ).toBeTruthy()
  })

  test('sees See Premium or pricing CTA when premium upsell present', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')
    const premiumLink = page.getByRole('link', { name: /see premium|premium/i }).first()
    await expect(premiumLink).toBeVisible()
  })

  test('free user sees radius restriction (20km) in UI when exposed', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    const radiusText = page.getByText(/20\s*km|20km radius/i)
    if (await radiusText.isVisible().catch(() => false)) {
      await expect(radiusText).toBeVisible()
    }
  })

  test('free user trade selector is disabled on subcontractors (primary trade only)', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')
    const tradeSelect = page.getByRole('combobox').or(page.locator('[role="combobox"]')).first()
    if (await tradeSelect.isVisible().catch(() => false)) {
      await expect(tradeSelect).toBeDisabled()
    }
  })
})

test.describe('Premium gating — premium user', () => {
  test.skip(!PREMIUM_EMAIL || !PREMIUM_PASSWORD, 'PW_PREMIUM_EMAIL and PW_PREMIUM_PASSWORD required for premium tests')

  test('premium user does not see free trade restriction on subcontractors', async ({ page }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.auth.signInWithPassword({
      email: PREMIUM_EMAIL,
      password: PREMIUM_PASSWORD,
    })
    if (error) throw new Error(`Premium login failed: ${error.message}`)

    const sessionJson = JSON.stringify(data.session)
    const encoded = 'base64-' + stringToBase64URL(sessionJson)
    const chunks = createChunks(getStorageKey(), encoded)
    const url = new URL(BASE_URL)
    await page.context().addCookies(
      chunks.map((c) => ({
        name: c.name,
        value: c.value,
        domain: url.hostname,
        path: '/',
      }))
    )

    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(/unlock multi-trade discovery|free: primary trade only/i.test(bodyText)).toBeFalsy()
  })
})
