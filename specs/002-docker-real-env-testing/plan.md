# Implementation Plan: Môi trường DB thật trên Docker & loại bỏ mockup

**Branch**: `002-docker-real-env-testing` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-docker-real-env-testing/spec.md`

## Summary

Dựng một môi trường 7 engine database chạy bằng Docker Compose (SQL Server ở **1434**, MariaDB ở **3307** để không đụng cổng đang dùng), nạp sẵn một bộ dữ liệu mẫu tương đương nhau trên mọi engine, rồi **chuyển toàn bộ đường chạy mặc định của cả ba app (web client, web server, desktop) sang engine thật** và **chuyển bộ test tích hợp từ testcontainers-mỗi-lần-chạy sang stack cố định + cách ly bằng schema riêng cho từng lần chạy**.

Cách tiếp cận kỹ thuật: giữ nguyên 7 driver (đã kết nối thật). Việc cần làm nằm ở 4 chỗ — **hạ tầng** (`docker/dev-db/`), **công cụ vòng đời** (`tools/devdb/`), **tầng test dùng chung** (`packages/driver-core/src/testenv/`), và **cắt mock khỏi đường phục vụ** (`packages/ui`, `apps/desktop/main`, root `src/`). Điểm rủi ro lớn nhất không phải Docker mà là A-11/A-12: mock đã lan tới 8 file production của UI và đang **là backend của toàn bộ bản desktop**.

## Technical Context

**Language/Version**: TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`), Node ≥ 20 (khuyến nghị 22 LTS), ESM
**Primary Dependencies**: pnpm 11 + Turborepo 2.10 · Vitest 3.2 · testcontainers 12 · Docker Compose v2 · 7 driver gốc (`pg`, `mysql2`, `better-sqlite3`, `mssql`, `oracledb`, `mongodb`, `ioredis`)
**Storage**: engine đích chạy trong container; `workspace.db` (SQLite qua `@corvus/storage`) giữ connection profile + vault
**Testing**: Vitest — unit ở root config (loại trừ `*.integration.test.ts`), tích hợp qua `turbo run test:integration` với config riêng mỗi package
**Target Platform**: Docker Desktop / Windows 11 là môi trường chuẩn; compose và script không dùng thứ riêng Windows để Linux/macOS vẫn chạy
**Project Type**: Monorepo 24 packages & apps (web client + web server + desktop main/preload/renderer + 19 library, gồm `@corvus/host` tạo trong feature này)
**Performance Goals**: khởi tạo môi trường mặc định ≤ 5 phút (SC-010a) · CI mỗi-PR ≤ 15 phút cho 5 engine (SC-008a) · test tích hợp local nhanh hơn hiện tại ≥ 60% (SC-006)
**Constraints**: cổng 1433 bất khả xâm phạm (FR-003a) · dữ liệu mẫu chỉ đọc với test (FR-021a) · không có đường mặc định nào tới dữ liệu giả (FR-013) · mọi cổng ghi vào DB vẫn phải qua preview-token (điều cấm #5)
**Scale/Scope**: 7 engine + nhánh MariaDB · bảng 100k dòng seed mặc định + 1M sinh theo yêu cầu · 41 FR / 5 SR / 16 SC · 92 task

## Constitution Check

*GATE: phải qua trước Phase 0. Kiểm lại sau Phase 1.*

Dự án **không có** `.specify/memory/constitution.md` cục bộ. Nguồn luật thật là [docs/05-rules/AGENTS.md](docs/05-rules/AGENTS.md) §2 ("Mười điều tuyệt đối cấm"), [docs/05-rules/coding-rules.md](docs/05-rules/coding-rules.md), và 7 luật `dependency-cruiser` trong [.dependency-cruiser.cjs](.dependency-cruiser.cjs). Kiểm theo đó:

| # | Luật | Trạng thái | Ghi chú |
|---|---|---|---|
| Cấm 1 | `ui`/`client` không import `node:*`, `electron`, driver | ✅ Pass | Không thêm import nào ở hai package đó; việc bỏ mock chỉ **xoá** phụ thuộc |
| Cấm 2 | Không rẽ nhánh theo `driverId` | ⚠️ **Cần cẩn trọng** | Seed script và ánh xạ cách ly (FR-021b) **buộc phải** biết engine. Giải: khu trú toàn bộ tri thức theo engine vào `ConformanceDialect` + một `TestEnvDialect` mới ở `driver-core` — nơi đã được phép biết engine. Không có `if (driverId===...)` nào rò vào `ui`/`engine` |
| Cấm 3 | Không `isElectron` trong component | ✅ Pass | Chế độ mock chọn bằng **entry point** (`dev:mock`), không phải cờ runtime trong component |
| Cấm 4 | Không ghép chuỗi SQL | ⚠️ **Cần cẩn trọng** | Seed SQL là **file .sql tĩnh viết tay**, không phải SQL sinh tự động → ngoài phạm vi luật. Nhưng tên schema cách ly là **sinh động** → phải qua `quoteIdentifier` (FR-021b) |
| Cấm 5 | Ghi DB phải qua preview-token | ✅ Pass | Seed và cách ly test không đi qua RPC ứng dụng; không nới lỏng preview-token ở đâu |
| Cấm 6 | Không đưa secret vào log | ⚠️ **Cần test** | `docker compose` in biến môi trường ra log rất dễ; SR-003 buộc redact. Cần một test hồi quy |
| Cấm 7 | Không trả cả mảng trong driver | ✅ Pass | Không sửa driver |
| Cấm 8 | **Không tự quyết định kiến trúc** (đổi ranh giới package) | ✅ **ĐÃ PHÊ DUYỆT 2026-08-21** | Người phụ trách chọn phương án (a): tạo package mới **`@corvus/host`** làm chỗ ở duy nhất của `buildEngine()`. Xem [Complexity Tracking](#complexity-tracking) |
| Cấm 9 | Không `eslint-disable` không giải thích | ✅ Pass | Không dự kiến cần |
| Cấm 10 | Không báo xong khi chưa chạy `pnpm verify` | ✅ Pass | Mọi mốc trong kế hoạch đều kèm lệnh kiểm chứng |
| depcruise `no-engine-in-ui` | `ui`/`client` ⇏ `engine`/`driver-*`/`storage` | ✅ Pass | `transport-mock` không nằm trong danh sách chặn — nên A-01/A-02/A-12 **lọt qua được cổng máy**. Kế hoạch bổ sung luật để cổng bắt được lần sau |
| depcruise `no-orphans` | File mới phải reachable | ⚠️ **Cần cẩn trọng** | `docker/` và seed `.sql` không nằm trong graph TS nên không bị ảnh hưởng; `tools/devdb/` phải có entry point được `package.json` gọi |
| depcruise `contract-is-leaf` | `contract` không import package nội bộ | ✅ Pass | Không sửa `contract` |

**Kết luận cổng**: **qua được toàn bộ**. Mục duy nhất từng chặn (Cấm 8 — ranh giới package) đã được phê duyệt 2026-08-21 và đã hiện thực; xem §Đã thực thi. Ba mục ⚠️ còn lại là điều kiện thiết kế phải giữ, không phải cổng chặn — đã có task tương ứng trong `tasks.md`.

## Security Design

*Feature này xử lý credential database và input ngoài → bắt buộc điền (SR-001…SR-005).*

### Threat Model

| Threat | Impact | Mitigation |
|---|---|---|
| Test bị trỏ nhầm vào database production của người dùng | **Critical** — mất dữ liệu không khôi phục | FR-021 + chốt an toàn SR-005: test từ chối chạy nếu host không thuộc allowlist loopback, và từ chối nếu không thấy dấu hiệu môi trường phát triển |
| Credential dev bị dùng lại ở môi trường thật | High | SR-001: credential chỉ nằm trong file môi trường của `docker/dev-db/`, không đi vào `Dockerfile` sản phẩm; thêm bước kiểm ảnh phát hành |
| Cổng engine bị phơi ra mạng LAN | High | SR-002: mọi `ports:` bind `127.0.0.1:` tường minh, không dùng dạng ngắn `"5432:5432"` |
| Mật khẩu rò vào log test / báo cáo CI | Medium | SR-003 + test hồi quy cho `redact()` (đã có 39 test, mở rộng cho connection string mới) |
| Stack vô tình chạm SQL Server 1433 của người dùng | High | FR-003a: không map 1433 ở đâu; thêm kiểm chứng "cổng 1433 không thuộc stack" vào lệnh verify |
| Mock lọt vào bản phát hành | Medium | FR-013a + SC-012: kiểm bundle sau build, chặn `transport-mock` trong `dist/` của app |

### Data Protection

| Field | Classification | Storage | Access Control |
|---|---|---|---|
| Mật khẩu engine dev | Internal (dev-only) | file môi trường của `docker/dev-db/`, không commit giá trị thật | chỉ máy phát triển; redact khi log |
| Connection string trong README | Public (dev-only) | `README.md`, chỉ trỏ loopback | kèm cảnh báo không dùng cho môi trường thật |
| `CORVUS_MASTER_KEY` dev | Confidential | biến môi trường; dev dùng khoá cố định `'0'×64` như hiện tại | không log; production vẫn bắt buộc phải có (đã ép ở `engine.ts`) |
| Bộ dữ liệu mẫu | Public | volume Docker | dữ liệu bịa 100% (SR-004) |

### Auth Strategy

- Không thêm cơ chế xác thực mới. Tái dùng `EnvelopeVault` + `ensureLocalOwner()` đã có trong `@corvus/storage`.
- Không thêm permission scope mới; không sửa 76 method của registry RPC.

## Project Structure

### Documentation (this feature)

```text
specs/002-docker-real-env-testing/
├── plan.md              # File này
├── research.md           # Phase 0
├── data-model.md         # Phase 1 — mô hình bộ dữ liệu mẫu
├── quickstart.md         # Phase 1 — đường đi 30 phút của SC-001
├── contracts/            # Phase 1 — thay đổi hợp đồng (nếu có)
└── tasks.md              # Phase 2 (/speckit.tasks — KHÔNG sinh ở đây)
```

### Source Code (repository root)

```text
docker/dev-db/                        # MỚI — hạ tầng môi trường
├── compose.yaml                      #   7 service, bind 127.0.0.1, healthcheck từng engine
├── .env.example                      #   cổng + credential mặc định (FR-003, FR-007)
└── seed/
    ├── postgres/01-schema.sql  02-data.sql  03-bulk-100k.sql  04-bulk-1m.sql
    ├── mysql/     …             (dùng lại cho mariadb qua cùng script)
    ├── mssql/     …
    ├── oracle/    …
    ├── mongodb/   01-seed.js
    ├── redis/     01-seed.redis
    └── sqlite/    build-sample.sql   # sinh tệp .sqlite mẫu, không cần container

tools/devdb/                          # MỚI — vòng đời môi trường (tsx, như check-contract.ts)
├── index.ts                          #   up | down | reset | wait | bulk | doctor
├── ports.ts                          #   NGUỒN SỰ THẬT của bảng cổng (FR-003)
└── check-readme.ts                   #   chống lệch README ↔ cấu hình (FR-028)

packages/driver-core/src/testenv/     # MỚI — tầng test dùng chung, KHÔNG package mới
├── resolve.ts                        #   đọc profile từ biến môi trường; chốt an toàn SR-005
├── isolate.ts                        #   tạo/xoá không gian riêng mỗi lần chạy (FR-021)
└── dialect.ts                        #   ánh xạ cách ly theo engine (FR-021b)

packages/driver-core/src/conformance/
└── dialect.ts                        # SỬA — thêm MONGODB_ và REDIS_CONFORMANCE (FR-023)

packages/driver-mongodb/src/mongodb.integration.test.ts   # MỚI (FR-022)
packages/driver-redis/src/redis.integration.test.ts       # MỚI (FR-022)
packages/driver-mysql/src/mariadb.integration.test.ts     # MỚI — MariaDB dùng lại suite MySQL, cổng 3307 (A-08)

packages/ui/src/
├── data/schema.ts                    # XOÁ — thay bằng dữ liệu thật qua RPC (A-02, A-12)
├── index.ts                          # SỬA — bỏ re-export fixture (FR-015a)
├── store/studio.tsx                  # SỬA — bỏ fallback createMockTransport (A-01)
├── store/shell.ts                    # SỬA — 1 trong 8 file dùng fixture
├── views/{DataView,ObjectsView,BackupView,CompareView}.tsx   # SỬA — bỏ fallback mock
├── components/{FilterPanel,InfoPane}.tsx                     # SỬA
├── components/dialogs/UsersDialog.tsx                        # SỬA
└── components/MockModeBanner.tsx      # MỚI — dấu hiệu thường trực (FR-016a)

apps/desktop/main/src/index.ts        # SỬA — bỏ mockRouter, nối engine thật (A-11, FR-013a)
src/App.tsx · src/main.tsx            # SỬA — `pnpm dev` nối transport thật (Q1)
README.md                             # SỬA — bảng kết nối đầy đủ (FR-026…FR-029)
.github/workflows/integration.yml     # SỬA — 5 engine mỗi PR + job theo lịch (FR-025)
.dependency-cruiser.cjs               # SỬA — thêm luật chặn transport-mock khỏi đường phục vụ
```

**Structure Decision**: giữ nguyên monorepo 23 packages & apps. Thêm **hai thư mục ngoài graph TypeScript** (`docker/dev-db/`, `tools/devdb/` — `tools/` đã là chỗ ở của script tsx như `check-contract.ts`) và **một thư mục con trong package đã có** (`packages/driver-core/src/testenv/`). Chọn `driver-core` vì đó là nơi duy nhất đã được phép chứa tri thức theo engine (`conformance/dialect.ts` là tiền lệ) và mọi driver đã phụ thuộc nó — nên **không phát sinh package mới, không phát sinh luật phụ thuộc mới**, giữ Cấm 8 sạch cho nhóm việc này.

Ngoại lệ duy nhất cần phê duyệt: chỗ ở của `buildEngine()` khi chia sẻ giữa web server và desktop main — xem Complexity Tracking.

## Kitchen Recipe Reference

Kitchen Recipe **không phát hiện được**. Dự án không có `.kitchen/`, và `${CLAUDE_PLUGIN_ROOT}/scaffold/.kitchen/chef/kondate/patterns/` không có pattern nào khớp hạ tầng database phát triển. Nguồn quy tắc thay thế đã dùng: [docs/05-rules/coding-rules.md](docs/05-rules/coding-rules.md), [docs/02-architecture/driver-spi.md](docs/02-architecture/driver-spi.md), [docs/04-plan/testing-strategy.md](docs/04-plan/testing-strategy.md).

Cũng **không có** PDL domain model (`specs/002-docker-real-env-testing/domain-model.md` không tồn tại, không có marker `@parasol:`) → Phase 1 sinh `data-model.md` theo đường thông thường.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| ✅ **Package mới `@corvus/host`** (thứ 19 trong `packages/`) — chỗ ở duy nhất của `buildEngine()`. **Đã được người phụ trách phê duyệt 2026-08-21** theo Cấm 8 | Sửa A-11 đòi `apps/desktop/main` dùng đúng engine mà `apps/web/server` đang dựng, mà app không import được app. Không có chỗ dùng chung thì hoặc desktop tiếp tục giả (phá FR-013a), hoặc code dựng engine bị nhân bản và hai bên lệch nhau — đúng kiểu lỗi đã sinh ra A-11 | (b) đưa vào `packages/engine` bị loại vì sẽ buộc `engine` phụ thuộc cả 7 native driver, phá thế trung lập của driver registry và làm mọi consumer của `engine` kéo theo `oracledb`. (c) nhân bản code ở desktop bị loại vì nhân bản là nguyên nhân gốc của A-11 |
| Tri thức theo engine trong seed & cách ly test (căng với Cấm 2) | FR-021b buộc ánh xạ cách ly phải tường minh cho 7 engine; không có cách nào cách ly Redis giống PostgreSQL | Rẽ nhánh tại chỗ trong test bị loại vì đúng thứ Cấm 2 ngăn. Khu trú vào `TestEnvDialect` ở `driver-core` giữ được một chỗ duy nhất, kiểm được bằng mắt và bằng test |
| Giữ **hai** đường chạy test (stack cố định ở local, testcontainers ở CI) | Assumption 6: CI không có stack chạy sẵn; local cần nhanh và soi được dữ liệu khi test đỏ | Chỉ giữ một đường bị loại: bỏ testcontainers thì CI phải tự dựng compose (chậm, khó dọn); bỏ stack cố định thì phá yêu cầu gốc của người dùng. Giảm rủi ro lệch bằng cách **bắt buộc hai đường dùng chung một bộ seed** |

---

## Phase 0 — Outline & Research

**Output**: [research.md](./research.md) — hoàn tất, 0 mục NEEDS CLARIFICATION còn lại.

## Phase 1 — Design & Contracts

**Output**: [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

## Constitution Re-check (sau Phase 1)

| Mục từng gắn cờ ở lần kiểm đầu | Kết quả sau thiết kế |
|---|---|
| Cấm 2 — rẽ nhánh theo `driverId` | ✅ **Giải quyết**: [research.md §R-3](./research.md) khu trú toàn bộ tri thức theo engine vào `TestEnvDialect` (một file), và [contracts §C-2](./contracts/no-contract-change.md) ghi rõ chỉ file test được import. Không có nhánh nào rò vào `ui`/`engine` |
| Cấm 4 — ghép chuỗi SQL | ✅ **Giải quyết**: seed là `.sql` tĩnh viết tay (ngoài phạm vi luật); tên schema sinh động bắt buộc qua `quoteIdentifier` — ghi thành yêu cầu trong §R-3 |
| Cấm 6 — secret vào log | ✅ **Có thiết kế**: Security Design đặt bước redact + test hồi quy mở rộng cho connection string mới |
| Cấm 8 — ranh giới package | ✅ **ĐÃ GIẢI QUYẾT**: người phụ trách phê duyệt package mới `@corvus/host` (2026-08-21). Vùng ảnh hưởng đúng **một** package mới — tầng test đã tránh được package riêng bằng cách dùng `driver-core/src/testenv/`. Repo đi từ 23 lên **24 packages & apps** |
| depcruise `no-orphans` | ✅ **Giải quyết**: `tools/devdb/index.ts` được `package.json` gọi; `docker/` và `.sql` ngoài graph TS |
| depcruise thiếu luật chặn mock | ✅ **Có thiết kế**: [research.md §R-7](./research.md) bổ sung luật + cổng kiểm bundle |

**Điều khoản mới phát sinh trong Phase 1** — không có. Không thêm dependency mới, không thêm transport, không thêm endpoint HTTP, không đổi schema `workspace.db`, 0 thay đổi hợp đồng RPC.

## Đã thực thi trong bước này

Sau khi Cấm 8 được phê duyệt, phần **tạo package `@corvus/host`** đã làm luôn (không đợi `/speckit.tasks`) vì đó là điều kiện tiên quyết của nhóm việc A-11:

| Thay đổi | File |
|---|---|
| Package mới `@corvus/host` (24 packages & apps) | `packages/host/{package.json,tsconfig.json}` · `packages/host/src/index.ts` |
| `buildEngine()` chuyển chỗ ở (giữ lịch sử git qua `git mv`) | `apps/web/server/src/engine.ts` → `packages/host/src/engine.ts` |
| Khai báo path | `tsconfig.base.json` — thêm `@corvus/host` + `@corvus/host/*` |
| Web server dùng package mới | `apps/web/server/package.json` (thêm dep) · `apps/web/server/src/index.ts` (`from './engine'` → `from '@corvus/host'`) |
| Tài liệu khớp số package | `README.md` (cây package + 2 chỗ đếm) · `AGENTS.md` · `docs/README.md` · `docs/02-architecture/monorepo.md` |

**Kiểm chứng — `pnpm verify` xanh đủ 6 bước** (chạy 2026-08-21):

```text
eslint          22 problems (0 errors, 22 warnings)   ← warning là nợ có sẵn, không phát sinh mới
depcruise       no dependency violations (426 modules, 1074 dependencies)
typecheck       24 successful, 24 total
test            40 files · 335 passed, 2 skipped
build           5 successful · app-web-server dist 435.86 KB
check:contract  76 method, 76 handler — OK
```

**Chưa làm** (thuộc `/speckit.tasks`): nối `apps/desktop/main` vào `buildEngine()` để bỏ `mockRouter` (FR-013a) — package đã sẵn sàng, đây giờ là một thay đổi nhỏ trong một file.

## Ghi chú thực thi

**`update-agent-context.sh claude` thất bại có chủ ý được giữ nguyên.** Script muốn tạo `CLAUDE.md` ở gốc repo từ một template không tồn tại (`.specify/templates/agent-file-template.md`). Không có file nào được tạo — và đây là kết quả đúng: repo này dùng [AGENTS.md](AGENTS.md) làm con trỏ tài liệu duy nhất ("Đây là **con trỏ**. Nội dung thật nằm trong `docs/`"), nên thêm một `CLAUDE.md` song song sẽ tạo hai nguồn sự thật. Ngữ cảnh kỹ thuật của feature nằm ở chính file này thay vì ở một file agent riêng.

## Phase 2 — Tasks

Không sinh ở bước này. Chạy `/speckit.tasks`.
