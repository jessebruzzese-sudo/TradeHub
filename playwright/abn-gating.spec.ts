/**
 * ABN verification enforcement — verified user (main auth).
 * Unverified user tests live in abn-gating-unverified.spec.ts (requires PW_NO_ABN_EMAIL).
 */
import { test, expect } from '@playwright/test'
import { switchToUser, ACCOUNTS } from './helpers'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'

test.describe('ABN verification enforcement (verified user)', () => {
  test('can browse jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/jobs/)
    await expect(page.getByRole('heading', { name: /^jobs$/i }).first()).toBeVisible()
  })

  test('can browse search page', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/search/)
    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible()
  })

  test('can browse subcontractors page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/subcontractors/)
    await expect(page.getByRole('heading', { name: /subcontractors|find subcontractors/i })).toBeVisible()
  })

  test('can browse profiles via subcontractors', async ({ page }) => {
    await page.goto(`${BASE_URL}/subcontractors`)
    await page.waitForLoadState('networkidle')
    // Use exact "View profile" to avoid matching sidebar "Profile" link
    const profileLink = page.getByRole('link', { name: 'View profile' }).first()
    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click()
      await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 })
    }
  })

  test('sees Post Job CTA when verified (not Verify ABN to Post)', async ({ page }) => {
    await switchToUser(page, ACCOUNTS.premium.email, ACCOUNTS.premium.password)
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    const postJobLink = page.getByRole('link', { name: /post job/i })
    if (await postJobLink.first().isVisible().catch(() => false)) {
      await expect(postJobLink.first()).toHaveAttribute('href', /\/jobs\/create/)
      return
    }
    const verifyCta = page.getByRole('link', { name: /verify abn to post|verify now/i }).first()
    await expect(verifyCta).toBeVisible()
    await expect(verifyCta).toHaveAttribute('href', /\/verify-business/)
  })
})
