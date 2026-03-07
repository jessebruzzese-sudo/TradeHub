/**
 * ABN verification enforcement — unverified user tests.
 * Requires PW_NO_ABN_EMAIL and PW_NO_ABN_PASSWORD (e.g. pw-unverified@tradehub.test from qa:seed).
 * Uses chromium-unverified project with setup-unverified.
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'

test.describe('ABN gating — unverified user', () => {
  test('can browse jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/jobs/)
    await expect(page.getByRole('heading', { name: /jobs|find work|my job posts/i })).toBeVisible()
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

  test('sees Verify ABN to Post on jobs page (not Post Job)', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    const verifyLink = page.getByRole('link', { name: /verify abn to post/i })
    await expect(verifyLink).toBeVisible()
    await expect(verifyLink).toHaveAttribute('href', /\/verify-business/)
  })

  test('redirects to verify-business when navigating to jobs/create', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs/create`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/verify-business/)
    await expect(page.getByText(/verify|abn|business/i)).toBeVisible()
  })

  test('redirects to verify-business when navigating to tenders/create', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: /post tender/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/verify-business/)
    await expect(page.getByText(/verify|abn|business/i)).toBeVisible()
  })

  test('messages page loads and shows verify ABN for action cards when applicable', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/messages/)
    const heading = page.getByRole('heading', { name: /messages|conversations/i })
    await expect(heading).toBeVisible()
    const verifyLink = page.getByRole('link', { name: /verify abn/i })
    if (await verifyLink.isVisible().catch(() => false)) {
      await expect(verifyLink).toHaveAttribute('href', /\/verify-business/)
    }
  })

  test('when Accept/Decline action card visible, unverified user sees Verify ABN and disabled Accept', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')
    const youveBeenSelected = page.getByText(/you've been selected|selected for this job/i)
    if (!(await youveBeenSelected.isVisible().catch(() => false))) {
      test.skip(true, 'No thread in accepted state; requires seeded conversation with job status=accepted')
    }
    const verifyLink = page.getByRole('link', { name: /verify abn/i })
    await expect(verifyLink).toBeVisible()
    await expect(verifyLink).toHaveAttribute('href', /\/verify-business/)
    const acceptBtn = page.getByRole('button', { name: /^accept$/i })
    if (await acceptBtn.isVisible().catch(() => false)) {
      await expect(acceptBtn).toBeDisabled()
    }
  })
})
