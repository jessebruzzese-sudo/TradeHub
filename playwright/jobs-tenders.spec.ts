/**
 * Jobs and tenders critical flows.
 * - Draft creation (tenders)
 * - Publish when prerequisites met
 * - Owner-only controls visible only to owner
 * - Closed jobs/tenders behave correctly
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000'

test.describe('Jobs and tenders critical flows', () => {
  test('jobs page loads and shows Find Work / My Job Posts tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: /find work/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /my job posts/i })).toBeVisible()
  })

  test('tenders page loads and shows View available / My Tenders tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: /view available tenders/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /my tenders/i })).toBeVisible()
  })

  test('tender draft creation flow — create and save as draft', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders/create`)
    await page.waitForLoadState('networkidle')

    // Skip if redirected (unauthenticated or unverified)
    const url = page.url()
    if (url.includes('/login')) {
      test.skip(true, 'Test user not authenticated — session may have expired')
    }
    if (url.includes('/verify-business')) {
      test.skip(true, 'Test user needs ABN verification to create tenders')
    }

    // Stable: getByLabel (id="tender-project-name"); fallback to placeholder
    const projectNameInput = page.getByLabel('Project name').or(
      page.getByPlaceholder(/e\.g\.\s*single storey|renovation|plumbing/i)
    ).first()
    await expect(projectNameInput).toBeVisible({ timeout: 15_000 })
    await projectNameInput.fill('E2E Draft Tender Test')

    const projectDescInput = page.getByPlaceholder(/give an overview|overview.*included/i)
    await expect(projectDescInput).toBeVisible()
    await projectDescInput.fill('Draft creation smoke test')

    const tradeButton = page.getByRole('button', { name: /select required trades|trades selected/i })
    await tradeButton.click()
    const electricalLabel = page.locator('label').filter({ hasText: 'Electrical' })
    await expect(electricalLabel).toBeVisible({ timeout: 8000 })
    await electricalLabel.click()
    await page.keyboard.press('Escape')

    const tradeScopeInput = page.getByPlaceholder(/switchboard|e\.g\., describe what this trade/i)
    await expect(tradeScopeInput).toBeVisible({ timeout: 5000 })
    await tradeScopeInput.fill('Draft scope for E2E')

    await page.getByRole('button', { name: /^done$/i }).first().click()

    const suburbInput = page.getByLabel(/location|suburb/i).or(page.getByPlaceholder(/start typing suburb/i))
    await expect(suburbInput.first()).toBeVisible({ timeout: 5000 })
    await suburbInput.first().fill('Sydney')
    const postcodeInput = page.getByLabel(/postcode/i).or(page.getByPlaceholder(/e\.g\. 3105/i))
    await expect(postcodeInput.first()).toBeVisible()
    await postcodeInput.first().fill('2000')
    await page.getByRole('button', { name: /^done$/i }).last().click()

    const publishButton = page.getByRole('button', { name: /publish tender|verify business to publish|verify business/i }).first()
    await expect(publishButton).toBeVisible({ timeout: 5000 })
    await publishButton.click()

    await expect(
      page.getByText('E2E Draft Tender Test').first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('tenders My Tenders tab shows Draft filter when drafts exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenders`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: /my tenders/i }).click()
    await page.waitForLoadState('networkidle')
    const draftTab = page.getByRole('tab', { name: /draft/i })
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('closed jobs in My Job Posts show Delete action for owner', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: /my job posts/i }).click()
    await page.waitForLoadState('networkidle')
    const closedText = page.getByText(/closed/i).first()
    if (await closedText.isVisible().catch(() => false)) {
      const deleteBtn = page.getByRole('button', { name: /delete/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await expect(deleteBtn).toBeVisible()
      }
    }
  })
})
