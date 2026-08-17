# Kiến trúc tổng thể

> Mục tiêu: **một codebase** phát hành được đồng thời thành **web app** và **Windows desktop app**,
> không fork, không copy-paste, không `if (isElectron)` rải rác trong UI.

---

## 1. Ràng buộc quyết định mọi thứ

Trình duyệt **không thể** mở TCP socket tới `mysql://host:3306`. Không có cách nào lách:
WebSocket không phải TCP thô, WebTransport cũng vậy.

Hệ quả bắt buộc: **driver database phải chạy trong Node.** Vì vậy hệ thống luôn có hai nửa:

```
┌───────────────────────┐        ┌────────────────────────────┐
│  Presentation (React) │◄─RPC──►│  Engine (Node, có driver)  │
│  chạy trong browser   │        │  chạy trong Node/Electron  │
│  hoặc renderer        │        │  main process              │
└───────────────────────┘        └────────────────────────────┘
```

Khác biệt duy nhất giữa web và desktop là **đường dây RPC nằm ở đâu**:

| Target | Presentation chạy ở | Engine chạy ở | Transport |
|---|---|---|---|
| **Web** | Browser tab | Server (Docker/VM) | HTTPS + WebSocket |
| **Desktop** | Electron renderer | Electron main process | Electron IPC + MessagePort |
| **Agent** (lai) | Browser tab | Máy cá nhân người dùng | HTTPS localhost + WebSocket |

Ba target, **một** `@corvus/engine`, **một** `@corvus/ui`.

---

## 2. Sơ đồ tầng

```
┌──────────────────────────────────────────────────────────────────────┐
│ TẦNG 1 · PRESENTATION                          (chạy được ở browser) │
│                                                                      │
│  @corvus/ui          React components, design system, i18n, theme    │
│  @corvus/client      RPC client, cache, optimistic update, job feed  │
│                      ── phụ thuộc DUY NHẤT: @corvus/contract + Transport
└──────────────────────────────────────────────────────────────────────┘
                                  │ interface Transport
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐        ┌────────────────┐        ┌────────────────┐
│ transport-http│        │ transport-ipc  │        │ transport-mock │
│ fetch + WS    │        │ Electron IPC   │        │ in-memory (test)│
└───────────────┘        └────────────────┘        └────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TẦNG 2 · CONTRACT                                    (isomorphic)    │
│                                                                      │
│  @corvus/contract    Định nghĩa mọi method RPC bằng zod schema.      │
│                      Sinh ra type cho cả 2 phía. Không có logic.     │
└──────────────────────────────────────────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TẦNG 3 · ENGINE                                        (Node only)   │
│                                                                      │
│  @corvus/engine      Router RPC, SessionManager, JobRunner,          │
│                      Scheduler, AuthContext, AuditLog                │
│  @corvus/services    Nghiệp vụ: introspect, dml, ddl, import,        │
│                      export, backup, transfer, sync, datagen,        │
│                      profiling, security, monitor                    │
│  @corvus/storage     workspace.db (SQLite) + SecretVault             │
│  @corvus/sql         Dialect, quoting, formatter, parser, AST        │
└──────────────────────────────────────────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TẦNG 4 · DRIVER                                        (Node only)   │
│                                                                      │
│  @corvus/driver-core     interface DatabaseDriver + CapabilitySet    │
│  @corvus/driver-postgres │ -mysql │ -sqlite │ -mssql │ -oracle       │
│  @corvus/driver-mongodb  │ -redis                                    │
│  @corvus/tunnel          SSH tunnel (ssh2), TLS config               │
└──────────────────────────────────────────────────────────────────────┘
```

### Luật phụ thuộc (được ép bởi ESLint + `dependency-cruiser`)

```
ui        → client, contract
client    → contract
contract  → (không phụ thuộc gì)
engine    → services, storage, contract, driver-core
services  → driver-core, sql, storage, contract
driver-*  → driver-core, sql
```

**Cấm tuyệt đối**: `ui` hoặc `client` import bất cứ thứ gì từ `engine`, `services`, `driver-*`,
`node:*`, hoặc `electron`. Vi phạm sẽ làm web build vỡ ngay ở CI.

---

## 3. Ba ứng dụng dựng từ cùng bộ package

### 3.1 `apps/web`

```
apps/web/
├── client/          Vite SPA  → import @corvus/ui + transport-http
└── server/          Fastify   → import @corvus/engine + transport-http/server
                                 phục vụ luôn static build của client
```

Chạy: `docker run -p 8080:8080 corvus/studio:1.0`
Một process Node phục vụ cả SPA và RPC. Multi-user, có đăng nhập.

### 3.2 `apps/desktop`

```
apps/desktop/
├── main/            Electron main → import @corvus/engine + transport-ipc/host
├── preload/         contextBridge → phơi đúng 1 API: window.corvus.rpc
└── renderer/        Vite SPA      → import @corvus/ui + transport-ipc/client
```

Chạy: cài `Corvus-Studio-Setup-1.0.0.exe`. Single-user, không đăng nhập, secret nằm trong
Windows Credential Manager.

**Renderer và web client là cùng một entry component.** Chỉ khác 8 dòng bootstrap:

```ts
// apps/web/client/src/main.tsx
const transport = createHttpTransport({ baseUrl: '/rpc', wsUrl: '/ws' })

// apps/desktop/renderer/src/main.tsx
const transport = createIpcTransport(window.corvus)

// cả hai:
createRoot(el).render(<CorvusApp transport={transport} />)
```

### 3.3 `apps/cli`

```
corvus run-job nightly-backup --workspace ./ws
corvus export --connection prod --table users --format csv --out users.csv
```

Import `@corvus/engine` trực tiếp, không qua transport. Dùng cho CI/CD và cron ngoài.

---

## 4. Vòng đời một thao tác — ví dụ "chạy SELECT"

```
[UI] SqlEditor: người dùng nhấn ▶ Run
  │
  ├─ useRunQuery() → client.stream('query.execute', { connectionId, sql, params })
  │
  ├─ Transport (http hoặc ipc) đóng gói và gửi
  │
[ENGINE] rpc router
  ├─ validate params bằng zod schema từ @corvus/contract
  ├─ AuthContext.assertCan('query.execute', connectionId)
  ├─ AuditLog.record({ actor, action, sql })
  ├─ SessionManager.acquire(connectionId) → DriverConnection (từ pool)
  │
[DRIVER] pg.Client.query(new Cursor(sql, params))
  ├─ đọc theo lô 1 000 dòng
  │
  └─ trả về AsyncIterable<ResultChunk>
        chunk 0 → { columns: [...], rows: [1000 dòng], done: false }
        chunk 1 → { rows: [1000 dòng], done: false }
        …
        chunk n → { rows: [...], done: true, stats: { rowCount, durationMs } }
  │
[UI] ResultGrid nhận từng chunk, append vào store, render virtualized
     người dùng thấy 1 000 dòng đầu sau ~40 ms dù query trả 5 triệu dòng
```

**Bất biến**: engine **không bao giờ** buffer toàn bộ result set vào RAM.
Xem [streaming-and-jobs.md](streaming-and-jobs.md).

---

## 5. Quản lý trạng thái ở tầng UI

Tách làm 2 loại, không trộn:

| Loại | Công cụ | Ví dụ |
|---|---|---|
| **Shell state** — thuộc về UI, không cần server | Zustand store (`useShellStore`) | tab đang mở, pane width, theme, ngôn ngữ, dialog nào đang bật |
| **Server state** — dữ liệu từ engine | TanStack Query (`@tanstack/react-query`) | danh sách bảng, kết quả query, danh sách job |

`StudioProvider` hiện tại trong `src/store/studio.tsx` sẽ được tách:
- phần UI/shell → `useShellStore` (zustand)
- phần dữ liệu mock → thay bằng hook react-query gọi RPC

Xem [ADR-0007](adr/ADR-0007-state-management.md) và task `T-018`.

---

## 6. Xử lý lỗi xuyên tầng

Mọi lỗi từ engine đi qua đúng một kiểu:

```ts
interface CorvusError {
  code: ErrorCode          // 'CONNECTION_REFUSED' | 'SQL_SYNTAX' | 'PERMISSION_DENIED' | …
  message: string          // đã i18n key, không phải câu hoàn chỉnh
  messageKey: string       // 'error.sql.syntax'
  detail?: string          // thông điệp gốc từ driver, chỉ hiện khi bấm "Chi tiết"
  position?: { line: number; column: number }  // để highlight trong editor
  retryable: boolean
  cause?: CorvusError
}
```

Driver **phải** dịch lỗi native sang `CorvusError` (bảng ánh xạ trong mỗi driver).
UI **không bao giờ** hiển thị `error.message` thô từ driver ra ngoài — chỉ qua i18n.

Chi tiết: [../05-rules/coding-rules.md § Error handling](../05-rules/coding-rules.md).

---

## 7. Yêu cầu phi chức năng

| ID | Yêu cầu | Ngưỡng | Cách đo |
|---|---|---|---|
| NFR-01 | Thời gian tới first paint của grid | ≤ 150 ms sau khi chunk đầu về | Playwright trace |
| NFR-02 | Cuộn grid 1 triệu dòng | ≥ 55 fps | Chrome DevTools perf |
| NFR-03 | RAM engine khi stream 10 triệu dòng | ≤ 400 MB | `process.memoryUsage()` trong integration test |
| NFR-04 | Khởi động app desktop tới lúc dùng được | ≤ 2.5 s (máy SSD) | Electron `ready-to-show` |
| NFR-05 | Kích thước bundle SPA (gzip) | ≤ 900 KB initial, lazy-load view nặng | `vite build --report` |
| NFR-06 | Kết nối idle được đóng | sau 10 phút, cấu hình được | Integration test |
| NFR-07 | Không rò rỉ secret vào log/telemetry/AI | 0 vụ | Test redaction + review bắt buộc |
| NFR-08 | Mọi thao tác phá huỷ có bước xem trước | 100% | E2E test |
| NFR-09 | Web hỗ trợ Chrome/Edge/Firefox/Safari 2 phiên bản gần nhất | | Playwright matrix |
| NFR-10 | Desktop hỗ trợ Windows 10 21H2+ x64 và arm64 | | CI build matrix |

---

## 8. Tài liệu liên quan

| Chủ đề | Tài liệu |
|---|---|
| Cấu trúc package cụ thể | [monorepo.md](monorepo.md) |
| Hợp đồng RPC & Transport | [rpc-contract.md](rpc-contract.md) |
| Cách viết driver mới | [driver-spi.md](driver-spi.md) |
| Bảo mật, vault, tunnel, RBAC | [security.md](security.md) |
| Lưu trữ workspace | [workspace-storage.md](workspace-storage.md) |
| Streaming + job dài hạn | [streaming-and-jobs.md](streaming-and-jobs.md) |
| Đóng gói & phát hành | [packaging-release.md](packaging-release.md) |
| Toàn bộ quyết định | [adr/](adr/) |
