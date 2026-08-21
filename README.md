# Corvus DB Studio 🦅

**Corvus DB Studio** là công cụ quản trị cơ sở dữ liệu đa nền tảng hiện đại, hiệu năng cao (tương tự Navicat / DBeaver / DataGrip), được phát hành đồng thời dưới dạng **Web Application** và **Windows Desktop Application** từ một codebase duy nhất.

Hỗ trợ các hệ quản trị cơ sở dữ liệu:
- **Relational**: PostgreSQL, MySQL / MariaDB, SQLite, SQL Server (MSSQL), Oracle
- **NoSQL / Cache**: MongoDB, Redis

---

## 🏗️ Kiến trúc Monorepo

Hệ thống được tổ chức theo mô hình Monorepo (quản lý bởi `pnpm` + `Turborepo`) gồm **24 packages & apps**:

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
│   ├── host/                   # buildEngine() — dựng engine thật dùng chung cho web server & desktop main
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

## 🐳 Môi trường Database Thật (Docker Dev Database)

Corvus DB Studio hỗ trợ môi trường 7 engine database thật chạy trên Docker để phát triển và kiểm thử tích hợp:

```bash
pnpm db:up        # Khởi động toàn bộ 7 container database trên Docker
pnpm db:wait      # Chờ tất cả database sẵn sàng kết nối (health check)
pnpm db:doctor    # Kiểm tra trạng thái và kết nối tới toàn bộ 7 engine
pnpm db:reset     # Reset toàn bộ dữ liệu về trạng thái hạt giống ban đầu (seed)
pnpm db:down      # Dừng toàn bộ các container database
pnpm db:bulk      # Nạp thêm dữ liệu lớn (10.000 dòng) phục vụ test hiệu năng
```

### Bảng cổng & Thông tin kết nối mặc định

| Engine | Cổng Host (127.0.0.1) | Database | User | Mật khẩu | Connection String mẫu |
|---|---|---|---|---|---|
| **PostgreSQL** | `5432` | `corvus_dev` | `corvus` | `corvus_dev_pw` | `postgresql://corvus:corvus_dev_pw@127.0.0.1:5432/corvus_dev` |
| **MySQL** | `3306` | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mysql://corvus:corvus_dev_pw@127.0.0.1:3306/corvus_dev` |
| **MariaDB** | `3307` | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mariadb://corvus:corvus_dev_pw@127.0.0.1:3307/corvus_dev` |
| **SQL Server** | `1434` *(xem lưu ý)* | `corvus_dev` | `sa` | `Corvus_dev_pw1` | `sqlserver://sa:Corvus_dev_pw1@127.0.0.1:1434/corvus_dev` |
| **Oracle** | `1521` | `FREEPDB1` | `CORVUS_DEV` | `corvus_dev_pw` | `oracle://CORVUS_DEV:corvus_dev_pw@127.0.0.1:1521/FREEPDB1` |
| **MongoDB** | `27017` | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mongodb://corvus:corvus_dev_pw@127.0.0.1:27017/corvus_dev` |
| **Redis** | `6379` | `corvus:dev:*` | *(trống)* | `corvus_dev_pw` | `redis://:corvus_dev_pw@127.0.0.1:6379` |
| **SQLite** | *(tệp)* | `.corvus-data/sample.sqlite` | — | — | *(chọn tệp cục bộ)* |

> ⚠️ **QUY TẮC AN TOÀN CỔNG 1433**:
> Cổng `1433` thuộc về instance SQL Server host đang chạy trên máy trạm của người dùng (`crm-app_sqldb` / Azure SQL Edge). Dev-db tuyệt đối **không map**, **không dừng**, **không can thiệp** vào cổng `1433`. Toàn bộ container SQL Server của Corvus DB Studio map trên cổng **`1434`** (`127.0.0.1:1434:1433`).

---

## 💻 Hướng dẫn chạy ứng dụng (Development)

### Cách 1: Chạy Web đầy đủ với backend thật (Khuyến nghị)
Khởi động máy chủ RPC backend và ứng dụng Web client kết nối tới Docker database:

```bash
pnpm db:up        # Đảm bảo database đã chạy
pnpm dev:web      # Khởi động Web client + Web server
```
👉 Mở trình duyệt tại: **http://localhost:5173**

---

### Cách 2: Chạy Desktop App thật (Windows Electron)
Khởi động ứng dụng desktop native kết nối trực tiếp với database qua engine thật `@corvus/host`:

```bash
pnpm db:up        # Đảm bảo database đã chạy
pnpm dev:desktop
```

---

### Cách 3: Chạy chế độ Giả lập (Mock Mode — không cần Docker)
Nếu máy tính không có Docker hoặc cần phát triển nhanh giao diện mà không cần kết nối database thật:

```bash
pnpm dev:mock
```
Ứng dụng sẽ hiển thị banner màu cảnh báo `MÔI TRƯỜNG DỮ LIỆU GIẢ LẬP` ở đầu trang.

---

## 🛠️ Các lệnh kiểm chứng & Build (Scripts)

| Lệnh | Mô tả |
|---|---|
| `pnpm typecheck` | Kiểm tra TypeScript typecheck trên toàn bộ 24 packages & apps |
| `pnpm build` | Build toàn bộ các packages và bundles qua Turborepo |
| `pnpm build:app` | Build bundle cho ứng dụng web chính |
| `pnpm preview` | Chạy thử bản production build của Web app tại local |
| `pnpm test` | Chạy bộ kiểm thử tự động unit tests (`vitest run`) |
| `pnpm test:it` | Chạy bộ kiểm thử integration tests trên database thật trong Docker |
| `pnpm lint` | Kiểm tra linting (`eslint`) và kiến trúc phụ thuộc (`dependency-cruiser`) |
| `pnpm check:contract` | Kiểm tra độ phủ và tính tương thích của handler so với contract RPC |
| `pnpm check:devdb` | Kiểm tra tài liệu hoá cổng trong README.md và trạng thái kết nối 7 engine |
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