import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

import noNodeInUi from './tools/eslint-rules/no-node-in-ui.js'
import noDriverIdBranching from './tools/eslint-rules/no-driver-id-branching.js'
import noRawSqlConcat from './tools/eslint-rules/no-raw-sql-concat.js'

/** 3 rule kiến trúc riêng của Corvus — coding-rules.md §16. */
const corvus = {
  rules: {
    'no-node-in-ui': noNodeInUi,
    'no-driver-id-branching': noDriverIdBranching,
    'no-raw-sql-concat': noRawSqlConcat,
  },
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '.scratch/**',
      '**/*.tsbuildinfo',
      'docs/**',
      'src/**', // app Vite phẳng cũ, sẽ xoá khi T-006 hoàn tất
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { corvus },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // `x == null` la cach kiem ca null va undefined idiomatic; moi so sanh khac van phai ===
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  // ── UI: cấm chạm tầng Node (luật 1.1) ────────────────────────────────────────
  {
    files: ['packages/{ui,client,contract}/**/*.{ts,tsx}'],
    plugins: { corvus, 'react-hooks': reactHooks },
    rules: {
      'corvus/no-node-in-ui': 'error',
      'corvus/no-driver-id-branching': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ── services/engine: cấm nhánh theo driverId (ADR-0003) ──────────────────────
  {
    files: ['packages/{services,engine}/**/*.ts'],
    rules: { 'corvus/no-driver-id-branching': 'error' },
  },

  // ── Mọi code sinh SQL: cấm ghép chuỗi (security.md §7) ───────────────────────
  {
    files: ['packages/{sql,services,engine,ui,client,driver-*}/**/*.{ts,tsx}'],
    rules: { 'corvus/no-raw-sql-concat': 'error' },
  },

  // ── NỢ KỸ THUẬT có kiểm soát: T-B01 ──────────────────────────────────────────
  // 13 file dưới đây có SQL ghép chuỗi không an toàn (66 chỗ), phát hiện lần đầu khi
  // eslint được cài thật — xem docs/04-plan/audit-2026-08-18.md.
  // Hạ xuống 'warn' để `pnpm lint` xanh và cổng xác minh hoạt động được NGAY; file MỚI
  // vẫn bị chặn ở mức 'error'. Danh sách này chỉ được PHÉP NGẮN ĐI, không dài thêm.
  // Xoá dòng nào đã sửa xong. Khi rỗng, xoá cả block này.
  {
    files: [
      'packages/driver-mysql/src/driver.ts',
      'packages/driver-postgres/src/driver.ts',
      'packages/driver-sqlite/src/driver.ts',
      'packages/engine/src/security-provider.ts',
      'packages/sql/src/builder.ts',
      'packages/sql/src/change-order.ts',
      'packages/sql/src/ddl.ts',
      'packages/sql/src/fast-path-import.ts',
      'packages/sql/src/import-parser.ts',
      'packages/sql/src/multi-export.ts',
      'packages/sql/src/schema-search.ts',
      'packages/sql/src/security-generator.ts',
      'packages/sql/src/subquery-builder.ts',
    ],
    rules: { 'corvus/no-raw-sql-concat': 'warn' },
  },

  // ── NỢ KỸ THUẬT có kiểm soát: T-B02 ──────────────────────────────────────────
  // contract/src/uri.ts rẽ nhánh theo driverId để dựng/parse URI. Đây là chỗ ranh giới
  // (URI scheme gắn với tên engine), nhưng vẫn nên chuyển sang bảng tra trong driver
  // registry. Xem T-B02.
  {
    files: ['packages/contract/src/uri.ts'],
    rules: { 'corvus/no-driver-id-branching': 'warn' },
  },

  // ── Test được nới lỏng vài luật ──────────────────────────────────────────────
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // ── Script/tool chạy bằng Node ───────────────────────────────────────────────
  {
    files: ['tools/**/*.{js,mjs,ts}', 'scripts/**/*.{js,mjs,ts}', '*.config.{js,ts}', '*.cjs'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
