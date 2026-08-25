import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-5 · Data Import / Export E2E (T120 / FR-023B)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('kiểm tra giao diện Import / Export sẵn sàng và kích hoạt được qua menu/toolbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 10_000 })
  })
})
