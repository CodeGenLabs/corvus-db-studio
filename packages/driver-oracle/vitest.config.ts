import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ root: '../..' })],
  test: {
    include: ['src/**/*.integration.test.ts', 'src/**/__tests__/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
})
