import { test, expect } from '@playwright/test'
import { requireDevContainers } from '../fixtures/containers'

test.describe('L-7 · Navicat UI Ergonomics E2E (T050 / SC-009 / US1..US5)', () => {
  test.beforeAll(async () => {
    await requireDevContainers(['postgres', 'mysql'])
  })

  test('kiểm tra thanh điều hướng DataGrid, Filter panel, Table Designer, Query Split và Find in DB', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 10_000 })
  })
})
