import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-6 · Migration Tools E2E (T133 / FR-023B / SC-013)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('kiểm tra các công cụ Tools có mặt trên menubar / giao diện', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 10_000 })
  })
})
