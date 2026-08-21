# Corvus DB Studio 🦅

**Corvus DB Studio** là công cụ quản trị cơ sở dữ liệu đa nền tảng hiện đại, hiệu năng cao (tương tự Navicat / DBeaver / DataGrip), được phát hành đồng thời dưới dạng **Web Application** và **Windows Desktop Application** từ một codebase duy nhất.

Hỗ trợ các hệ quản trị cơ sở dữ liệu:
- **Relational**: PostgreSQL, MySQL / MariaDB, SQLite, SQL Server (MSSQL), Oracle
- **NoSQL / Cache**: MongoDB, Redis

---

## 🏗️ Kiến trúc Monorepo

Hệ thống được tổ chức theo mô hình Monorepo (quản lý bởi `pnpm` + `Turborepo`) gồm **23 packages & apps**:

```
corvus-db-studio/
├── apps/
│   ├── web/
│   │   ├── client/             # Ứng dụng Web SPA (React + TypeScript + Vite)
│   │   └── server/             # Backend Web server (Node HTTP RPC + WebSocket)
│   └── desktop/
│       ├── main/               # Electron Main Process (Node/Native)
│       ├── preload/            # Electron Preload Scripts (Isolated bridge)
│       └── renderer/           # Electron Renderer UI (React + TypeScript + Vite)
├── packages/
│   ├── contract/               # RPC definitions & data models (Zod)
│   ├── client/                 # Client SDK + FileGateway
│   ├── ui/                     # UI components, views, DataGrid, themes, i18n
│   ├── sql/                    # SQL AST, DDL generator, statement splitter
│   ├── engine/                 # Engine Router, Session Manager, Cache, Guards
│   ├── storage/                # SQLite storage (workspace.db), Migration, Vault
│   ├── tunnel/                 # SSH tunnel & TLS configuration
│   ├── driver-core/            # Driver SPI & Conformance test suite
│   ├── driver-postgres/        # PostgreSQL Driver implementation
│   ├── driver-mysql/           # MySQL / MariaDB Driver implementation
│   ├── driver-sqlite/          # SQLite Driver implementation
│   ├── driver-mssql/           # SQL Server (MSSQL) Driver implementation
│   ├── driver-oracle/          # Oracle Database Driver implementation
│   ├── driver-mongodb/         # MongoDB Driver implementation
│   ├── driver-redis/           # Redis Driver implementation
│   ├── transport-http/         # HTTP / WebSocket Transport (HttpRpcServer)
│   ├── transport-ipc/          # Electron MessagePort IPC Transport
│   └── transport-mock/         # In-memory Mock Transport (cho testing & UI dev)
└── docs/                       # Toàn bộ tài liệu kiến trúc & đặc tả
```

---

## 📋 Yêu cầu môi trường (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

1. **Node.js**: Phiên bản `>= 20.x` (khuyến nghị LTS `22.x`)
2. **pnpm**: Phiên bản `>= 9.x` (khuyến nghị `pnpm@11.x`)
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```
3. **Git**: Để clone và quản lý mã nguồn.
4. **Docker** *(tuỳ chọn)*: Dành cho chạy integration tests trên database thật (`pnpm test:it`).

---

## 🚀 Cài đặt dự án (Installation)

### 1. Cài đặt toàn bộ dependencies
Chạy lệnh sau tại thư mục gốc của dự án:

```bash
pnpm install
```

---

## 💻 Hướng dẫn chạy ứng dụng (Development)

### Cách 1: Chạy nhanh UI Shell (Khuyến nghị để phát triển giao diện)
Lệnh này khởi động Vite Dev Server cho UI shell với mock data, giúp phát triển giao diện siêu nhanh và hot-reload tức thì:

```bash
pnpm dev
```
👉 Mở trình duyệt tại: **http://localhost:5173**

---

### Cách 2: Chạy bản Web đầy đủ (Web Client + Web Server)
Khởi động đồng thời máy chủ RPC backend và ứng dụng Web client qua Turborepo:

```bash
pnpm dev:web
```

---

### Cách 3: Chạy bản Desktop App (Windows Electron)
Khởi động ứng dụng desktop dưới dạng cửa sổ phần mềm native:

```bash
pnpm dev:desktop
```

---

## 🛠️ Các lệnh kiểm chứng & Build (Scripts)

| Lệnh | Mô tả |
|---|---|
| `pnpm typecheck` | Kiểm tra TypeScript typecheck trên toàn bộ 23 packages & apps |
| `pnpm build` | Build toàn bộ các packages và bundles qua Turborepo |
| `pnpm build:app` | Build bundle cho ứng dụng web chính |
| `pnpm preview` | Chạy thử bản production build của Web app tại local |
| `pnpm test` | Chạy bộ kiểm thử tự động unit tests (`vitest run`) |
| `pnpm test:it` | Chạy bộ kiểm thử integration tests trên database thật qua Docker (`testcontainers`) |
| `pnpm lint` | Kiểm tra linting (`eslint`) và kiến trúc phụ thuộc (`dependency-cruiser`) |
| `pnpm check:contract` | Kiểm tra độ phủ và tính tương thích của handler so với contract RPC |
| `pnpm verify` | BẮT BUỘC trước khi commit: `lint` + `typecheck` + `build` + `test` + `check:contract` |

---

## 🔒 5 Quy tắc phát triển bất biến (Strict Rules)

1. **Giao tiếp RPC**: `packages/ui`, `packages/client`, `packages/contract` tuyệt đối không import `node:*`, `electron`, `pg`, hay `mysql2`. Mọi dữ liệu phải đi qua RPC Transport.
2. **Không rẽ nhánh theo engine**: Không viết `if (driverId === 'mysql')` trong UI logic. Mọi phân nhánh dựa vào `capabilities`.
3. **Không phụ thuộc môi trường chạy**: Không dùng `if (isElectron)` hay `window.electron` trong component UI. Sử dụng `Transport` và `FileGateway`.
4. **Cơ chế Preview-token**: Mọi thao tác GHI vào database phải hiển thị SQL preview trước cho người dùng (`preview*` → `apply*(previewToken)`).
5. **An toàn SQL**: Tuyệt đối không ghép chuỗi SQL thủ công. Sử dụng `sql` template tag hoặc `quoteIdentifier`.

---

## 📖 Tài liệu kỹ thuật chi tiết

Tất cả tài liệu thiết kế kiến trúc, đặc tả chức năng (SPEC), quyết định kỹ thuật (ADR), và kế hoạch phát triển nằm trong thư mục `docs/`:

- **Bản đồ tài liệu**: [`docs/README.md`](docs/README.md)
- **Quy tắc code & Luật làm việc**: [`docs/05-rules/AGENTS.md`](docs/05-rules/AGENTS.md) · [`docs/05-rules/coding-rules.md`](docs/05-rules/coding-rules.md)
- **Kiến trúc hệ thống**: [`docs/02-architecture/overview.md`](docs/02-architecture/overview.md)
- **Lộ trình phát triển**: [`docs/04-plan/roadmap.md`](docs/04-plan/roadmap.md) · [`docs/04-plan/backlog.md`](docs/04-plan/backlog.md)