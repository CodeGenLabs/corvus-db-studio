import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.CORVUS_WEB_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'web-webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'desktop',
      use: {
        // Desktop Electron project configuration
        browserName: 'chromium',
      },
    },
  ],
})
