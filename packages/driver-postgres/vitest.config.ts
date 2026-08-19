import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ root: '../..' })],
  test: {
    include: ['src/**/*.integration.test.ts'],
    // Testcontainers cần thời gian pull image lần đầu.
    testTimeout: 120_000,
    hookTimeout: 300_000,
    // Container dùng chung cho cả file -> không chạy song song trong cùng file.
    fileParallelism: false,
  },
})
