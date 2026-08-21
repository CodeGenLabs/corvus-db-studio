# Tasks: Môi trường DB thật trên Docker & loại bỏ mockup

**Input**: Design documents from `/specs/002-docker-real-env-testing/`
**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: **BẮT BUỘC có**. Feature này *về* phương thức test (US3), và [docs/04-plan/definition-of-done.md](docs/04-plan/definition-of-done.md) không cho tuyên bố xong mà không có test + output lệnh.

**Organization**: Task nhóm theo user story để mỗi story hiện thực và kiểm chứng độc lập được.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (file khác nhau, không phụ thuộc task chưa xong)
- **[Story]**: user story tương ứng ([US1]…[US5])
- Mọi task đều ghi đường dẫn file chính xác

## Path Conventions

Monorepo 24 packages & apps: `packages/*`, `apps/web/*`, `apps/desktop/*`, `tools/*`, `docker/*` từ gốc repo. Không có `backend/`/`frontend/`.

## Kitchen Recipe Reference

Không có (xem [plan.md](./plan.md) §Kitchen Recipe Reference). Không có `depends-on` để sắp xếp; thứ tự dưới đây dẫn xuất từ dependency thật giữa các file.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: khung thư mục và nguồn sự thật của cấu hình, chưa có engine nào chạy

- [x] T001 ~~Tạo package `@corvus/host` với `buildEngine()` chuyển từ `apps/web/server/src/engine.ts`~~ — **ĐÃ XONG 2026-08-21**, `pnpm verify` xanh 6/6. Xem [plan.md §Đã thực thi](./plan.md)
- [ ] T002 Tạo `tools/devdb/ports.ts` — nguồn sự thật duy nhất của bảng cổng + credential + tên database cho 7 engine, theo bảng ở [spec.md FR-003](./spec.md) và [quickstart.md §4](./quickstart.md). Export kiểu `EngineEnvSpec` và hằng `DEV_DB_ENV`
- [ ] T003 [P] Tạo `docker/dev-db/.env.example` sinh từ hình dạng của `tools/devdb/ports.ts` — mọi cổng và mật khẩu có thể ghi đè bằng biến môi trường (FR-007)
- [ ] T004 [P] Tạo khung `docker/dev-db/compose.yaml` với 7 service **chưa có seed** (FR-002): image theo [research.md §R-1](./research.md), `ports` bind tường minh `127.0.0.1:` (SR-002), volume có tên, `healthcheck` cho từng engine (FR-004)
- [ ] T005 Tạo `tools/devdb/index.ts` — khung CLI với 6 lệnh `up | down | reset | wait | bulk | doctor`, mỗi lệnh còn rỗng, parse `--only <danh sách engine>` (FR-005)
- [ ] T006 Thêm script vào `package.json` gốc: `db:up`, `db:down`, `db:reset`, `db:doctor`, `db:bulk` trỏ vào `tsx tools/devdb/index.ts <lệnh>` (theo khuôn `check:contract` đã có) (FR-001)
- [ ] T006a ⏱️ **ĐO BASELINE — PHẢI LÀM TRƯỚC MỌI THAY ĐỔI KHÁC**. Chạy `pnpm test:it` trên đường testcontainers hiện tại, ghi thời gian từng package vào `docker/dev-db/README.md` §Baseline. Sau T009 (sửa `fixture.ts`) và T052–T057 (chuyển đổi test) thì **không còn cách nào lấy lại mốc này** — mất nó là mất luôn khả năng chứng minh SC-006 (FR-019, SC-006)

**Checkpoint**: `pnpm db:doctor` chạy được và báo "chưa khởi động"; baseline đã ghi; `pnpm verify` vẫn xanh

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: hạ tầng chung mà **cả ba** story P1 đều cần. Đây là chỗ quyết định "một nguồn seed duy nhất" ([research.md §R-5](./research.md)) — làm sai ở đây thì US1 và US3 lệch nhau về sau

**⚠️ CRITICAL**: không story nào bắt đầu được trước khi phase này xong

- [ ] T007 Viết `docker/dev-db/seed/postgres/01-schema.sql` + `02-data.sql` cho schema `corvus_dev` theo [data-model.md §2](./data-model.md): giữ nguyên 5 thực thể của `corvus_conf` + thêm `customer`, `customer_summary`, `fn_customer_total`, `trg_order_log_touch`, `corvus_env_marker`
- [ ] T008 Viết `docker/dev-db/seed/postgres/03-bulk-100k.sql` sinh `order_log` ~100.000 dòng **deterministic** — id và giá trị cố định, `placed_at` = mốc cố định + offset theo id, không dùng `now()` hay ngẫu nhiên không hạt giống (FR-011, FR-012)
- [ ] T009 Chuyển `packages/driver-core/src/conformance/fixture.ts` sang **đọc từ** `docker/dev-db/seed/` thay vì giữ SQL riêng — đây là điểm chống lệch giữa hai đường test ([research.md §R-5](./research.md)). Hai tiêu chí bắt buộc: (1) `runConformanceSuite(postgresDriver, {profile})` vẫn xanh **đúng số test cũ**; (2) **`pnpm test` phải xanh mà KHÔNG cần Docker chạy** — `packages/driver-sqlite/src/sqlite.conformance.test.ts` nằm trong bộ unit test (root vitest chỉ loại trừ `*.integration.test.ts`), nên fixture chỉ được đọc file `.sql` đã commit, tuyệt đối không đòi container
- [ ] T010 [P] Tạo `packages/driver-core/src/testenv/dialect.ts` — interface `TestEnvDialect` + khai báo cho 7 engine theo bảng ở [research.md §R-3](./research.md). Mọi tên định danh sinh động phải qua `quoteIdentifier` của `@corvus/sql` (điều cấm #4)
- [ ] T011 [P] Tạo `packages/driver-core/src/testenv/resolve.ts` — đọc profile từ biến môi trường và áp **3 lớp chốt an toàn** của [research.md §R-4](./research.md): allowlist loopback, cổng khớp bảng, và bắt buộc thấy `corvus_env_marker`. Không thoả → ném lỗi có thông điệp chỉ rõ lớp nào chặn (SR-005)
- [ ] T012 Tạo `packages/driver-core/src/testenv/isolate.ts` — `withIsolatedSpace(driver, fn)`: tạo không gian `corvus_t_<id>`, chạy `fn`, xoá kể cả khi `fn` ném (FR-021)
- [ ] T013 Thêm dọn tàn dư vào `packages/driver-core/src/testenv/isolate.ts` — phát hiện và xoá không gian `corvus_t_*` mồ côi từ lần chạy bị hủy (FR-021c)
- [ ] T014 [P] Viết unit test `packages/driver-core/src/testenv/__tests__/resolve.test.ts` — 3 lớp chốt an toàn phải chặn đúng: host ngoài loopback bị từ chối, cổng lạ bị từ chối, thiếu marker bị từ chối (SR-005)
- [ ] T015 [P] Viết unit test `packages/driver-core/src/testenv/__tests__/dialect.test.ts` — mọi engine có khai báo, tên sinh ra đều được quote, không engine nào thiếu hàm xoá (FR-021b)
- [ ] T015a [P] Viết `tools/devdb/__tests__/seed-coverage.test.ts` — quét `docker/dev-db/seed/**` và khẳng định **từng engine** phủ đủ danh sách kiểm của FR-010: kiểu đặc thù engine, NULL **và** chuỗi rỗng cùng tồn tại, dữ liệu nhị phân, Unicode, tên định danh có dấu cách/chữ hoa, khoá ngoại, index, view, stored routine, trigger. Mục nào engine không hỗ trợ thì phải **khai báo tường minh là không hỗ trợ**, không được thiếu trong im lặng (FR-010)
- [ ] T016 Cài `seed_version` + state machine của [data-model.md §4](./data-model.md) vào `tools/devdb/index.ts` — marker ghi **sau cùng**; `up` phát hiện DỞ DANG và `seed_version` lệch (FR-012)

**Checkpoint**: `pnpm test` xanh với test mới **và không cần Docker**; `pnpm --filter @corvus/driver-postgres test:integration` vẫn xanh đúng số test cũ (chứng minh T009 không phá gì)

---

## Phase 3: User Story 1 — Bật toàn bộ engine bằng một lệnh (Priority: P1) 🎯 MVP

**Goal**: một lệnh dựng đủ 7 engine, mỗi engine có bộ dữ liệu mẫu tương đương, không engine nào chiếm 1433

**Independent Test**: trên máy sạch (có SQL Server chiếm 1433), chạy `pnpm db:up` rồi kết nối tới từng engine bằng đúng thông tin của `ports.ts` và truy vấn `order_log` — hoàn tất mà không cần bất kỳ story nào khác

### Tests for User Story 1

- [ ] T017 [P] [US1] Viết `tools/devdb/__tests__/ports.test.ts` — khẳng định **không cổng nào bằng 1433** (FR-003a, SC-002), MariaDB ≠ MySQL, mọi engine có mục đầy đủ
- [ ] T018 [P] [US1] Viết `tools/devdb/__tests__/compose.test.ts` — phân tích `compose.yaml`: mọi `ports` đều bind `127.0.0.1:` (SR-002), mọi service có `healthcheck` (FR-004), image khớp `research.md §R-1`

### Implementation for User Story 1

- [ ] T019 [P] [US1] Viết seed MySQL `docker/dev-db/seed/mysql/{01-schema,02-data,03-bulk-100k}.sql` — `corvus_dev` là **database** (không có tầng schema), `json` thay `jsonb`, `blob` thay `bytea`
- [ ] T020 [P] [US1] Trỏ service MariaDB trong `docker/dev-db/compose.yaml` vào **cùng** thư mục seed MySQL — không nhân bản script (A-08)
- [ ] T021 [P] [US1] Viết seed SQL Server `docker/dev-db/seed/mssql/{01-schema,02-data,03-bulk-100k}.sql` — `nvarchar`, `datetimeoffset`, `varbinary`
- [ ] T022 [P] [US1] Viết seed Oracle `docker/dev-db/seed/oracle/{01-schema,02-data,03-bulk-100k}.sql` — schema = user `CORVUS_DEV`, `NUMBER`/`VARCHAR2`, xử lý định danh chữ hoa
- [ ] T023 [P] [US1] Viết seed MongoDB `docker/dev-db/seed/mongodb/01-seed.js` — collection tương đương, `Long`/`Decimal128`/`BinData`/`Date`/`null` trong `types_probe`, 100.000 document `order_log`
- [ ] T024 [P] [US1] Viết seed Redis `docker/dev-db/seed/redis/01-seed.redis` — HASH theo khoá `corvus:dev:<entity>:<id>`, SET chỉ mục cho quan hệ, 100.000 khoá `order_log`, marker `corvus:dev:marker`
- [ ] T025 [P] [US1] Viết `docker/dev-db/seed/sqlite/build-sample.ts` — sinh `.corvus-data/sample.sqlite` bằng `better-sqlite3` (không container) (FR-002)
- [ ] T026 [US1] Hoàn thiện `docker/dev-db/compose.yaml`: mount seed vào `/docker-entrypoint-initdb.d/` (PostgreSQL, MySQL, MariaDB, MongoDB) và `/container-entrypoint-initdb.d/` (Oracle) theo [research.md §R-2](./research.md)
- [ ] T027 [US1] Cài lệnh `up` trong `tools/devdb/index.ts`: khởi động → chờ khoẻ → nạp phần image không tự nạp được (**SQL Server qua `sqlcmd`, Redis qua `redis-cli`**) → sinh tệp SQLite → ghi marker sau cùng (FR-001, FR-008, R-2)
- [ ] T028 [US1] Cài lệnh `wait` trong `tools/devdb/index.ts` — chờ mọi engine (hoặc tập `--only`) đạt trạng thái khoẻ, timeout có thông điệp chỉ rõ engine nào chưa lên (FR-004)
- [ ] T029 [US1] Cài lệnh `down` và `reset` trong `tools/devdb/index.ts` — `down` giữ dữ liệu, `reset` xoá volume và seed lại (FR-006)
- [ ] T030 [US1] Cài lệnh `doctor` trong `tools/devdb/index.ts` — bảng: engine · cổng · khoẻ · phiên bản server thật · đã seed · số dòng bảng mẫu · **engine nào đã được integration test phủ và engine nào bị bỏ qua kèm lý do** ([research.md §R-8](./research.md), FR-024)
- [ ] T031 [US1] Cài lệnh `bulk` và `bulk --drop` trong `tools/devdb/index.ts` + `docker/dev-db/seed/*/04-bulk-1m.sql` — sinh/xoá `order_log_bulk` ~1.000.000 dòng, **không** nằm trong `up` (FR-011a, FR-011b)
- [ ] T032 [US1] Xử lý xung đột cổng trong `tools/devdb/index.ts`: `up` thất bại phải nêu engine nào, cổng nào, và cách ghi đè (Edge case "port is already allocated")
- [ ] T033 [US1] Đo và ghi số thật vào `docker/dev-db/README.md`: thời gian `up` lần đầu từng engine, dung lượng volume, RAM cần — dữ liệu cho SC-010a và cho mục Yêu cầu của README

**Checkpoint**: `pnpm db:up` → `pnpm db:doctor` báo 7/7 khoẻ + đã seed; `netstat` chứng minh 1433 không thuộc stack; US1 giao được độc lập

---

## Phase 4: User Story 2 — Ứng dụng luôn nói chuyện với database thật (Priority: P1)

**Goal**: mọi đường chạy mặc định của cả ba app (root dev, web, desktop) dùng engine thật; mock chỉ còn ở một lệnh có tên rõ ràng, có banner

**Independent Test**: với stack đang chạy, mở app, sửa một hàng trực tiếp trong database bằng công cụ khác rồi refresh — thấy đúng giá trị mới. Tắt backend → thấy lỗi kết nối, **không** thấy dữ liệu

### Tests for User Story 2

- [ ] T034 [P] [US2] Viết `packages/ui/src/__tests__/no-mock-default.test.ts` — `CorvusApp` không có transport phải **lỗi kiểu lúc biên dịch**, và runtime không rơi về mock (FR-013, [contracts §C-3](./contracts/no-contract-change.md))
- [ ] T035 [P] [US2] Viết `tools/__tests__/no-mock-in-bundle.test.ts` — `dist/` của 3 app Node và bundle web **không** chứa chuỗi nhận diện fixture mock (SC-012, [research.md §R-7](./research.md)). Test này phải **đỏ** trước khi sửa, vì `apps/desktop/main/dist/index.cjs:5403` đang có. ⚠️ `dist/` bị gitignore nên test phải **tự kiểm tra bundle đã tồn tại** và fail nếu chưa build — nếu không thì trên máy sạch nó pass giả

### Implementation for User Story 2

- [ ] T036 [US2] Thêm luật `dependency-cruiser` `no-mock-in-runtime` vào `.dependency-cruiser.cjs` — chặn `packages/transport-mock` khỏi `packages/ui`, `apps/desktop/main`, `apps/web/server`, `src/`; chỉ cho phép ở file test và entry point mock. Đây là lỗ đã làm A-01/A-02/A-12 lọt cổng (SC-004)
- [ ] T037 [US2] Bỏ fallback mock ở `packages/ui/src/store/studio.tsx:80` — `transport` trở thành **bắt buộc** ([contracts §C-3](./contracts/no-contract-change.md))
- [ ] T038 [US2] Xoá `packages/ui/src/data/schema.ts` và bỏ dòng re-export ở `packages/ui/src/index.ts:10` (FR-015, FR-015a)
- [ ] T039 [P] [US2] Chuyển `packages/ui/src/store/shell.ts` và `packages/ui/src/components/{FilterPanel,InfoPane}.tsx` sang lấy dữ liệu qua RPC thay vì `fieldsFor`/`TABLES` từ fixture (A-12)
- [ ] T040 [P] [US2] Chuyển `packages/ui/src/components/dialogs/UsersDialog.tsx` (`DB_USERS`) sang RPC (A-12)
- [ ] T041 [P] [US2] Chuyển `packages/ui/src/views/{BackupView,CompareView,ObjectsView}.tsx` (`BK_FILES`, `DIFF`, `TABLES`) sang RPC (A-12)
- [ ] T042 [US2] Bỏ **hai nhánh fallback mock** ở `packages/ui/src/views/DataView.tsx:78,101` — thay bằng trạng thái rỗng / lỗi tường minh (FR-014, SC-005)
- [ ] T043 [US2] Tạo `packages/ui/src/components/MockModeBanner.tsx` — dấu hiệu thường trực, không tự tắt, chuỗi đi qua hệ i18n 3 ngôn ngữ đã có; cờ nhận từ props do entry point truyền (FR-016a, [research.md §R-9](./research.md), điều cấm #3)
- [ ] T043a [US2] Viết `packages/ui/src/components/__tests__/mock-banner-coverage.test.tsx` — render **mọi** view ở chế độ mock và khẳng định `MockModeBanner` hiện diện ở 100%. Test phải liệt kê danh sách view lấy từ registry của shell, không hard-code, để view thêm sau này cũng bị bắt (SC-004a)
- [ ] T044 [US2] Sửa `src/main.tsx` + `src/App.tsx` — `pnpm dev` nối `createHttpTransport` tới web server thật (quyết định Q1 phương án A)
- [ ] T045 [US2] Tạo entry point mock riêng (`src/main.mock.tsx` + cấu hình Vite tương ứng) và script `dev:mock` trong `package.json` gốc — chỗ **duy nhất** dựng `createMockTransport`, luôn bật `MockModeBanner` (FR-016)
- [ ] T046 [US2] **Sửa A-11**: bỏ `createMockTransport` và `mockRouter` khỏi `apps/desktop/main/src/index.ts`, thay bằng `buildEngine()` từ `@corvus/host` (đã sẵn sàng ở T001) đưa vào `IpcRpcHost` (FR-013a)
- [ ] T047 [US2] Thêm `@corvus/host` vào `apps/desktop/main/package.json` và cấu hình `external` cho native module trong `apps/desktop/main/tsup.config.ts` giống `apps/web/server/tsup.config.ts` (`better-sqlite3`, `pg`, `oracledb`, …)
- [ ] T048 [US2] Bỏ `@corvus/transport-mock` khỏi `dependencies` của `packages/ui/package.json` và `apps/desktop/main/package.json`; chuyển sang `devDependencies` nơi còn cần cho test (FR-017)
- [ ] T049 [US2] Chuyển các test UI trong `packages/ui/src/**/__tests__/` đang dựa vào fixture qua `data/schema` sang dùng `transport-mock` **tường minh** — mock vẫn hợp lệ ở tầng unit test (FR-017)

**Checkpoint**: `pnpm dev` và `pnpm dev:desktop` đều hiện dữ liệu thật từ stack; `pnpm dev:mock` hiện banner; T035 chuyển từ đỏ sang xanh; `pnpm verify` xanh

---

## Phase 5: User Story 3 — Test ở local chạy trên dữ liệu test trong Docker (Priority: P1)

**Goal**: `pnpm test:it` dùng stack đang chạy + dữ liệu mẫu, cách ly bằng không gian riêng, và phủ cả 7 engine

**Independent Test**: với stack đang chạy, chạy `pnpm test:it` hai lần liên tiếp — cả hai xanh, dữ liệu mẫu không đổi một byte, không còn không gian `corvus_t_*` nào sót

### Tests for User Story 3

- [ ] T050 [P] [US3] Viết `packages/driver-core/src/testenv/__tests__/isolate.integration.test.ts` — không gian được tạo rồi xoá; `fn` ném thì vẫn xoá; hai lần chạy song song không đụng nhau (FR-021, SC-007a)
- [ ] T051 [P] [US3] Viết `packages/driver-core/src/testenv/__tests__/readonly-fixture.integration.test.ts` — đối chiếu tổng số dòng của `corvus_dev` trước và sau khi chạy suite (FR-021a, SC-007)

### Implementation for User Story 3

- [ ] T052 [US3] Chuyển `packages/driver-postgres/src/postgres.integration.test.ts` sang dùng `testenv/resolve.ts`: có biến môi trường → stack cố định, không có → testcontainers như cũ ([research.md §R-5](./research.md))
- [ ] T053 [P] [US3] Chuyển tương tự cho `packages/driver-mysql/src/mysql.integration.test.ts`
- [ ] T054 [P] [US3] Chuyển tương tự cho `packages/driver-mssql/src/mssql.integration.test.ts`
- [ ] T055 [P] [US3] Chuyển tương tự cho `packages/driver-oracle/src/oracle.integration.test.ts`
- [ ] T056 [P] [US3] Chuyển 7 file `packages/engine/src/__tests__/*.integration.test.ts` sang `testenv/resolve.ts`
- [ ] T057 [P] [US3] Chuyển `apps/web/server/src/__tests__/{server,ws}.integration.test.ts` sang `testenv/resolve.ts`
- [ ] T058 [P] [US3] **Mới**: `packages/driver-mongodb/src/mongodb.integration.test.ts` — kết nối MongoDB thật, introspect, stream cursor, ánh xạ lỗi (FR-022, khoả lấp A-06)
- [ ] T059 [P] [US3] **Mới**: `packages/driver-redis/src/redis.integration.test.ts` — kết nối Redis thật, SCAN streaming, ánh xạ lỗi (FR-022, khoả lấp A-06)
- [ ] T060 [P] [US3] **Mới**: `packages/driver-mysql/src/mariadb.integration.test.ts` — dùng lại suite MySQL trỏ vào cổng 3307, khẳng định nhánh MariaDB của driver hoạt động (A-08)
- [ ] T061 [US3] Thêm `test:integration` vào `packages/driver-sqlite/package.json` + `vitest.config.ts` (hiện thiếu, dù SQLite là engine thật thứ hai)
- [ ] T062 [US3] Cài chặn thất bại nhanh trong `packages/driver-core/src/testenv/resolve.ts`: khi môi trường không sẵn sàng, `pnpm test:it` **dừng ngay** với thông điệp nêu đúng lệnh cần chạy — không treo, không báo xanh (FR-020, state machine [data-model.md §4](./data-model.md))
- [ ] T063 [US3] Viết `packages/driver-core/src/testenv/__tests__/cross-engine-equivalence.integration.test.ts` — cùng câu hỏi "số khách theo quốc gia" cho cùng kết quả trên mọi engine hỗ trợ (FR-009)
- [ ] T064 [US3] Đo lại thời gian `pnpm test:it` trên stack cố định và **so với baseline đã ghi ở T006a**; ghi cả hai số vào `docker/dev-db/README.md` §Baseline, chứng minh cải thiện **≥ 60%** (SC-006)

**Checkpoint**: `pnpm test:it` xanh hai lần liên tiếp trên stack cố định; 7/7 engine có integration test (SC-008); `pnpm test:it` vẫn xanh trên testcontainers khi không có biến môi trường

---

## Phase 6: User Story 4 — Bảng kết nối là nguồn sự thật duy nhất (Priority: P2)

**Goal**: README có bảng kết nối đầy đủ, và sai lệch với cấu hình thật bị máy phát hiện

**Independent Test**: đổi một cổng trong `ports.ts` mà không sửa README → `pnpm verify` phải đỏ

### Tests for User Story 4

- [ ] T065 [P] [US4] Viết `tools/devdb/__tests__/check-readme.test.ts` — case âm: bảng README lệch cổng / lệch database / thiếu engine đều bị phát hiện (FR-028, SC-010)

### Implementation for User Story 4

- [ ] T066 [US4] Viết `tools/devdb/check-readme.ts` — phân tích bảng markdown trong `README.md`, so từng ô với `ports.ts`, lệch thì thoát khác 0 (theo khuôn `tools/check-contract.ts`)
- [ ] T067 [US4] Thêm bảng kết nối 8 dòng vào `README.md` theo [quickstart.md §4](./quickstart.md), kèm cảnh báo credential chỉ dùng local (FR-026, FR-029)
- [ ] T068 [US4] Thay mục "Cách 1: Chạy nhanh UI Shell ... với mock data" trong `README.md` bằng nội dung đúng sau Q1 — mặc định là dữ liệu thật, mock là lệnh riêng (Assumption 5)
- [ ] T069 [US4] Thêm mục vận hành môi trường vào `README.md`: `db:up/down/reset/doctor/bulk`, RAM tối thiểu, dung lượng, cách xử lý xung đột cổng, bảng xử lý sự cố từ [quickstart.md](./quickstart.md) (FR-027)
- [ ] T070 [US4] Thêm `check:devdb` (gồm `check-readme` + khẳng định 1433 không thuộc stack) vào script `verify` của `package.json` gốc — thành bước thứ 7 (FR-028, FR-003a)

**Checkpoint**: `pnpm verify` có 7 bước và xanh; cố tình gây lệch README → đỏ

---

## Phase 7: User Story 5 — Kiểm chứng đầy đủ 7 engine (Priority: P3)

**Goal**: cả 7 engine đi qua cùng bộ conformance trên server thật, CI phân tập rõ ràng, tài liệu không còn dòng phỏng đoán

**Independent Test**: chạy conformance từng engine trên stack và đối chiếu bảng hiện trạng trong `docs/04-plan/driver-roadmap.md` — mọi ô có bằng chứng từ output lệnh

### Implementation for User Story 5

- [ ] T071 [P] [US5] Thêm `MONGODB_CONFORMANCE` vào `packages/driver-core/src/conformance/dialect.ts` — dùng `skip` khai báo nhóm không áp dụng kèm lý do ([contracts §C-1](./contracts/no-contract-change.md), FR-023)
- [ ] T072 [P] [US5] Thêm `REDIS_CONFORMANCE` vào `packages/driver-core/src/conformance/dialect.ts` — Redis không có view/routine/trigger → skip kèm lý do (FR-023)
- [ ] T073 [US5] Cài báo cáo skip tường minh vào `packages/driver-core/src/conformance/runner.ts` — in "C6 skipped: <lý do>", không bỏ qua trong im lặng (FR-023, SC-009)
- [ ] T074 [US5] Sửa `.github/workflows/integration.yml` — job mỗi-PR chạy **PostgreSQL, MySQL, SQLite, Redis, MongoDB** (FR-025, mở rộng A-10)
- [ ] T075 [US5] Thêm job theo lịch vào `.github/workflows/integration.yml` — **SQL Server, Oracle, MariaDB** (FR-025a)
- [ ] T076 [US5] Thêm báo cáo phân tập vào `.github/workflows/integration.yml` (bước summary): engine nào thuộc tập nào, lần chạy theo-lịch gần nhất và kết quả (FR-025b) + báo hiệu khi job theo lịch đỏ (FR-025c)
- [ ] T077 [US5] Cập nhật bảng "Hiện trạng thật" ở `docs/04-plan/driver-roadmap.md` — mọi dòng kèm số test thật từ output lệnh, 0 dòng phỏng đoán (SC-011)

**Checkpoint**: conformance chạy được cho 7/7 engine; CI mỗi-PR ≤ 15 phút (SC-008a)

---

## Phase 8: Security Hardening

**Purpose**: SR-001…SR-005 của [spec.md](./spec.md) và Security Design của [plan.md](./plan.md)

- [ ] T078 [P] Mở rộng test hồi quy `redact()` trong `packages/engine/src/__tests__/security-password-leak.test.ts` cho connection string của 7 engine mới — mật khẩu không được xuất hiện trong log, error, hay báo cáo test (SR-003, điều cấm #6)
- [ ] T079 [P] Viết `tools/__tests__/no-dev-credential-in-image.test.ts` — khẳng định `docker/dev-db/.env*` không bị `Dockerfile` sản phẩm copy vào ảnh, và ảnh phát hành không chứa credential dev (SR-001, SC-012)
- [ ] T080 [P] Viết test khẳng định mọi `ports` trong `compose.yaml` bind loopback — không có dạng ngắn `"5432:5432"` (SR-002)
- [ ] T081 Viết `tools/devdb/__tests__/seed-no-pii.test.ts` — quét `docker/dev-db/seed/**`, khẳng định không có dữ liệu cá nhân thật; email theo mẫu `@example.invalid` (SR-004)
- [ ] T082 Kiểm chứng chốt an toàn SR-005 bằng case âm thật trong `packages/driver-core/src/testenv/__tests__/resolve.test.ts`: trỏ biến môi trường vào một database không có marker → test phải **từ chối chạy**, không phải chạy rồi làm bẩn
- [ ] T082a [P] Viết `packages/driver-core/src/__tests__/not-implemented.test.ts` — khẳng định `notImplemented()` và `NotImplementedConnection` ném `UNSUPPORTED_FEATURE` chứ **không** trả dữ liệu bù. Hành vi này đã đúng trong mã hiện tại nhưng chưa có test bảo vệ — đúng lỗi mà `audit-2026-08-18.md` ghi lại (FR-018)
- [ ] T083 Rà `tools/devdb/index.ts` — không in mật khẩu ra terminal ở bất kỳ lệnh nào, kể cả `doctor` và thông điệp lỗi (SR-003)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T084 [P] Cập nhật `docs/04-plan/testing-strategy.md` §1 và §3 — tầng 3 giờ có hai đường (stack cố định ở local, testcontainers ở CI), ghi thời lượng thật đo được
- [ ] T085 [P] Cập nhật `docs/02-architecture/monorepo.md` §"Fixtures mock data" (dòng 115) — mock không còn ở đường phục vụ
- [ ] T086 [P] Ghi kết quả feature vào `docs/04-plan/backlog.md` theo đúng quy ước nhãn `[DONE ✔ <ngày>]` kèm output lệnh
- [ ] T087 Chạy trọn `quickstart.md` trên máy sạch, bấm giờ, và kết nối thử **từng dòng** trong bảng kết nối — chứng minh SC-001 (≤ 30 phút, không cần hỏi ai) và SC-003 (100% dòng nối được không cần sửa). Ghi số thật vào `README.md`
- [ ] T088 Chạy `pnpm verify` (7 bước, cấu hình ở `package.json`) + `pnpm test:it` (7 engine) và dán output vào PR — điều cấm #10

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: không phụ thuộc gì. T002 chặn T003, T004, T017
- **Phase 2 Foundational**: cần Phase 1. **CHẶN cả US1, US2, US3**
  - T007 → T008 → T009 (seed PostgreSQL là bản mẫu cho 6 engine còn lại)
  - T010 → T012 → T013
  - T011 độc lập với T010/T012
- **Phase 3 US1**: cần Phase 2 (đặc biệt T007–T009 làm khuôn seed, T016 làm state machine)
- **Phase 4 US2**: cần Phase 2. **Không** cần US1 để hiện thực, nhưng cần US1 để *kiểm chứng đầu-cuối* (T044/T046 muốn thấy dữ liệu thật)
- **Phase 5 US3**: cần Phase 2 **và** US1 (test cần stack chạy được)
- **Phase 6 US4**: cần T002 và US1 (bảng phải khớp cấu hình thật)
- **Phase 7 US5**: cần US1 và US3
- **Phase 8, 9**: cần các story mong muốn đã xong

### User Story Dependencies

| Story | Phụ thuộc | Ghi chú |
|---|---|---|
| US1 (P1) | Phase 2 | Độc lập hoàn toàn — **là MVP** |
| US2 (P1) | Phase 2 | Hiện thực độc lập; kiểm chứng đầu-cuối cần US1 |
| US3 (P1) | Phase 2 + **US1** | Không thể test trên stack chưa dựng được |
| US4 (P2) | T002 + US1 | — |
| US5 (P3) | US1 + US3 | — |

### Within Each User Story

- Test viết **trước** và phải **đỏ** trước khi hiện thực (rõ nhất ở T035: hiện đang đỏ thật vì `apps/desktop/main/dist/index.cjs:5403` có fixture mock)
- Seed trước công cụ vòng đời; công cụ trước test dùng nó
- `ports.ts` trước mọi thứ đọc cấu hình

### Parallel Opportunities

| Nhóm | Task chạy song song được | Vì sao an toàn |
|---|---|---|
| Seed 6 engine | T019, T021, T022, T023, T024, T025 | mỗi engine một thư mục riêng; T020 chỉ sửa compose nên tách ra |
| Chuyển đổi integration test | T053, T054, T055, T056, T057 | file khác nhau, đều dùng chung `testenv/resolve.ts` đã xong ở T011 |
| Integration test mới | T058, T059, T060 | ba package khác nhau |
| Chuyển UI khỏi fixture | T039, T040, T041 | file khác nhau; **T042 tách riêng** vì `DataView.tsx` cần bỏ fallback, không chỉ đổi nguồn dữ liệu |
| Conformance dialect | T071, T072 | cùng file `dialect.ts` → **KHÔNG song song được**, sửa tuần tự |
| Security | T078, T079, T080 | file test khác nhau |
| Tài liệu | T084, T085, T086 | file khác nhau |

> ⚠️ T071 và T072 cùng sửa `packages/driver-core/src/conformance/dialect.ts` — dù đánh `[P]` theo nhóm chức năng, **phải làm tuần tự** nếu do hai người/agent khác nhau thực hiện.

---

## Implementation Strategy

### MVP (giao được ngay)

**Phase 1 + Phase 2 + Phase 3 (US1)** = 35 task. Kết quả: một lệnh dựng đủ 7 engine với dữ liệu mẫu, không đụng cổng 1433. Tự nó đã giải quyết yêu cầu đầu tiên của người dùng và mở đường cho mọi phần sau.

### Thứ tự giao khuyến nghị

| Lô | Nội dung | Task | Giá trị chốt |
|---|---|---|---|
| 1 | Setup + Foundational + US1 | T002–T033 (gồm T006a, T015a) | Môi trường thật chạy được |
| 2 | US3 | T050–T064 | Test chạy trên dữ liệu thật — 7/7 engine (từ 5/7). T064 so với baseline T006a |
| 3 | US2 | T034–T049 (gồm T043a) | Bỏ mock: sửa A-11 (desktop đang giả hoàn toàn) + A-12 |
| 4 | US4 | T065–T070 | README là nguồn sự thật, có cổng chống lệch |
| 5 | US5 + Polish | T071–T088 (gồm T082a) | Conformance 7 engine, CI phân tập, tài liệu có bằng chứng |

**Lý do đặt US3 trước US2** dù cả hai là P1: US3 dựng lưới an toàn. US2 sửa 12 file trong `packages/ui` cộng `apps/desktop/main` — làm việc đó khi đã có test chạy trên dữ liệu thật thì phát hiện hồi quy ngay, còn làm ngược lại thì sửa mù.

### Ước lượng

| Phase | Task | Ghi chú |
|---|---|---|
| 1 Setup | 6 (+1 đã xong) | T006a đo baseline — **không làm được sau khi T009 chạy** |
| 2 Foundational | 11 | T009 là task rủi ro nhất — chạm fixture đang xanh |
| 3 US1 | 17 | phần lớn song song được |
| 4 US2 | 17 | phạm vi lớn nhất, chạm nhiều file nhất |
| 5 US3 | 15 | |
| 6 US4 | 6 | |
| 7 US5 | 7 | |
| 8 Security | 7 | |
| 9 Polish | 5 | |
| **Tổng** | **91 task chưa làm** (+1 đã xong) = **92** | |
