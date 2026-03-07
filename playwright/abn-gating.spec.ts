/**
 * ABN verification enforcement — verified user (main auth).
 * Unverified user tests live in abn-gating-unverified.spec.ts (requires PW_NO_ABN_EMAIL).
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'

test.describe('ABN verification enforcement (verified user)', () => {
  test('can browse jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/jobs/)
    await expect(page.getByRole('heading', { name: /^jobs$/i }).first()).toBeVisible()
  })

  test('can browse tenders page', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/tenders/)
    await expect(page.getByRole('heading', { name: /tenders|marketplace/i })).toBeVisible()
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
    const profileLink = page.getByRole('link', { name: /view profile|profile/i }).first()
    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/profile/)
    }
  })

  test('sees Post Job CTA when verified (not Verify ABN to Post)', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    const postJobLink = page.getByRole('link', { name: /post job/i })
    await expect(postJobLink).toBeVisible()
    await expect(postJobLink).toHaveAttribute('href', /\/jobs\/create/)
  })
})
