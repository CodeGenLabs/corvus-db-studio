# Tasks: Đối ứng đa engine + điều hướng theo cấp

**Input**: Design documents from `/specs/001-multi-engine-navigation/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **BẮT BUỘC**, không phải tuỳ chọn. Template nói tests là optional, nhưng
`docs/05-rules/AGENTS.md` và `docs/04-plan/definition-of-done.md` của dự án này quy định
"test viết CÙNG PR, không có 'sẽ thêm sau'", và Constitution VII đặt ngưỡng phủ 80%. Quy tắc dự
án thắng mặc định của template.

**Organization**: nhóm theo user story để mỗi story giao được và kiểm được độc lập.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (file khác nhau, không phụ thuộc task chưa xong)
- **[Story]**: US1…US8 theo spec.md — chỉ có ở phase của user story

## Path Conventions

Monorepo pnpm + Turborepo. Đường dẫn thật, không phải mẫu:
`packages/{contract,driver-core,driver-*,engine,ui}/src/…`, `apps/web/server/src/…`,
`tools/…`, `docs/…`.

---

## Hai chặn về hạ tầng test — đọc trước khi bắt đầu

Đo được, không phỏng đoán:

| Phát hiện | Hệ quả cho kế hoạch |
|---|---|
| `packages/ui` có **0 test file**; `jsdom`, `@testing-library/react`, `happy-dom` đều **chưa cài**; root vitest chạy `environment: 'node'` | Toàn bộ nửa UI của feature (US1–US6) hiện **không có cách nào kiểm**. Đối phó: đẩy mọi logic quyết định vào **module thuần** (`navigation/`, `tabs/`) — kiểm được ngay trong môi trường node, **không cần dependency mới**. Chỉ phần render mới cần Testing Library, và đó là T064 có xin phê duyệt riêng |
| `pnpm test:e2e` có script nhưng `@playwright/test` **chưa cài**, không có config, không có thư mục e2e | Script chết. Không dựa vào nó. Sửa ở T065 |

Đây là lý do thứ tự task đặt module thuần **trước** component: phần lớn giá trị của feature
kiểm được mà không phải chờ quyết định dependency.

---

## Phase 1: Setup

**Purpose**: chốt quyết định còn treo và dựng chỗ đặt code, trước khi ai viết dòng nào

- [ ] T001 Chốt ODQ-1 và sửa `hierarchy.hasCatalogs` của SQLite trong `packages/driver-sqlite/src/capabilities.ts`; ghi lý do vào comment tại chỗ. Hiện khai `false` nhưng `listDatabases()` trả `main` + tệp đã ATTACH → database đã attach không có đường nào tới được trong cây. Khuyến nghị đổi thành `true`. **Chặn T022**
- [ ] T002 [P] Tạo `packages/ui/src/navigation/index.ts` và `packages/ui/src/tabs/index.ts` (thư mục cho module thuần, tách khỏi `components/` để kiểm được mà không dựng React)
- [ ] T003 Ghi lại mốc baseline: chạy `pnpm verify > verify.log 2>&1; echo $?` và `pnpm test:it > it.log 2>&1; echo $?`, dán số test vào PR đầu tiên. **Không** dùng `| tail` — shell lấy exit code của `tail` và báo 0 dù đỏ

**Checkpoint**: ODQ-1 đã chốt, chỗ đặt code đã có, biết số test khởi điểm để so về sau

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: hợp đồng và các bảng khai báo mà MỌI user story đều đọc

**⚠️ CRITICAL**: không story nào bắt đầu được trước khi phase này xong

### Hợp đồng (theo contracts/introspect-object-kind.md)

- [ ] T004 Thêm hằng runtime `OBJECT_KINDS` (14 giá trị) và suy `ObjectKind` + `ObjectCapabilities = Record<ObjectKind, boolean>` từ nó, trong `packages/contract/src/capabilities.ts`. Đảo chiều dẫn xuất: mảng là gốc, interface suy ra — zod cần giá trị lúc chạy
- [ ] T005 Test âm cho T004: xoá một khoá khỏi `OBJECT_KINDS`, chạy `pnpm typecheck`, chứng minh 3 driver hiện có **đỏ lúc biên dịch**, rồi hoàn nguyên. Dán output cả hai lần
- [ ] T006 Đổi `kind` của `introspectObjects` thành `z.enum(OBJECT_KINDS).optional()` trong `packages/contract/src/methods/introspect.ts` (đang là enum 5 giá trị viết tay, thiếu 9 loại)
- [ ] T007 Test cho T006 trong `packages/contract/src/__tests__/introspect-kind.test.ts`: `kind: 'sequence'` phải qua validate; `kind: 'khong_co_that'` phải bị chặn `INVALID_INPUT` **ở tầng validate params**, không đi tới driver
- [ ] T008 Tách `ContentKind` (`objectList | data | design | definition | er`) và `ToolKind` (`sql | compare | backup | jobs | monitor`) trong `packages/contract/src/models/view.ts`, giữ `View = ContentKind | ToolKind` để chuyển dần. Ghi chú: `definition` là giá trị MỚI (nguyên nhân 6/8 loại object không dẫn tới đâu); `monitor` được thêm vì `packages/ui/src/views/MonitorView.tsx` đã tồn tại mà không có trong `View` — tức là hiện không có đường nào mở nó

### Bảng khai báo — module thuần, kiểm trong môi trường node

- [ ] T009 [P] `levelsOf(caps)` trong `packages/ui/src/navigation/levels.ts`: trả `('database'|'namespace')[]` từ `hierarchy.hasCatalogs/hasSchemas`
- [ ] T010 [P] Test cho T009 trong `packages/ui/src/navigation/__tests__/levels.test.ts`: phủ đủ **4 tổ hợp** và khẳng định đúng cây của từng engine theo bảng data-model.md §2
- [ ] T011 [P] `OBJECT_GROUPS: Record<ObjectKind, { labelKey: string; order: number }>` trong `packages/ui/src/navigation/objectGroups.ts`. Kiểu `Record` buộc phủ đủ 14 khoá — thiếu một khoá là đỏ lúc biên dịch, không phải phát hiện bằng mắt (bất biến IV-D)
- [ ] T012 [P] `CONTENT_FOR_KIND: Record<ObjectKind, ContentKind>` trong `packages/ui/src/navigation/contentForKind.ts` theo bảng data-model.md §5. Đây là cách FR-015 ("không loại nào dẫn tới màn hình trắng") được ép bằng kiểu (bất biến IV-E)
- [ ] T013 [P] Test cho T011+T012 trong `packages/ui/src/navigation/__tests__/mapping.test.ts`: mọi `ObjectKind` có nhãn và có `ContentKind`; `order` không trùng nhau

### Driver: khai capability và hiện thực phải khớp

- [ ] T014 `listObjects` của `packages/driver-postgres/src/introspect.ts` trả đủ mọi nhóm mà `POSTGRES_CAPABILITIES.objects` khai `true` (hiện chưa kiểm điều này)
- [ ] T015 [P] Test cho T014 theo mẫu `packages/driver-sqlite/src/scope.test.ts` ("mọi kind khai true trong capability đều liệt kê được") — file `packages/driver-postgres/src/kinds.integration.test.ts`
- [ ] T016 `listObjects` của `packages/driver-mysql/src/introspect.ts` — như T014
- [ ] T017 [P] Test cho T016 trong `packages/driver-mysql/src/kinds.integration.test.ts`
- [ ] T018 Thêm bất biến IV-A vào `packages/driver-core/src/conformance/runner.ts` nhóm C2: với **mọi** `kind` mà `caps.objects[kind] === true`, `listObjects({kind})` phải liệt kê được. Nhờ vậy engine thứ tư trở đi không cần nhớ tự kiểm

### i18n

- [ ] T019 Thêm nhãn cho 14 nhóm đối tượng vào `packages/ui/src/i18n/dictionaries.ts`, đủ **vi/en/ja**. Chú ý bố cục tiếng Nhật (chữ rộng gấp đôi) cho nhãn dài nhất

**Checkpoint**: hợp đồng đã mở, ba bảng khai báo đã có và có test, driver không còn khai khống → mọi user story có thể bắt đầu song song

---

## Phase 3: User Story 1 - Mở app thấy đúng danh sách kết nối (Priority: P1) 🎯 MVP

**Goal**: mở app chỉ thấy tên các kết nối, tất cả đóng, **0 truy vấn** tới database.

**Independent Test**: mở app với 3 kết nối đã lưu (một trỏ tới host không tồn tại) → đếm số
request = 0, vùng trái có đúng 3 dòng, không dòng nào bung sẵn.

### Tests for User Story 1

- [ ] T020 [P] [US1] Test "0 truy vấn khi khởi động" trong `packages/ui/src/components/__tests__/nav-startup.test.ts`: dùng `@corvus/transport-mock` đếm số lời gọi RPC sau khi dựng cây với 3 profile → phải là **đúng 1** (`connection.list`) và **0** lời gọi `introspect.*`
- [ ] T021 [P] [US1] Test "kết nối lỗi vẫn hiện dòng": profile trỏ host không tồn tại → dòng vẫn render, `state` là `collapsed`, không phải `error`

### Implementation for User Story 1

- [ ] T022 [US1] Xoá `open: { 'Local Dev': true, sakila: true }`, `selNode`, `selTable`, `selField` khỏi state khởi tạo trong `packages/ui/src/store/shell.ts`. Đây là khoá của bộ dữ liệu mẫu cũ; nếu tình cờ khớp một connection thật thì app **tự kết nối tới database production khi mở** — đúng điều FR-002 cấm
- [ ] T023 [US1] `packages/ui/src/components/NavPane.tsx`: cấp một chỉ render kết nối; thêm trạng thái rỗng có hành động "Tạo kết nối" khi workspace chưa có kết nối nào
- [ ] T024 [US1] Vùng bên phải hiện trạng thái chào khi chưa chọn gì, thay cho `view: 'objects'` mặc định trong `packages/ui/src/store/shell.ts` và `packages/ui/src/App.tsx`

**Checkpoint**: US1 giao được độc lập. Mở app sạch, không truy vấn ngoài ý muốn

---

## Phase 4: User Story 2 - Bung dần từng cấp (Priority: P1)

**Goal**: mỗi lần bung nạp đúng một cấp; lỗi và trạng thái nạp cục bộ theo nhánh; đi được hết
cây bằng bàn phím.

**Independent Test**: mở kết nối PostgreSQL 3 database → đếm số truy vấn bằng đúng số nhánh đã
bung. Bung nhóm 5 000 bảng và đo thời gian.

### Tests for User Story 2

- [ ] T025 [P] [US2] Test "số truy vấn = số nhánh đã bung" trong `packages/ui/src/components/__tests__/nav-lazy.test.ts`
- [ ] T026 [P] [US2] Test "lỗi một nhánh không ảnh hưởng nhánh khác" (bất biến IV-C) trong cùng file
- [ ] T027 [P] [US2] Test "đóng nhánh đang nạp thì huỷ việc nạp" — khẳng định `AbortSignal` được truyền và query bị hủy
- [ ] T028 [P] [US2] Test bàn phím trong `packages/ui/src/components/__tests__/nav-keyboard.test.ts`: mũi tên lên/xuống/phải/trái, Enter, Home/End, gõ chữ nhảy tới

### Implementation for User Story 2

- [ ] T029 [US2] `packages/ui/src/components/useNavTree.ts`: số cấp lấy từ `levelsOf(caps)` (T009) thay cho chuỗi cấp cố định `conn → db → schema → folder → object`
- [ ] T030 [US2] Bốn trạng thái node `collapsed | loading | expanded | error` theo chuyển tiếp ở data-model.md §3; lỗi lưu tại node, **không** mang `cause` hay chuỗi kết nối
- [ ] T031 [US2] Huỷ việc nạp khi người dùng đóng nhánh đang nạp (FR-008)
- [ ] T032 [US2] Làm mới **một** nhánh mà không mở lại cả kết nối (FR-007)
- [ ] T033 [US2] Bàn phím + vai trò accessibility trong `packages/ui/src/components/NavPane.tsx`: `role="tree"`/`treeitem`, `aria-expanded`, `aria-level`, tiêu điểm thấy được. **Constitution X là NON-NEGOTIABLE** và một cây điều hướng là loại thành phần mà bỏ bàn phím ở bản đầu thì sau phải viết lại chứ không thêm vào được

**Checkpoint**: cây bung dần đúng, dùng được bằng bàn phím, lỗi cục bộ

---

## Phase 5: User Story 3 - Chọn đối tượng, bên phải hiện tương ứng (Priority: P1)

**Goal**: mọi loại đối tượng mà cây hiện được đều dẫn tới một loại nội dung; không loại nào ra
màn hình trắng.

**Independent Test**: với mỗi loại đối tượng engine hỗ trợ, nhấn vào một thực thể và kiểm vùng
phải hiện đúng loại nội dung đã khai.

### Tests for User Story 3

- [ ] T034 [P] [US3] Test "mọi ObjectKind đều có nội dung" trong `packages/ui/src/navigation/__tests__/no-blank-screen.test.ts`: duyệt 14 `ObjectKind`, khẳng định `CONTENT_FOR_KIND[kind]` tồn tại và trỏ tới một `ContentKind` đã hiện thực
- [ ] T035 [P] [US3] Test integration cho handler `introspect.routineMeta` và `introspect.ddl` trong `packages/engine/src/__tests__/definition.integration.test.ts` trên PostgreSQL thật

### Implementation for User Story 3

- [ ] T036 [US3] Hiện thực handler `introspect.routineMeta` trong `packages/engine/src/handlers/index.ts` (method **đã có trong hợp đồng**, chỉ thiếu handler)
- [ ] T037 [US3] Hiện thực handler `introspect.ddl` trong cùng file
- [ ] T038 [US3] Hạ `HANDLER_DEBT` trong `tools/check-contract.ts` từ 68 xuống 66 sau T036+T037
- [ ] T039 [US3] `packages/ui/src/views/DefinitionView.tsx` (MỚI): hiện định nghĩa/DDL cho function, procedure, trigger, sequence, index. Đây là loại nội dung còn thiếu — nguyên nhân 6/8 loại object hiện không dẫn tới đâu
- [ ] T040 [US3] Nối lựa chọn cây → `ContentKind` qua `CONTENT_FOR_KIND` trong `packages/ui/src/components/NavPane.tsx`, thay bảng ánh xạ cứng cho 2 loại (`table|view → data`, `folder|schema → objects`)
- [ ] T041 [US3] Breadcrumb đường dẫn đầy đủ (kết nối › database › namespace › đối tượng) ở đầu vùng nội dung (FR-016)
- [ ] T042 [US3] Ẩn/vô hiệu hành động không áp dụng cho loại đối tượng đang chọn hoặc engine không hỗ trợ (FR-017), đọc từ `capabilities`

**Checkpoint**: mọi đối tượng trong cây đều mở được nội dung

---

## Phase 6: User Story 4 - Mỗi đối tượng đúng một tab (Priority: P1)

**Goal**: khác đối tượng → tab mới; cùng đối tượng → chuyển tiêu điểm về tab cũ; chưa có → mở mới.

**Independent Test**: chọn 5 đối tượng khác nhau → đúng 5 tab. Chọn lại lần lượt cả 5 → vẫn 5
tab, tiêu điểm nhảy đúng mỗi lần.

### Tests for User Story 4

- [ ] T043 [P] [US4] Test danh tính tab trong `packages/ui/src/tabs/__tests__/tabIdentity.test.ts`: `data` của bảng X ≠ `design` của bảng X; `bán_hàng.đơn_hàng` ≠ `kho.đơn_hàng`; cùng bảng qua hai lần nhấn = một danh tính
- [ ] T044 [P] [US4] Test `useTabs` trong `packages/ui/src/tabs/__tests__/useTabs.test.ts`: 5 đối tượng = 5 tab (SC-011); chọn lại không tăng số tab; bất biến IV-F (không hai tab cùng danh tính)
- [ ] T045 [P] [US4] Test "mở/đóng 20 lần mất 0 nội dung chưa lưu" (SC-012, bất biến IV-G)

### Implementation for User Story 4

- [ ] T046 [US4] `packages/ui/src/tabs/tabIdentity.ts`: dựng và so `ObjectTabIdentity` / `ToolTabIdentity` theo data-model.md §6
- [ ] T047 [US4] `packages/ui/src/tabs/useTabs.ts`: `open` (mở mới hoặc focus), `focus`, `close`
- [ ] T048 [US4] Thêm `tabs: Tab[]` và `activeTabId` vào `packages/ui/src/store/shell.ts`; dùng selector để một tab đổi không re-render cả danh sách
- [ ] T049 [US4] Cờ `dirty` và hộp thoại xác nhận trước khi đóng tab có nội dung chưa lưu (FR-014e). **Chốt ODQ-2 tại đây**: chỗ đặt state chưa lưu (khuyến nghị store riêng khoá bằng danh tính tab)
- [ ] T050 [US4] Nối `packages/ui/src/components/TabStrip.tsx` vào danh sách tab thật thay cho dữ liệu tĩnh
- [ ] T051 [US4] Cờ `missing` khi đối tượng của tab đã bị xoá phía server: báo rõ, không tự đóng lặng lẽ

**Checkpoint**: bốn story P1 xong → luồng điều hướng hoàn chỉnh. **Đây là mốc giao được**

---

## Phase 7: User Story 5 - Cây chỉ hiện nhóm engine thật sự có (Priority: P2)

**Goal**: nhóm suy từ `capabilities.objects` của kết nối thật, không từ danh sách cố định.

**Independent Test**: kết nối lần lượt 3 engine, so danh sách nhóm hiện ra với bảng năng lực đã
khai. Nhóm khai "có" phải liệt kê được; nhóm khai "không" phải vắng mặt.

### Tests for User Story 5

- [ ] T052 [P] [US5] Test "nhóm khai false không xuất hiện" trong `packages/ui/src/components/__tests__/nav-groups.test.ts`: SQLite không có nhánh "Procedures"

### Implementation for User Story 5

- [ ] T053 [US5] `packages/ui/src/components/useNavTree.ts`: dựng cấp nhóm từ `OBJECT_GROUPS.filter(g => caps.objects[g.kind])`, bỏ hằng `OBJECT_FOLDERS` chỉ có `table`/`view`
- [ ] T054 [US5] Chạy conformance IV-A (T018) cho cả 3 engine và sửa mọi chỗ khai khống lộ ra

**Checkpoint**: khai capability và hiện thực khớp nhau trên cả 3 engine, có máy kiểm

---

## Phase 8: User Story 6 - Công cụ độc lập mở được song song (Priority: P2)

**Goal**: trình soạn SQL và các công cụ khác mở được bất kể đang chọn gì, giữ nhiều phiên.

**Independent Test**: mở trình soạn SQL khi chưa chọn gì; mở thêm cái thứ hai; chọn một bảng
bên trái và kiểm hai phiên SQL còn nguyên nội dung.

### Tests for User Story 6

- [ ] T055 [P] [US6] Test "đổi lựa chọn không mất nội dung chưa lưu" trong `packages/ui/src/tabs/__tests__/tool-tabs.test.ts` (FR-019)
- [ ] T056 [P] [US6] Test "nhiều phiên SQL song song": hai `ToolTabIdentity` khác `seq` là hai tab

### Implementation for User Story 6

- [ ] T057 [US6] `ToolTabIdentity` với `seq` trong `packages/ui/src/tabs/tabIdentity.ts`; công cụ mở được khi chưa chọn đối tượng nào
- [ ] T058 [US6] Không chào mời công cụ mà engine không hỗ trợ (ví dụ theo dõi tiến trình trên SQLite) trong `packages/ui/src/components/MenuBar.tsx` và `Toolbar.tsx`, đọc từ `capabilities.tools`

**Checkpoint**: viết SQL tự do không bị luồng điều hướng cản

---

## Phase 9: User Story 7 - SQL Server chạy thật, kiểm được trên Docker (Priority: P2)

**Goal**: engine thật thứ tư, engine **đầu tiên dùng đủ ba cấp** — phép thử thật cho US2.

**Independent Test**: dựng container theo quickstart.md, tạo kết nối, mở cây tới một bảng và đọc
dữ liệu. Conformance chạy không cần thao tác tay.

### Setup for User Story 7

- [ ] T059 [US7] Tạo package `packages/driver-mssql` (package.json, tsconfig, vitest.config.ts) và thêm dependency `mssql`. **CẦN PHÊ DUYỆT**: AGENTS.md yêu cầu dừng lại và hỏi trước khi thêm dependency mới. Lý do chọn `mssql` (bọc `tedious`): thuần JS, không native → đóng gói desktop không phải rebuild theo ABI Electron

### Tests for User Story 7

- [ ] T060 [P] [US7] `MSSQL_SETUP_SQL` trong `packages/driver-core/src/conformance/fixture.ts`: lược đồ mẫu tương đương PostgreSQL/SQLite, gồm tên có dấu cách, unicode, từ khoá SQL, NULL vs chuỗi rỗng, số nguyên 64 bit
- [ ] T061 [P] [US7] `MSSQL_CONFORMANCE` trong `packages/driver-core/src/conformance/dialect.ts`: `hasCatalogs: true, hasSchemas: true`, `badProfiles`, `seriesSql` (dùng `GENERATE_SERIES` hoặc CTE đệ quy), `longRunningSql` (`WAITFOR DELAY`), `countActiveQueriesSql` (`sys.dm_exec_requests`), `errorCases`, `recreateDdlSql`
- [ ] T062 [US7] `packages/driver-mssql/src/mssql.integration.test.ts`: chạy `runConformanceSuite` qua testcontainers với ảnh `mcr.microsoft.com/mssql/server:2022-latest`, mật khẩu **sinh trong lần chạy** (SR-006)
- [ ] T063 [US7] Guard SR-007 trong file trên: bộ kiểm **từ chối chạy** nếu database đích không do chính nó tạo. Máy phát triển đang có container Azure SQL Edge giữ database nghiệp vụ thật; conformance tạo và xoá bảng nên trỏ sai là chạy DDL trên dữ liệu của ứng dụng đang hoạt động

### Implementation for User Story 7

- [ ] T064 [US7] `packages/driver-mssql/src/capabilities.ts`: khai trung thực + `narrowMssqlCapabilities(version)` theo phiên bản server thật
- [ ] T065 [US7] `packages/driver-mssql/src/driver.ts` — connect/pool/ping/close. TLS: `encrypt: true`, `trustServerCertificate` mặc định **false** và **không** có tuỳ chọn UI để bỏ qua (security.md §8, cùng nguyên tắc SSH host key)
- [ ] T066 [US7] `packages/driver-mssql/src/introspect.ts`: 3 cấp qua `sys.databases`, `sys.schemas`, `sys.tables/columns/indexes/foreign_keys`. Truy vấn gộp, không N+1. Comment lấy từ `sys.extended_properties`, **không** phải `COMMENT ON`
- [ ] T067 [US7] `packages/driver-mssql/src/driver.ts` — `execute` streaming: `request.stream = true` là API **theo sự kiện**, phải bọc thành `AsyncIterable` và nối backpressure bằng `request.pause()`/`resume()`. Bọc sai thì IV-1 (≤ 3 chunk trong RAM) bị phá **mà test nhỏ vẫn xanh** — lỗi chỉ lộ ra ở bảng lớn của khách hàng
- [ ] T068 [US7] Huỷ qua `request.cancel()`; đạt ngưỡng IV-3 ≤ 200 ms mà conformance C6 đang ghim
- [ ] T069 [US7] `packages/driver-mssql/src/errors.ts`: ánh xạ ≥ 20 mã lỗi, mỗi mã một assertion trong `errorCases`
- [ ] T070 [US7] `packages/driver-mssql/src/value.ts`: chuẩn hoá `CellValue`. `decimal`/`money`/`bigint` **luôn** là string; `uniqueidentifier`, `varbinary`, `datetime2` xử lý riêng
- [ ] T071 [US7] Đăng ký `mssqlDriver` trong `apps/web/server/src/engine.ts` (2 dòng, theo mẫu sqlite đã có)
- [ ] T072 [US7] Kiểm US2 bằng SQL Server: bung tới namespace thấy đúng **ba cấp**. Sửa mọi chỗ trong UI còn ngầm giả định hai cấp mà bước này làm lộ ra

**Checkpoint**: 4 engine chạy thật; luồng điều hướng đã qua phép thử ba cấp

---

## Phase 10: User Story 8 - Đường đi cho ba engine còn lại (Priority: P3)

**Goal**: Oracle, MongoDB, Redis có đặc tả trả lời đủ 4 câu, để khi viết driver thì UI chỉ là
khai báo thêm.

**Independent Test**: với mỗi engine, đọc tài liệu và trả lời được: cây mấy cấp? nhóm nào? chọn
vào hiện gì? không làm được gì?

- [ ] T073 [P] [US8] Mục Oracle trong `docs/04-plan/driver-roadmap.md`: namespace = user; định danh mặc định **CHỮ HOA** (khai sai thì mọi lần mở bảng báo `TABLE_NOT_FOUND`); service name ≠ SID; `NUMBER` luôn là string
- [ ] T074 [P] [US8] Mục MongoDB: cấp `collection` thay `table`; cấu trúc tài liệu là **suy luận từ mẫu** → UI bắt buộc gắn nhãn "suy luận từ N tài liệu" (FR-023). Nêu rõ nó bị chặn bởi ADR-0011 còn treo
- [ ] T075 [P] [US8] Mục Redis: không có namespace lẫn nhóm kiểu bảng; duyệt khoá theo lô, **TUYỆT ĐỐI KHÔNG `KEYS *`** (chặn server, 10 triệu khoá là làm sập dịch vụ của khách); cũng bị chặn bởi ADR-0011
- [ ] T076 [US8] Bảng `EngineProfile` (data-model.md §7) điền đủ cho cả 4 engine, cột "không làm được gì" của SQL Server điền từ kết quả thật của Phase 9

**Checkpoint**: thêm engine thứ năm không cần thiết kế lại màn hình

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T077 [P] Cập nhật cột SQL Server trong `docs/02-architecture/capability-matrix.md` bằng **số đo thật** từ Phase 9, kèm chú thích nếu khác bản đầy đủ (FR-030)
- [ ] T078 [P] Cập nhật `docs/04-plan/backlog.md` và `docs/04-plan/driver-roadmap.md`: SQL Server từ "chưa có" sang engine thật thứ tư
- [ ] T079 Đo SC-003: namespace 5 000 bảng, danh sách tên hiện ra ≤ 1 s. Nếu không đạt thì đây là chỗ cần ảo hoá danh sách, không phải chỗ nới tiêu chí
- [ ] T080 Đo SC-001: mở app 10 kết nối ≤ 1 s và **0** truy vấn database
- [ ] T081 **Quyết định hạ tầng test component**: `packages/ui` hiện 0 test file, không có `jsdom`/`@testing-library/react`. Constitution VII đã quy định Component Test = Testing Library, nhưng đây vẫn là dependency mới → **CẦN PHÊ DUYỆT**. Nếu bị từ chối, thay bằng E2E và ghi rõ phần nào không được kiểm
- [ ] T082 Sửa script chết `test:e2e` trong `package.json`: `@playwright/test` chưa cài, không có config, không có thư mục e2e. Hoặc cài đủ, hoặc xoá script. **Giữ nguyên là tái tạo đúng cái bẫy mà audit 2026-08-18 nói tới** — script xanh mà không chạy gì
- [ ] T083 [P] Kiểm bằng mắt 11 bước ở [quickstart.md](quickstart.md) §7, dán kết quả từng bước
- [ ] T084 Ghi lại phát hiện của feature này vào `docs/04-plan/audit-2026-08-18.md`: chỗ khai khống nào lộ ra, chỗ nào trong UI còn giả định hai cấp
- [ ] T085 Chạy `pnpm verify > verify.log 2>&1; echo $?` và `pnpm test:it > it.log 2>&1; echo $?`, cả hai phải in `0`; dán số test so với baseline ở T003

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: không phụ thuộc gì. T001 **chặn** T029 (số cấp của cây SQLite)
- **Phase 2 Foundational**: phụ thuộc Phase 1. **CHẶN toàn bộ user story**
- **Phase 3–6 (US1–US4, đều P1)**: đều bắt đầu được sau Phase 2
  - US1 độc lập hoàn toàn
  - US2 phụ thuộc T009 (`levelsOf`) — đã ở Phase 2
  - US3 phụ thuộc T012 (`CONTENT_FOR_KIND`) — đã ở Phase 2
  - US4 độc lập với US3 về mã, nhưng **kiểm cùng nhau mới thấy giá trị**
- **Phase 7 (US5)**: phụ thuộc T011 và T018 — đã ở Phase 2
- **Phase 8 (US6)**: phụ thuộc T046 (danh tính tab) ở US4
- **Phase 9 (US7)**: **cố ý đặt sau US1–US6.** Làm trước thì vừa gỡ lỗi driver mới vừa gỡ lỗi luồng mới cùng lúc và không biết lỗi thuộc bên nào
- **Phase 10 (US8)**: viết sau Phase 9 để cột "không làm được gì" của SQL Server có nội dung thật
- **Phase 11 Polish**: sau khi các story cần giao đã xong

### Within Each User Story

- Test viết trước, chạy phải ĐỎ, rồi mới hiện thực (DoD của dự án)
- Module thuần (`navigation/`, `tabs/`) trước component
- Handler trước view (US3: T036/T037 trước T039)
- Story xong mới sang story ưu tiên kế tiếp

### Parallel Opportunities

- Phase 2: T009–T013 song song (5 file khác nhau, không phụ thuộc nhau)
- Phase 2: T014+T015 (postgres) song song với T016+T017 (mysql)
- Phase 9: T060+T061 (fixture + dialect) song song với T064 (capabilities)
- Phase 10: T073+T074+T075 song song (ba mục tài liệu độc lập)
- Sau Phase 2, bốn story P1 chia được cho bốn người

---

## Parallel Example: Phase 2 Foundational

```bash
# Ba bảng khai báo — file khác nhau, không phụ thuộc nhau:
Task: "levelsOf(caps) trong packages/ui/src/navigation/levels.ts"
Task: "OBJECT_GROUPS trong packages/ui/src/navigation/objectGroups.ts"
Task: "CONTENT_FOR_KIND trong packages/ui/src/navigation/contentForKind.ts"

# Hai driver — package khác nhau:
Task: "listObjects đủ nhóm trong packages/driver-postgres/src/introspect.ts"
Task: "listObjects đủ nhóm trong packages/driver-mysql/src/introspect.ts"
```

---

## Implementation Strategy

### MVP: bốn story P1, không phải một

Template gợi ý MVP = US1. Ở feature này **không đúng**: US1 một mình cho ra một app mở lên
thấy danh sách kết nối rồi không làm được gì. Bốn story P1 (US1–US4) là đơn vị giao nhỏ nhất
có nghĩa với người dùng — mở app, bung tới bảng, xem dữ liệu, mở nhiều tab.

1. Phase 1 Setup → Phase 2 Foundational
2. US1 → US2 → US3 → US4
3. **DỪNG VÀ KIỂM**: đi 11 bước ở quickstart.md §7
4. Giao được ở đây

### Giao tăng dần

| Mốc | Nội dung | Giá trị người dùng |
|---|---|---|
| M1 | Setup + Foundational | chưa có (nền) |
| M2 | + US1–US4 | **luồng điều hướng dùng được** ← giao được |
| M3 | + US5, US6 | đúng engine, viết SQL tự do |
| M4 | + US7 | SQL Server chạy thật, 4 engine |
| M5 | + US8 + Polish | đường đi cho 3 engine còn lại |

### Ba việc cần phê duyệt trước khi làm

| Task | Việc | Vì sao phải hỏi |
|---|---|---|
| T001 | ODQ-1: `hasCatalogs` của SQLite | đổi capability là đổi hành vi hiện có |
| T059 | thêm dependency `mssql` | AGENTS.md: dừng và hỏi trước khi thêm dependency |
| T081 | thêm `jsdom` + `@testing-library/react` | dependency mới; Constitution VII ủng hộ nhưng vẫn phải hỏi |

---

## Notes

- `[P]` = file khác nhau, không phụ thuộc task chưa xong
- Mỗi task xong thì commit; `pnpm verify` phải xanh ở mỗi mốc commit
- **Không** dùng `pnpm verify | tail` — shell lấy exit code của `tail`, báo 0 dù đỏ
- Với mỗi assertion tự hỏi: "nếu code trả rỗng/undefined thì test này còn xanh không?" Nếu còn
  thì assertion đó không chứng minh được gì. Đây là dạng lỗi đã lọt qua thật trong repo này
- Nhóm conformance bị bỏ qua phải in **kèm lý do**; bỏ qua trong im lặng là cơ chế đã tạo ra
  230 dấu `[DONE]` sai sự thật
