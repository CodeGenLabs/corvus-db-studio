import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ root: import.meta.dirname })],
  test: {
    // Một cấu hình duy nhất ở root: đảm bảo MỌI test trong workspace đều được chạy.
    // Trước đây turbo chạy `test` theo từng package, nhưng không package nào có script
    // `test` nên `pnpm test` báo xanh với 0 test — xem docs/04-plan/audit-2026-08-18.md.
    include: ['packages/*/src/**/*.{test,spec}.{ts,tsx}', 'apps/**/src/**/*.{test,spec}.{ts,tsx}', 'tools/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      ['packages/ui/src/**/*.dom.test.tsx', 'jsdom'],
    ],
    passWithNoTests: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**', '**/index.ts'],
    },
  },
})
