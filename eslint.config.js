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




  // ── SQL trong fixture/conformance ────────────────────────────────────────────
  // Đây là SQL của BỘ KIỂM ĐỊNH, không phải SQL sinh cho người dùng: schema name là hằng
  // trong repo, không đến từ input. Rule no-raw-sql-concat nhắm vào SQL chạy trên dữ liệu
  // thật của khách hàng nên không áp dụng ở đây.
  {
    files: [
      'packages/driver-core/src/conformance/**/*.ts',
      '**/*.integration.test.ts',
    ],
    rules: { 'corvus/no-raw-sql-concat': 'off' },
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
