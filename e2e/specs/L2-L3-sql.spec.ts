import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-2, L-3 · SQL Query & Cancellation E2E (T079 / FR-029)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('mở tab SQL và kiểm tra các điều khiển trình soạn thảo', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="toolbar-newq"]')).toBeVisible({ timeout: 10_000 })
    await page.click('[data-testid="toolbar-newq"]')
    await expect(page.locator('[data-testid="tab-strip"]')).toContainText('Query')
  })
})
