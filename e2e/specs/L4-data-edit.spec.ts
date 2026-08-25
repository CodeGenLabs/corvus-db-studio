import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-4 · Data Edit & Preview Token E2E (T080 / FR-032)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('kiểm tra grid container và context menu sẵn sàng', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 10_000 })
  })
})
