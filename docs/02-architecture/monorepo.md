# Cấu trúc Monorepo

## 1. Công cụ

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Package manager | **pnpm** ≥ 9 (workspaces) | Symlink store, ép khai báo dependency đúng, nhanh |
| Task runner | **Turborepo** | Cache build/test theo nội dung, chạy song song |
| Bundler (UI) | **Vite 6** | Đã dùng, HMR nhanh |
| Bundler (Node lib) | **tsup** (esbuild) | Xuất ESM + CJS + d.ts |
| Desktop | **Electron 33** + `electron-builder` | Xem [ADR-0001](adr/ADR-0001-electron-over-tauri.md) |
| Test | **Vitest** + **Playwright** + **testcontainers** | |
| Lint | **ESLint 9** flat config + **dependency-cruiser** | Ép luật phụ thuộc |
| Format | **Prettier** | 1 cấu hình duy nhất ở root |

## 2. Cây thư mục đích

```
corvus-db-studio/
├── package.json                    workspace root, chỉ scripts + devDeps
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json              path alias @corvus/*
├── eslint.config.js
├── .dependency-cruiser.cjs         ★ ép luật phụ thuộc tầng
├── docs/                           ← hồ sơ này
│
├── packages/
│   ├── contract/                   @corvus/contract     (isomorphic, zero-dep trừ zod)
│   │   ├── src/
│   │   │   ├── methods/            1 file / nhóm method
│   │   │   │   ├── connection.ts
│   │   │   │   ├── introspect.ts
│   │   │   │   ├── query.ts
│   │   │   │   ├── data.ts
│   │   │   │   ├── ddl.ts
│   │   │   │   ├── job.ts
│   │   │   │   └── …
│   │   │   ├── models/             kiểu dữ liệu dùng chung (Column, TableMeta, …)
│   │   │   ├── errors.ts           CorvusError, ErrorCode
│   │   │   ├── capabilities.ts     CapabilitySet
│   │   │   ├── transport.ts        interface Transport
│   │   │   └── index.ts            registry: METHODS
│   │
│   ├── client/                     @corvus/client       (isomorphic)
│   │   └── src/
│   │       ├── createClient.ts     bọc Transport → typed client
│   │       ├── queries/            hook react-query cho từng method
│   │       └── jobs.ts             theo dõi tiến trình job
│   │
│   ├── transport-http/             @corvus/transport-http
│   │   └── src/{client.ts, server.ts}
│   ├── transport-ipc/              @corvus/transport-ipc
│   │   └── src/{client.ts, host.ts, preload.ts}
│   ├── transport-mock/             @corvus/transport-mock  (test only)
│   │
│   ├── ui/                         @corvus/ui           (browser only)
│   │   └── src/
│   │       ├── shell/              TitleBar, MenuBar, Toolbar, TabStrip, StatusBar
│   │       ├── panes/              NavPane, InfoPane
│   │       ├── views/              Objects, Data, Sql, Design, Er, Compare, Backup, Jobs
│   │       ├── dialogs/
│   │       ├── grid/               ★ DataGrid virtualized (dùng lại ở 4 chỗ)
│   │       ├── editor/             ★ CodeMirror wrapper
│   │       ├── primitives/         Button, Toggle, Segmented, Pill, Modal…
│   │       ├── theme/              theme.css, tokens.ts
│   │       ├── i18n/
│   │       └── store/              useShellStore (zustand)
│   │
│   ├── sql/                        @corvus/sql          (isomorphic)
│   │   └── src/{dialect/, format/, parse/, identifier.ts}
│   │
│   ├── driver-core/                @corvus/driver-core  (Node)
│   │   └── src/{types.ts, registry.ts, conformance/}
│   ├── driver-postgres/
│   ├── driver-mysql/
│   ├── driver-sqlite/
│   ├── driver-mssql/
│   ├── driver-oracle/
│   ├── driver-mongodb/
│   ├── driver-redis/
│   │
│   ├── tunnel/                     @corvus/tunnel       (Node) — ssh2, TLS
│   ├── storage/                    @corvus/storage      (Node) — workspace.db, vault
│   ├── services/                   @corvus/services     (Node) — nghiệp vụ
│   │   └── src/{introspect, dml, ddl, import, export, backup, transfer,
│   │            datasync, structsync, datagen, profiling, security,
│   │            monitor, search, ai}/
│   └── engine/                     @corvus/engine       (Node) — router + runtime
│       └── src/{router.ts, session.ts, jobs.ts, scheduler.ts, auth/, audit.ts}
│
├── apps/
│   ├── web/
│   │   ├── client/                 Vite SPA (React + TypeScript)
│   │   └── server/                 Node HTTP RPC + WebSocket (HttpRpcServer)
│   ├── desktop/
│   │   ├── main/  preload/  renderer/
│   │   └── electron-builder.yml
│   └── cli/
│
├── e2e/                            Playwright (web + electron)
├── fixtures/                       SQL seed, file CSV/JSON mẫu, snapshot
└── tools/                          script sinh code, kiểm tra contract
```

## 3. Trạng thái chuyển đổi Monorepo

Toàn bộ quá trình chuyển đổi sang Monorepo (`T-001 … T-006`) đã **hoàn tất thành công**:

| Bước | Việc | Task | Trạng thái |
|---|---|---|:---:|
| 1 | Thêm pnpm workspace + turbo, cấu hình monorepo | T-001 | ✅ Done |
| 2 | Chuyển `src/components`, `src/views`, `src/styles`, `src/i18n` → `packages/ui/src` | T-002 | ✅ Done |
| 3 | Chuyển models dùng chung → `packages/contract/src/models` | T-003 | ✅ Done |
| 4 | Fixtures mock data → `packages/transport-mock/src/fixtures` | T-004 | ✅ Done |
| 5 | Tách store → `useShellStore` + client RPC | T-005 | ✅ Done |
| 6 | Dựng `apps/web` và `apps/desktop`, cả hai render `<CorvusApp/>` từ `@corvus/ui` | T-006 | ✅ Done |

## 4. `package.json` mẫu cho một package

```jsonc
{
  "name": "@corvus/driver-postgres",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run",
    "test:conformance": "vitest run --config vitest.conformance.ts"
  },
  "dependencies": {
    "@corvus/driver-core": "workspace:*",
    "@corvus/sql": "workspace:*",
    "pg": "^8.13.0"
  }
}
```

## 5. Luật phụ thuộc được ép bằng máy

`.dependency-cruiser.cjs` (rút gọn):

```js
module.exports = {
  forbidden: [
    {
      name: 'ui-must-not-touch-node',
      severity: 'error',
      from: { path: '^packages/(ui|client|contract)/' },
      to: { path: '^(node:|packages/(engine|services|driver-|storage|tunnel))' },
    },
    {
      name: 'contract-is-leaf',
      severity: 'error',
      from: { path: '^packages/contract/' },
      to: { path: '^packages/(?!contract)' },
    },
    {
      name: 'no-electron-outside-desktop',
      severity: 'error',
      from: { pathNot: '^apps/desktop/' },
      to: { path: '^electron$' },
    },
    {
      name: 'drivers-are-isolated',
      severity: 'error',
      from: { path: '^packages/driver-(?!core)' },
      to: { path: '^packages/(services|engine)/' },
    },
  ],
}
```

CI chạy `pnpm depcruise` ở mọi PR. Vi phạm = build đỏ.

## 6. Script chuẩn ở root

```jsonc
{
  "scripts": {
    "dev:web":      "turbo run dev --filter=@corvus/app-web...",
    "dev:desktop":  "turbo run dev --filter=@corvus/app-desktop...",
    "build":        "turbo run build",
    "test":         "turbo run test",
    "test:it":      "turbo run test:integration",       // cần Docker
    "test:e2e":     "playwright test",
    "lint":         "eslint . && depcruise packages apps",
    "typecheck":    "turbo run typecheck",
    "verify":       "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

`pnpm verify` là **cổng bắt buộc trước mọi PR**.
