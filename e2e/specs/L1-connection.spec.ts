import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-1 · Connection Lifecycle E2E (T078 / FR-023B)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('mở ứng dụng và kiểm tra tiêu đề, toolbar, nav pane cơ bản', async ({ page }) => {
    await page.goto('/')
    // Chờ giao diện chính tải xong
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="nav-pane"]')).toBeVisible()
    await expect(page.locator('[data-testid="tab-strip"]')).toBeVisible()
  })
})
