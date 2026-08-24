# Tasks: Kết nối toàn bộ workflow UI với DB thật & bộ kiểm thử UI chống hồi quy

**Input**: Design documents from `/specs/003-ui-workflow-integration/`
**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: **BẮT BUỘC có.** US3 của feature này *chính là* phương thức test, và [docs/04-plan/definition-of-done.md](../../docs/04-plan/definition-of-done.md) không cho tuyên bố xong mà không có test kèm output lệnh.

**Organization**: Task nhóm theo user story để mỗi story hiện thực và kiểm chứng độc lập được.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (file khác nhau, không phụ thuộc task chưa xong)
- **[Story]**: user story tương ứng ([US1]…[US6])
- Mọi task đều ghi đường dẫn file chính xác

## Path Conventions

Monorepo 24 packages & apps: `packages/*`, `apps/web/*`, `apps/desktop/*`, `tools/*` từ gốc repo, cộng thư mục `e2e/` mới. Không có `backend/`/`frontend/`.

## Kitchen Recipe Reference

Không có (xem [plan.md §Kitchen Recipe Reference](./plan.md)). Không có `depends-on` để sắp xếp; thứ tự dưới đây dẫn xuất từ dependency thật giữa các file.

## Con số khởi điểm — đo 2026-08-24

| | Hiện tại | Đích |
|---|---:|---:|
| Contract method (`Object.keys(METHODS)`) | 76 | 76 |
| Method UI đã gọi | 30 | 76 |
| `UI_WIRING_DEBT` | 46 | 0 |
| Bề mặt context menu phản hồi nhấp phải | 0 / 11 | 11 / 11 |
| `onContextMenu` trong toàn repo | 0 | > 0 |
| `data-testid` trong `packages/ui` | 7 | đủ cho spec E2E |

**Context menu không phải story riêng** (clarify Q2): nó là tiêu chí Definition-of-Done của từng lệnh. Cơ chế dựng ở Phase 2; việc đăng ký từng lệnh lên bề mặt nằm trong US2/US4/US5.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: cài công cụ và cấu hình để test UI *có khả năng bấm được*. Trước phase này không test nào bấm được gì (research.md R1).

- [ ] T001 Cài `jsdom`, `@testing-library/react`, `@testing-library/user-event` vào `devDependencies` của `package.json` **gốc** — đã được phê duyệt 2026-08-24 theo AGENTS.md §3 (Cấm 8). Tuyệt đối không đưa vào `dependencies` của package nào
- [ ] T002 Sửa `vitest.config.ts`: **giữ nguyên** `environment: 'node'` toàn cục, thêm `environmentMatchGlobs` bật `jsdom` chỉ cho `packages/ui/src/**/*.dom.test.tsx`. Điều kiện nghiệm thu: 71 test hiện có chạy đúng môi trường cũ và vẫn xanh
- [ ] T003 [P] Cài `@playwright/test` vào `devDependencies` gốc và tạo `e2e/playwright.config.ts` với 4 project `web-chromium` / `web-firefox` / `web-webkit` / `desktop` theo đúng hình dạng đã quy định ở [testing-strategy.md §5](../../docs/04-plan/testing-strategy.md); `desktop` dùng `_electron.launch`
- [ ] T004 [P] Thêm script `test:e2e:web` và `test:e2e:desktop` vào `package.json` gốc — sửa lệch tài liệu: [AGENTS.md §1](../../docs/05-rules/AGENTS.md) bước 4 gọi `pnpm test:e2e:web` nhưng script không tồn tại (research.md R2)
- [ ] T005 Tạo `packages/ui/src/__tests__/helpers/renderStudio.tsx` — custom renderer bọc `StudioProvider` + `QueryClientProvider` với transport thật trỏ tới stack container; nhận tham số `engine` để dùng cho cả 7 engine. Đây là điểm vào duy nhất của tầng kiểm thử rộng
- [ ] T006 Tạo `packages/ui/src/__tests__/helpers/seedInventory.ts` — đọc `SeedInventory` ([data-model.md E7](./data-model.md)) từ DB **thật lúc chạy** qua `introspect.databases` / `introspect.objects` / `data.count`. **Cấm** hằng số danh sách bảng (FR-020)
- [ ] T007 Tạo `packages/ui/src/__tests__/helpers/requireContainers.ts` — tiền kiểm container + seed; thiếu thì **dừng sớm** với thông điệp nêu đúng container nào thiếu và lệnh `pnpm db:up` cần chạy (FR-021)

**Checkpoint**: `pnpm test` xanh; một test `.dom.test.tsx` mẫu render được component và `userEvent.click` chạy được — chứng minh T001+T002 đã mở đường

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: kiểu dữ liệu và cơ chế dùng chung mà **cả** US1, US2, US4, US5 đều cần. Sai ở đây thì mọi story sau phải làm lại.

**⚠️ CRITICAL**: không story nào bắt đầu được trước khi phase này xong

- [ ] T008 Tạo `packages/ui/src/context/activeContext.ts` — kiểu `ActiveContext` + `ObjectSelection` + `RedactedError` theo [data-model.md E1/E2/E5](./data-model.md), và hàm chuyển trạng thái `connectionState`. Không có hiện thực UI ở task này, chỉ kiểu + phép chuyển
- [ ] T009 [P] Tạo `packages/ui/src/commands/types.ts` — kiểu `Command`, `Availability`, `Surface`, `TargetKind`, `AvailabilityVerdict`, `DisabledReason`, `CommandContext` theo [contracts/command-registry.md §1](./contracts/command-registry.md). **Ràng buộc kiểu là cổng chống Cấm 2**: `Availability` không được có trường nào nhận `driverId` hay tên engine
- [ ] T010 Tạo `packages/ui/src/commands/availability.ts` — hàm `evaluate(cmd, ctx)` duy nhất trong toàn UI quyết định khả dụng (FR-046). Trả `hidden` **chỉ** cho lý do `engine-unsupported`; mặc định an toàn: `capabilities === null` ⇒ `disabled` với `capabilities-unknown`, kèm comment giải thích vì sao khác `useNavTree.ts:85` ([contracts/active-context.md §4](./contracts/active-context.md))
- [ ] T011 Tạo `packages/ui/src/commands/registry.ts` — `register()` + `commandsFor(surface, target)` trả về theo **thứ tự khai báo** (thứ tự menu là dữ liệu, không phải sắp xếp)
- [ ] T012 [P] Thêm khoá i18n cho 7 `DisabledReason` vào `packages/ui/src/i18n/dictionaries.ts`, đủ **vi/en/ja** (ui-rules §5). Không hard-code chuỗi ở bất kỳ đâu khác
- [ ] T013 Tạo `packages/ui/src/components/ContextMenu.tsx` — khung menu chung cho cả 11 bề mặt: mở tại con trỏ, tự điều chỉnh không tràn khỏi vùng nhìn thấy, đóng bằng Escape hoặc nhấp ra ngoài (FR-047). Nhãn lấy từ khoá i18n, màu lấy từ token CSS — **không** hex (ui-rules §1.1)
- [ ] T014 Tạo `packages/ui/src/components/useContextMenu.ts` — hook trả về props gắn vào bề mặt: `onContextMenu` (chuột) **và** `onKeyDown` bắt `Shift+F10` cùng phím Menu, áp lên mục đang có tiêu điểm; điều hướng bằng phím mũi tên, chọn bằng Enter, đóng trả tiêu điểm về mục ban đầu (FR-047B)
- [ ] T015 [P] Viết `packages/ui/src/commands/__tests__/invariants.test.ts` — khẳng định 10 bất biến I-1…I-10 của [contracts/command-registry.md §2](./contracts/command-registry.md). Ban đầu registry rỗng nên test xanh trivially; nó trở thành cổng thật khi lệnh được thêm dần
- [ ] T016 [P] Viết `packages/ui/src/commands/__tests__/no-driver-branching.test.ts` — quét mọi tệp trong `packages/ui/src/commands/` và khẳng định không xuất hiện `driverId`, tên engine, hay so sánh chuỗi engine (Cấm 2, bất biến I-7)
- [ ] T017 [P] Viết `packages/ui/src/commands/__tests__/no-hardcoded.test.ts` — quét `commands/` + `ContextMenu.tsx` và khẳng định không có mã hex màu, không có chuỗi hiển thị (bất biến I-8, sửa nợ C-20)
- [ ] T018 Tạo `tools/check-ui-wiring.ts` theo đúng khuôn ratchet của `tools/check-contract.ts` — đọc registry, tính `UI_WIRING_DEBT` và `SURFACE_DEBT` theo công thức ở [contracts/command-registry.md §6](./contracts/command-registry.md), đặt khởi điểm **46** và **11**, và FAIL nếu số đo **lớn hơn** hằng số
- [ ] T019 Thêm `check:ui-wiring` vào `package.json` gốc và nối vào `pnpm verify` (FR-024)
- [ ] T020 ⏱️ **ĐO BASELINE — LÀM TRƯỚC MỌI SỬA ĐỔI UI.** Chạy `pnpm verify` và ghi vào `specs/003-ui-workflow-integration/quickstart.md` §4: `UI_WIRING_DEBT`, `SURFACE_DEBT`, `HARDCODED_CHROME_DEBT` đo thật, và tổng thời gian `pnpm test`
- [ ] T021 Rà `docker/dev-db/seed/*` đối chiếu FR-019 và ghi bảng phủ vào `docker/dev-db/README.md`: mỗi engine có đủ bảng-có-PK-và-FK, view, function, procedure, trigger, index, và một bảng đủ lớn để kiểm phân trang. Mục nào engine không hỗ trợ phải **khai báo tường minh**, không thiếu trong im lặng
- [ ] T022 Bổ sung phần seed còn thiếu do T021 phát hiện vào `docker/dev-db/seed/<engine>/03-extensions.sql`; giữ nguyên `seed_version` state machine đã có từ feature 002

**Checkpoint**: `pnpm verify` xanh với cổng mới; ba con số nợ đã ghi; `pnpm db:doctor` xanh 7/7

---

## Phase 3: User Story 1 — Mở kết nối và thấy ứng dụng phản ánh đúng DB thật (Priority: P1) 🎯 MVP

**Goal**: mọi vùng chrome nói đúng về kết nối/database/engine/phiên bản thật; mở kết nối lỗi thì đọc được nguyên nhân và tự phục hồi được.

**Independent Test**: mở lần lượt 7 engine, kiểm chrome hiển thị đúng; tắt một container, kiểm thông điệp lỗi và nút thử lại. Không cần US2…US6.

### Hạ tầng ngữ cảnh

- [ ] T023 [US1] Mở rộng `Tab` trong `packages/ui/src/store/shell.ts` thêm trường `context: ActiveContext`; **xoá** ba trường `selTable`, `selNode`, `selField` (data-model.md §Cái bị xoá bỏ). Không giữ song song — hai nguồn sự thật là đúng lỗi C-04 gây ra
- [ ] T024 [US1] Tạo `packages/ui/src/context/useActiveContext.ts` — trả ngữ cảnh của tab đang hoạt động (FR-004)
- [ ] T025 [US1] Tạo `packages/ui/src/context/useCapabilities.ts` — đọc **đúng khoá react-query** `['connection', id, 'open']` mà `useNavTree.ts:70-77` đang dùng. **Cấm** tạo khoá mới: khoá mới ⇒ `connection.open` chạy hai lần và hai bản caps có thể lệch ([contracts/active-context.md §3](./contracts/active-context.md))
- [ ] T026 [US1] Tạo `packages/ui/src/context/useConnectionStatus.ts` — gọi `connection.status` (chưa từng được UI gọi) lấy `serverVersion` + `serverEncoding`, cache ở `['connection', id, 'status']`

### Bỏ chuỗi cứng khỏi chrome

- [ ] T027 [US1] Sửa `packages/ui/src/components/Toolbar.tsx` dòng 133 và 139 — bỏ trạng thái "đã kết nối" cứng và chuỗi `MySQL 8.0.36 · utf8mb4`; đọc từ ngữ cảnh. Chưa kết nối thì hiện trạng thái "chưa kết nối" (FR-003, sửa C-06)
- [ ] T028 [P] [US1] Sửa `packages/ui/src/components/TitleBar.tsx:87` — bỏ `Corvus DB Studio — sakila @ Local Dev`, sinh từ ngữ cảnh (sửa C-07)
- [ ] T029 [P] [US1] Sửa `packages/ui/src/components/StatusBar.tsx:26` — bỏ `Local Dev · sakila` (sửa C-07)
- [ ] T030 [P] [US1] Sửa `packages/ui/src/components/InfoPane.tsx` dòng 78, 86, 202 — bỏ `Mở bảng country @sakila` / `Opened table country @sakila` / `sakila`; đọc từ ngữ cảnh (sửa C-07)
- [ ] T031 [P] [US1] Sửa `packages/ui/src/components/dialogs/UsersDialog.tsx:65` — bỏ `sakila @ Local Dev` (sửa C-07)
- [ ] T032 [US1] Xoá khoá `tabData: 'country @sakila'` khỏi **cả ba** ngôn ngữ trong `packages/ui/src/i18n/dictionaries.ts` (dòng 16, 62, 106) và sinh tiêu đề tab từ ngữ cảnh trong `packages/ui/src/tabs/tabIdentity.ts` — tên đối tượng không phải nội dung dịch được
- [ ] T033 [P] [US1] Sửa `packages/ui/src/components/dialogs/ConnectionDialog.tsx:57` — giá trị gợi ý mặc định phải trỏ tới môi trường phát triển thật có tài liệu (`docker-dev-connections.json`) hoặc để trống; **không** trỏ tới `10.4.12.31` / `sakila` không tồn tại (FR-009, sửa C-09)
- [ ] T034 [US1] Sửa `packages/ui/src/components/dialogs/CommandPalette.tsx` dòng 32-34 — bỏ ba bảng cứng `customer`/`film`/`actor`; truy vấn `introspect.objects` của kết nối đang mở (FR-008, sửa C-08)

### Mở / đóng / phục hồi kết nối

- [ ] T035 [US1] Sửa `packages/ui/src/components/useNavTree.ts` — giữ `retry: 0` cho lần mở tự động (mở kết nối sai mật khẩu nhiều lần có thể khoá tài khoản) nhưng phơi `refetch()` để nút "Thử lại" gọi được (research.md R5)
- [ ] T036 [US1] Sửa `packages/ui/src/components/NavPane.tsx` — thay ký tự `!` đỏ ở dòng 245/286/296/306 bằng thông điệp lỗi đọc được **ngay trên giao diện** kèm nút "Thử lại"; lỗi lấy từ `RedactedError` (FR-005, sửa C-14)
- [ ] T037 [US1] Sửa `packages/ui/src/components/NavPane.tsx` dòng 28-34 / 75 / 166 — **tách** hành vi "chọn" (một nhấp: cập nhật ngữ cảnh) khỏi "mở/kết nối" (nhấp đúp: mở kết nối, mở bảng), theo quy ước công cụ tham chiếu (FR-006, sửa C-15)
- [ ] T038 [US1] Nối `connection.close` — người dùng đóng được kết nối; khi đóng phải xoá ngữ cảnh của **mọi** tab có `connectionId` đó, không chỉ tab đang hoạt động, và xử lý rõ các tab phụ thuộc (FR-007)
- [ ] T039 [US1] Thêm `data-testid` vào `Toolbar`, `TitleBar`, `StatusBar`, `InfoPane`, `NavPane`, `TabStrip` cho mọi vùng hiển thị ngữ cảnh — hiện toàn `packages/ui` chỉ có 7 `data-testid`, và testing-strategy.md §5 cấm chọn selector theo text (vì i18n 3 ngôn ngữ)

### Test US1

- [ ] T040 [P] [US1] Viết `packages/ui/src/context/__tests__/activeContext.test.ts` — 8 bất biến A-1…A-8 của [contracts/active-context.md §5](./contracts/active-context.md), phần kiểm được không cần DB
- [ ] T041 [US1] Viết `packages/ui/src/__tests__/chrome-context.dom.test.tsx` — với **mỗi** trong 7 engine: mở kết nối, khẳng định chrome hiển thị đúng tên kết nối/database/engine/phiên bản đọc từ `connection.status`, và **không** khớp bất kỳ chuỗi trong danh sách cấm (`sakila`, `Local Dev`, `MySQL 8.0.36`, `utf8mb4`)
- [ ] T042 [P] [US1] Viết `packages/ui/src/__tests__/no-hardcoded-chrome.test.ts` — quét `TitleBar`/`StatusBar`/`Toolbar`/`InfoPane`/`dictionaries.ts` khẳng định không còn tên kết nối/database/engine/phiên bản dạng chuỗi cứng; đây là cổng của `HARDCODED_CHROME_DEBT` (bất biến A-7, SC-001)
- [ ] T043 [US1] Viết `packages/ui/src/__tests__/connection-error.dom.test.tsx` — với **mỗi** 7 engine: container tắt → khẳng định thông điệp lỗi hiện trên giao diện, có nút thử lại, và **không** chứa mật khẩu / chuỗi kết nối đầy đủ / đường dẫn nội bộ / vết ngăn xếp (bất biến A-8, SR-002, Cấm 6)
- [ ] T044 [US1] Viết `packages/ui/src/__tests__/connection-lifecycle.dom.test.tsx` — mở A → mở B khác engine → chrome cập nhật hoàn toàn không còn dấu vết A; đóng kết nối → ngữ cảnh xoá, chrome về "chưa kết nối" (kịch bản 3, 5, 6 của US1)

**Checkpoint**: `pnpm verify` xanh; `HARDCODED_CHROME_DEBT` về 0; xác minh bằng mắt bước 1–2 và 7–8 của [quickstart.md §5](./quickstart.md) đạt. **US1 giao được độc lập như MVP.**

---

## Phase 4: User Story 2 — Nút bấm phản ánh đúng năng lực engine (Priority: P1)

**Goal**: mọi lệnh chỉ dùng được khi engine hỗ trợ và ngữ cảnh đủ; lệnh không dùng được thì vô hiệu hoá kèm lý do (hoặc ẩn trong context menu nếu engine không hỗ trợ). Cả 11 bề mặt phản hồi nhấp phải.

**Independent Test**: mở từng engine, chụp trạng thái khả dụng của toàn bộ lệnh, đối chiếu [capability-matrix.md](../../docs/02-architecture/capability-matrix.md).

### Chuyển các bề mặt tĩnh sang registry

- [ ] T045 [US2] Khai báo nhóm lệnh điều hướng và đối tượng vào `packages/ui/src/commands/defs/object.ts` — mở bảng, thiết kế, tạo mới, xoá, làm mới, sao chép tên, sao chép tên có quote (dùng `quoteIdentifier` của `@corvus/sql`), với `availability.capability` là vị từ trên `CapabilitySet`
- [ ] T046 [US2] Sửa `packages/ui/src/components/Toolbar.tsx` — lấy toàn bộ mục từ `commandsFor('toolbar', …)`; thêm trạng thái vô hiệu hoá kèm lý do (hiện Toolbar **không có** thuộc tính `disabled` nào — C-13)
- [ ] T047 [US2] Sửa `packages/ui/src/components/Toolbar.tsx` dòng 30-32 — ba lệnh `Table`/`View`/`Function` phải dẫn tới danh sách **đã lọc theo đúng loại**, không cùng `setView('objects')` (FR-014, sửa C-10)
- [ ] T048 [US2] Sửa `packages/ui/src/components/MenuBar.tsx` — lấy mục từ `commandsFor('menubar', …)`; **xoá** biến thể `null` khỏi kiểu `MenuEntry` ở dòng 8 để mục chết không compile được (sửa C-12)
- [ ] T049 [US2] Sửa `packages/ui/src/components/MenuBar.tsx` dòng 81-82 — `Import wizard…` và `Export wizard…` hiện chỉ mở tab Automation. Tạm **ẩn** hai mục (FR-026: lệnh chưa triển khai không được xuất hiện) tới khi US4 nối xong L-5, rồi hiện lại (sửa C-11)
- [ ] T050 [US2] Sửa `packages/ui/src/components/ObjectToolbar.tsx` — lấy mục từ `commandsFor('object-toolbar', …)`; lệnh `deleteTable` hiện chỉ `setView('objects')` (không xoá gì) và `importW`/`exportW` chỉ `setView('jobs')` — xử lý như T049
- [ ] T051 [US2] Sửa `packages/ui/src/components/dialogs/CommandPalette.tsx` — lấy lệnh từ `commandsFor('command-palette', …)` thay danh sách viết tay
- [ ] T052 [US2] Sửa `packages/ui/src/components/useNavTree.ts` + `packages/ui/src/navigation/objectGroups.ts` — cây chỉ hiện nhóm loại đối tượng mà engine hiện tại hỗ trợ (FR-013); MySQL không hiện Materialized View / Sequence / Domain / Type nhưng có Event; MongoDB hiện Collection thay Table

### Gắn context menu lên 11 bề mặt

- [ ] T053 [US2] Sửa `packages/ui/src/components/navigation/ObjectContextMenu.tsx` — **bỏ** chuỗi tiếng Việt cứng và hex `#ef4444`, chuyển sang nhận lệnh từ registry qua `ContextMenu.tsx`. Đây là code chết hiện tại (C-19/C-20); sửa và đưa vào dùng, **không viết lại** (AGENTS.md §4)
- [ ] T054 [US2] Sửa `packages/ui/src/components/grid/CellContextMenu.tsx` — cùng cách xử lý T053
- [ ] T055 [US2] Gắn `useContextMenu` vào `packages/ui/src/components/NavPane.tsx` — bề mặt **S-01**, 6 mục tiêu: connection / database / namespace / object-group / object / sub-element
- [ ] T056 [P] [US2] Gắn vào `packages/ui/src/views/ObjectsView.tsx` — bề mặt **S-02**, 3 mục tiêu: một đối tượng / nhiều đối tượng đã chọn / vùng trống
- [ ] T057 [P] [US2] Gắn vào `packages/ui/src/components/grid/` (DataGrid) — bề mặt **S-03**, 4 mục tiêu: ô / tiêu đề dòng / tiêu đề cột / vùng trống
- [ ] T058 [P] [US2] Gắn vào `packages/ui/src/views/SqlView.tsx` — bề mặt **S-04**, 2 mục tiêu: vùng văn bản đã chọn / vùng trống
- [ ] T059 [P] [US2] Gắn vào `packages/ui/src/views/QueryBuilderView.tsx` — bề mặt **S-05**, 3 mục tiêu: đối tượng / đường join / vùng trống
- [ ] T060 [P] [US2] Gắn vào `packages/ui/src/views/ErView.tsx` — bề mặt **S-06**, 3 mục tiêu: bảng / đường quan hệ / vùng trống
- [ ] T061 [P] [US2] Gắn vào `packages/ui/src/components/TabStrip.tsx` — bề mặt **S-07**, mục tiêu: một tab
- [ ] T062 [P] [US2] Gắn vào `packages/ui/src/components/Toolbar.tsx` — bề mặt **S-08**, mục tiêu: chính thanh công cụ (đổi cỡ icon, hiện/ẩn nhãn)
- [ ] T063 [P] [US2] Gắn vào `packages/ui/src/components/common/SnippetPicker.tsx` — bề mặt **S-09**, 2 mục tiêu: một snippet / vùng trống
- [ ] T064 [P] [US2] Gắn vào `packages/ui/src/views/JobsView.tsx` — bề mặt **S-10**, 2 mục tiêu: một item / toàn danh sách (tạm dừng, tiếp tục, dừng, xoá mục đã xong)
- [ ] T065 [P] [US2] Gắn vào `packages/ui/src/views/CompareView.tsx` — bề mặt **S-11**, mục tiêu: khung (bật/tắt hiển thị khác biệt)

### Multi-select và quyền

- [ ] T066 [US2] Cài `ObjectSelection` đa phần tử vào `NavPane` và `ObjectsView` — nhấp phải ngoài vùng chọn phải **thay** vùng chọn bằng mục dưới con trỏ rồi đặt `anchor`; chọn lẫn loại ⇒ `kind = null` (bất biến A-4, A-5)
- [ ] T067 [US2] Cài `cardinality` vào tầng trình bày — lệnh `'single'` khi `names.length > 1` phải vô hiệu hoá kèm lý do `multi-selection-unsupported`; **cấm** lấy `names[0]` (FR-051)
- [ ] T068 [US2] Nối `security.privileges` để gating theo quyền (FR-016); trước khi nối xong với engine nào thì mặc định **an toàn**: coi như không đủ quyền cho lệnh ghi, kèm lý do rõ

### Test US2

- [ ] T069 [P] [US2] Viết `packages/ui/src/commands/__tests__/availability-matrix.test.ts` — với **cả 7 engine**, đối chiếu kết quả `evaluate()` cho mọi lệnh với [capability-matrix.md](../../docs/02-architecture/capability-matrix.md) §2. Bảng năng lực là nguồn đối chiếu; lệch nhau phải xử lý lệch đó trước (plan.md D-02)
- [ ] T070 [US2] Viết `packages/ui/src/__tests__/gating.dom.test.tsx` — SQLite: lệnh tạo Procedure/Function disabled kèm lý do; MySQL: cây không có Materialized View/Sequence/Domain/Type nhưng có Event; Redis: Explain/ER/Table Designer disabled; MongoDB: hiện Collection, Explain khả dụng, không Sequence/Trigger; chưa kết nối: mọi lệnh phụ thuộc kết nối disabled (kịch bản 1–5 của US2)
- [ ] T071 [US2] Viết `packages/ui/src/__tests__/context-menu-surfaces.dom.test.tsx` — cả **11 bề mặt** phản hồi nhấp phải; với mỗi bề mặt, mỗi `TargetKind` cho menu **không rỗng** và tập lệnh khớp mục tiêu (bất biến I-10, FR-025B)
- [ ] T072 [US2] Viết `packages/ui/src/__tests__/context-menu-keyboard.dom.test.tsx` — cả 11 bề mặt mở được menu bằng `Shift+F10` và phím Menu; mũi tên điều hướng, Enter chọn, Escape đóng và trả tiêu điểm về mục ban đầu (FR-025C, FR-047B)
- [ ] T073 [US2] Viết `packages/ui/src/__tests__/gating-presentation.dom.test.tsx` — cùng một lệnh mà engine không hỗ trợ: **ẩn** trong context menu nhưng **disabled kèm lý do** trên thanh công cụ; khẳng định `evaluate()` chỉ được gọi từ một chỗ (FR-046, FR-046B, kịch bản 9 của US2)
- [ ] T074 [US2] Viết `packages/ui/src/__tests__/multi-select.dom.test.tsx` — chọn nhiều bảng: Drop/Maintain khả dụng cho cả tập, Design Table disabled kèm lý do; nhấp phải ngoài vùng chọn đổi vùng chọn (kịch bản 10 của US2, FR-051)
- [ ] T075 [US2] Hạ `SURFACE_DEBT` trong `tools/check-ui-wiring.ts` xuống **0** và xác nhận `pnpm verify` xanh

**Checkpoint**: `pnpm verify` xanh; `SURFACE_DEBT = 0`; xác minh bằng mắt bước 3–6 của [quickstart.md §5](./quickstart.md) đạt

---

## Phase 5: User Story 3 — Bộ kiểm thử UI chạy trên DB Docker thật (Priority: P1)

**Goal**: hai tầng kiểm thử; hồi quy kiểu "mất đường dây lệnh" hay "hiển thị sai ngữ cảnh" đều bị chặn.

**Independent Test**: chạy bộ kiểm thử trên trạng thái mã **trước khi sửa** — phải đỏ ở C-06/C-07/C-10/C-13/C-19; sau US1/US2 phải xanh (SC-007).

> Phase này chạy **song song** được với Phase 3–4 (khác file), nhưng phải xanh trước khi mở Phase 6.

- [ ] T076 [US3] Viết `e2e/fixtures/containers.ts` — tiền kiểm container + seed cho tầng sâu; thiếu thì dừng sớm với thông điệp chỉ rõ lệnh cần chạy (FR-021). Chỉ nhận host/port của stack container dự án (SR-007)
- [ ] T077 [US3] Viết `e2e/fixtures/seedInventory.ts` — bản tầng sâu của `SeedInventory`, đọc từ DB thật lúc chạy; dùng **chung một bộ seed** với tầng rộng để hai tầng không lệch (plan.md Complexity Tracking)
- [ ] T078 [US3] Viết `e2e/specs/L1-connection.spec.ts` — tạo → test → mở → duyệt cây → đóng, trên PostgreSQL và MySQL (research.md R8). Khẳng định cây liệt kê **chính xác** tập đối tượng của seed, không thiếu không thừa (FR-023B, kịch bản 2 của US3)
- [ ] T079 [P] [US3] Viết `e2e/specs/L2-L3-sql.spec.ts` — gõ SQL → chạy → đọc nhiều result set → huỷ truy vấn đang chạy (L-2, L-3)
- [ ] T080 [P] [US3] Viết `e2e/specs/L4-data-edit.spec.ts` — sửa ô → xem trước câu lệnh → apply → truy vấn lại DB xác nhận đổi thật; huỷ bỏ giao dịch → DB không đổi (L-4, kịch bản 4 của US3)
- [ ] T081 [US3] Viết `packages/ui/src/__tests__/nav-tree-seed.dom.test.tsx` — với **cả 7 engine**, khẳng định cây liệt kê chính xác tập bảng/view/function/procedure/trigger của seed, so với `SeedInventory` đọc lúc chạy. **Cấm** danh sách viết cứng (FR-020)
- [ ] T082 [P] [US3] Viết `packages/ui/src/__tests__/data-browse-paging.dom.test.tsx` — mở bảng 100k dòng trên 7 engine: phân trang hoạt động, không nạp toàn bộ, first paint ≤ 1,5 s (research.md R9)
- [ ] T083 [US3] Viết `packages/ui/src/__tests__/inventory.test.ts` — kiểm kê **ba chiều** của FR-025: (a) mọi lệnh có hành động; (b) mọi phương thức trong 76 method mà registry khai báo đều được gọi thật; (c) mọi lệnh **thực sự xuất hiện** trên đúng tập bề mặt đã khai báo (SC-016)
- [ ] T084 [US3] Viết `packages/ui/src/__tests__/preview-token-required.test.ts` — khẳng định không lệnh nào có `rpc` chứa `apply*` mà gọi được không qua `requestPreview`; và `write === 'preview-required'` ⇒ có cặp `preview*`/`apply*` khớp `METHODS` (bất biến I-4, I-5, Cấm 5)
- [ ] T085 [US3] Viết `packages/ui/src/__tests__/idempotent-run.dom.test.tsx` — chạy hai lần liên tiếp cho kết quả giống nhau; bộ kiểm thử tự dọn hoặc tự đặt lại dữ liệu nó tạo (FR-022, SC-009)
- [ ] T086 [US3] Kiểm chứng SC-007: `git stash` các thay đổi US1/US2, chạy bộ kiểm thử, khẳng định nó **đỏ** đúng ở C-06/C-07/C-10/C-13/C-19; `git stash pop`, chạy lại, khẳng định **xanh**. Ghi output cả hai lần vào PR
- [ ] T087 [US3] Nối tầng kiểm thử UI vào `pnpm verify` và xác nhận `test:e2e` **thực sự có nội dung chạy** — trước feature này nó là lệnh rỗng (C-16, FR-024)

**Checkpoint**: `pnpm verify` + `pnpm test:e2e` đều xanh và đều có nội dung thật; SC-007 đã kiểm chứng có output

---

## Phase 6: User Story 4 — Hoàn thiện các workflow chức năng đang treo (Priority: P2)

**Goal**: cả 46 phương thức RPC còn treo có đường vào từ giao diện (Q2 = 100%, không hoãn nhóm nào).

**Independent Test**: mỗi lệnh dẫn tới một thay đổi quan sát được trên DB thật hoặc một kết quả đọc được từ DB thật.

> Thứ tự trong phase này theo **Luồng cốt lõi L-1…L-6** — thứ tự nghiệm thu tuyệt đối do người dùng chỉ định.

### L-1 · Vòng đời kết nối (7 method)

- [ ] T088 [US4] Nối `connection.parseUri` + `connection.toUri` vào `packages/ui/src/components/dialogs/ConnectionDialog.tsx` — tạo kết nối từ URI và sao chép URI. **Che phần credential** khi hiển thị và khi sao chép; không ghi URI nguyên vẹn vào nhật ký (SR-002, plan.md Threat Model) (FR-027)
- [ ] T089 [US4] Nối `connection.get` + `connection.duplicate` + `connection.delete` — sửa, nhân bản, xoá kết nối (FR-027)
- [ ] T090 [US4] Tạo `packages/ui/src/components/dialogs/ManageConnectionsDialog.tsx` — danh sách quản lý kết nối, dùng lại `Modal` đã có (FR-027)

### L-2, L-3 · Soạn và chạy SQL (3 method)

- [ ] T091 [US4] Nối `query.cancel` vào `packages/ui/src/views/SqlView.tsx` — nút huỷ phải dừng truy vấn **thật ở phía server**, giao diện về trạng thái sẵn sàng (FR-029)
- [ ] T092 [P] [US4] Nối `query.parse` — phân tích câu lệnh cho gợi ý và cảnh báo
- [ ] T093 [P] [US4] Nối `query.history.clear` vào `packages/ui/src/components/common/QueryHistoryPanel.tsx` — người dùng xoá được lịch sử (SR: lịch sử là dữ liệu Internal, cho phép xoá)
- [ ] T094 [P] [US4] Nối `ai.explainPlan` vào SqlView và `ai.chat` vào InfoPane. **Ngoại lệ không thương lượng** (AGENTS.md §9): chỉ gửi lược đồ, **tuyệt đối không** gửi dữ liệu dòng cho AI

### L-4 · Sửa dữ liệu và giao dịch (5 method)

- [ ] T095 [US4] Nối `tx.begin` / `tx.commit` / `tx.rollback` / `tx.status` — bật/tắt tự động ghi, xác nhận, huỷ bỏ, và hiện trạng thái giao dịch hiện tại (FR-028). Huỷ bỏ ⇒ không thay đổi nào lọt vào DB; xác nhận ⇒ toàn bộ vào cùng một lần
- [ ] T096 [P] [US4] Nối `data.fkLookup` vào `packages/ui/src/components/dialogs/ForeignKeyLookupDialog.tsx` — tra cứu khoá ngoại trong lưới

### L-5 · Nhập / xuất dữ liệu (5 method + 6 method DDL)

- [ ] T097 [US4] Nối `file.pickOpen` / `file.pickSave` / `file.readChunk` / `file.writeChunk` / `file.stat` vào `packages/ui/src/wizards/ImportWizard.tsx` và `ExportWizard.tsx` — hai wizard này hiện có **0** lần gọi client. Đi qua RPC, **không** sờ `window.electron` (Cấm 3, ADR-0009)
- [ ] T098 [US4] Cài luồng nhập nhiều bước với ánh xạ cột vào `ImportWizard` dùng `FieldMappingGrid.tsx` đã có; dòng bị từ chối phải **báo cáo kèm lý do**, không bỏ qua im lặng (FR-033, kịch bản 8 của US4)
- [ ] T099 [US4] Cài luồng xuất vào `ExportWizard` — định dạng nào không hỗ trợ cho loại đối tượng hiện tại thì vô hiệu hoá kèm lý do (FR-034)
- [ ] T100 [US4] Hiện lại hai mục menu đã ẩn ở T049 và các lệnh đã ẩn ở T050, giờ đã có chức năng thật
- [ ] T101 [US4] Nối `ddl.previewView` + `ddl.applyView` vào `packages/ui/src/views/ViewDesigner.tsx` — qua bước xem trước câu lệnh (FR-031, Cấm 5)
- [ ] T102 [P] [US4] Nối `ddl.previewRoutine` + `ddl.applyRoutine` vào `RoutineDesigner.tsx` và `TriggerDesigner.tsx` (FR-031)
- [ ] T103 [US4] Nối `ddl.dropObject` vào `packages/ui/src/components/dialogs/DropObjectDialog.tsx` — với `cardinality: 'multi'`, bước xem trước phải liệt kê câu lệnh cho **toàn bộ** đối tượng trong lô, không chỉ cái đầu (FR-052)
- [ ] T104 [US4] Nối `ddl.maintain` vào `packages/ui/src/components/dialogs/TableMaintenanceDialog.tsx` — thao tác bảo trì đối tượng, nhận nhiều đối tượng (FR-031, FR-050)
- [ ] T105 [US4] Đưa `packages/ui/src/components/dialogs/DdlPartialFailureDialog.tsx` vào dùng cho lệnh theo lô — component này đang là code chết cùng nhóm C-19. Thất bại giữa lô phải báo cáo **từng đối tượng**: cái nào xong, cái nào lỗi và vì sao (edge case của spec)
- [ ] T106 [P] [US4] Nối `introspect.dependencies` + `introspect.identifiers` + `introspect.routineMeta` vào `packages/ui/src/components/InfoPane.tsx` — tab Using / Used By / Identifiers

### Phần còn lại của US4 (13 method)

- [ ] T107 [US4] Nối `security.users` / `security.roles` / `security.privileges` / `security.previewGrant` / `security.applyGrant` vào `UsersDialog.tsx`, `UserDesignerModal.tsx`, `RoleDesignerModal.tsx` — cả ba hiện có **0** lần gọi client. Dữ liệu thật từ server; mọi thay đổi qua bước xem trước (FR-030, Cấm 5)
- [ ] T108 [US4] Nối `job.start` / `job.get` / `job.list` / `job.log` / `job.artifacts` / `job.cancel` vào `packages/ui/src/views/JobsView.tsx` và `BackupView.tsx` — `BackupView` hiện là màn hình tĩnh (C-03). Tác vụ chạy lâu phải hiện tiến độ, cho huỷ, và ghi lịch sử xem lại được (FR-036)
- [ ] T109 [US4] Cài sao lưu và phục hồi qua `job.start` với `kind: 'backup'` / `'restore'` vào `BackupView.tsx` + `RestoreWizard.tsx` (hiện 0 lần gọi client) — kết quả kiểm chứng bằng cách truy vấn lại dữ liệu sau phục hồi (FR-032)
- [ ] T110 [P] [US4] Nối `schedule.update` + `schedule.history` vào `JobsView.tsx` — sửa lịch trình và xem lịch sử chạy (FR-036)
- [ ] T111 [US4] Nối `workspace.settings.get` + `workspace.settings.set` vào `packages/ui/src/components/dialogs/SettingsDialog.tsx` — thiết lập phải **còn nguyên sau khi khởi động lại ứng dụng** (FR-035). Hiện thiết lập không được lưu bền
- [ ] T112 [US4] Nối `packages/ui/src/views/VirtualObjectsView.tsx` (hiện 0 lần gọi client) tới dữ liệu thật — nhóm ảo

### Test US4

- [ ] T113 [US4] Viết `packages/ui/src/__tests__/tx-lifecycle.dom.test.tsx` — huỷ bỏ ⇒ DB không đổi; xác nhận ⇒ toàn bộ vào cùng lần. Xác nhận bằng truy vấn lại DB (kịch bản 3 của US4)
- [ ] T114 [P] [US4] Viết `packages/ui/src/__tests__/query-cancel.dom.test.tsx` — truy vấn chạy lâu, bấm huỷ, khẳng định dừng ở phía server (kịch bản 4)
- [ ] T115 [P] [US4] Viết `packages/ui/src/__tests__/import-export-roundtrip.dom.test.tsx` — xuất bảng ra tệp rồi nhập lại vào bảng trống cùng cấu trúc: cùng số dòng, cùng giá trị (kịch bản 9)
- [ ] T116 [P] [US4] Viết `packages/ui/src/__tests__/security.dom.test.tsx` — danh sách người dùng/quyền là dữ liệu thật; mọi thay đổi có bước xem trước (kịch bản 5)
- [ ] T117 [P] [US4] Viết `packages/ui/src/__tests__/settings-persistence.dom.test.tsx` — đổi thiết lập, dựng lại app, thiết lập còn nguyên (kịch bản 6)
- [ ] T118 [P] [US4] Viết `packages/ui/src/__tests__/backup-restore.dom.test.tsx` — sao lưu → xoá bảng → phục hồi → truy vấn lại xác nhận dữ liệu về (kịch bản 7)
- [ ] T119 [P] [US4] Viết `packages/ui/src/__tests__/batch-partial-failure.dom.test.tsx` — xoá 5 bảng, bảng thứ 3 bị khoá ngoại chặn: báo cáo theo từng đối tượng, không để trạng thái nửa vời không giải thích được (edge case)
- [ ] T120 [US4] Viết `e2e/specs/L5-import-export.spec.ts` — luồng nhập/xuất đầu-cuối trên ứng dụng thật, PostgreSQL + MySQL (FR-023B)
- [ ] T121 [US4] Hạ `UI_WIRING_DEBT` xuống **0** trong `tools/check-ui-wiring.ts` và xác nhận `pnpm verify` xanh (SC-010: 76/76)

**Checkpoint**: `UI_WIRING_DEBT = 0`; `pnpm verify` + `pnpm test:e2e` xanh; L-1…L-5 đã nghiệm thu

---

## Phase 7: User Story 5 — Bộ công cụ di trú dữ liệu trong menu Tools (Priority: P2)

**Goal**: bốn công cụ L-6 chạy được đầu-cuối trên DB thật.

**Independent Test**: hai database Docker khác cấu trúc và dữ liệu; chạy từng công cụ, xác nhận bằng truy vấn lại **cả nguồn và đích**.

> Không cần phương thức RPC mới: `JobKind` đã có `'transfer'` và `'sync'`, và `job.start` nhận `config` dạng record mở nên Structure Sync đi bằng `kind: 'sync'` với `config.mode = 'structure'`.

- [ ] T122 [US5] Tạo `packages/ui/src/wizards/DataTransferWizard.tsx` dùng lại `WizardShell.tsx` đã có (AGENTS.md §2: `WizardShell` dùng ở 6 wizard — **không** tạo bản thứ hai). Chọn hai kết nối, tập đối tượng, chế độ chuyển; `job.start` với `kind: 'transfer'` (FR-037)
- [ ] T123 [P] [US5] Tạo `packages/ui/src/wizards/DataSyncWizard.tsx` — so sánh dữ liệu theo từng dòng, chọn tập câu lệnh đồng bộ, xem trước rồi chạy; `kind: 'sync'`, `config.mode = 'data'` (FR-038, Cấm 5)
- [ ] T124 [P] [US5] Tạo `packages/ui/src/wizards/StructureSyncWizard.tsx` — so sánh cấu trúc theo từng đối tượng (thiếu cột, thiếu index, khác kiểu), sinh câu lệnh đồng bộ để xem trước; `kind: 'sync'`, `config.mode = 'structure'` (FR-039)
- [ ] T125 [US5] Nối `packages/ui/src/views/CompareView.tsx` (hiện 0 lần gọi client — C-03) tới `job.*` để hiện kết quả so sánh thật cho T123/T124
- [ ] T126 [US5] Tạo `packages/ui/src/wizards/DumpExecuteSqlWizard.tsx` — kết xuất database hoặc tập đối tượng ra tệp SQL, và chạy một tệp SQL vào một kết nối, với tiến độ và **báo cáo lỗi theo từng câu lệnh** (FR-040)
- [ ] T127 [US5] Khai báo bốn công cụ vào `packages/ui/src/commands/defs/tools.ts` với bề mặt `menubar` + `ctx-nav` — theo Navicat, Dump/Execute SQL File nằm ở context menu của database đang mở. Engine không hỗ trợ công cụ nào thì vô hiệu hoá kèm lý do (FR-041, kịch bản 5 của US5)
- [ ] T128 [US5] Cài huỷ giữa tiến trình cho cả bốn công cụ qua `job.cancel` — trạng thái đích **không được** để lại dở dang không giải thích được (FR-041, kịch bản 6)
- [ ] T129 [P] [US5] Viết `packages/ui/src/__tests__/data-transfer.dom.test.tsx` — chuyển tập bảng giữa hai engine khác nhau; xác nhận bằng đếm dòng và so khớp giá trị ở **cả hai** phía (kịch bản 1)
- [ ] T130 [P] [US5] Viết `packages/ui/src/__tests__/data-sync.dom.test.tsx` — hai DB cùng cấu trúc lệch dữ liệu: liệt kê đúng dòng thêm/sửa/xoá; sau khi chạy hai bên khớp (kịch bản 2)
- [ ] T131 [P] [US5] Viết `packages/ui/src/__tests__/structure-sync.dom.test.tsx` — hai DB lệch cấu trúc: liệt kê đúng khác biệt, sinh câu lệnh xem trước (kịch bản 3)
- [ ] T132 [P] [US5] Viết `packages/ui/src/__tests__/dump-execute-sql.dom.test.tsx` — kết xuất rồi chạy vào DB trống: cùng tập đối tượng, cùng dữ liệu (kịch bản 4)
- [ ] T133 [US5] Viết `e2e/specs/L6-tools.spec.ts` — bốn công cụ đầu-cuối trên ứng dụng thật, PostgreSQL + MySQL (FR-023B, SC-013)

**Checkpoint**: cả 6 luồng cốt lõi L-1…L-6 xanh trên **cả hai** tầng kiểm thử (SC-014)

---

## Phase 8: User Story 6 — Hàng đợi ưu tiên cho khoảng trống còn lại (Priority: P3)

**Goal**: mỗi hạng mục ❌/⚠️ còn lại có một trạng thái dứt khoát. **Không hiện thực chức năng nào.**

- [ ] T134 [US6] Tạo `docs/04-plan/navicat-feature-parity.md` — chuyển bảng đối chiếu B.5 của [spec.md](./spec.md) thành tài liệu sống trong `docs/`, mỗi hạng mục có trạng thái: đã có / trong hàng đợi (kèm mức ưu tiên) / tuyên bố ngoài phạm vi (kèm lý do) (FR-042, SC-011)
- [ ] T135 [US6] Rà lại 24 chương sau khi US1–US5 xong, cập nhật trạng thái, và thêm mục ghi rõ mỗi chức năng tương lai phải tuân thủ FR-010…FR-016 (gating) và FR-017…FR-025C (kiểm thử) (FR-043)

**Checkpoint**: số hạng mục không có trạng thái = 0

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T136 [P] Siết luật `no-orphans` trong `.dependency-cruiser.cjs` — `pathNot` hiện loại trừ `index.ts`, nên ba component orphan của C-19 (`ObjectContextMenu`, `CellContextMenu`, `DdlPartialFailureDialog`) lọt qua cổng vì được re-export từ `index.ts`. Siết để cổng bắt được orphan re-export lần sau
- [ ] T137 [P] Cập nhật `docs/05-rules/ui-rules.md` — thêm mục về sổ đăng ký lệnh, 11 bề mặt context menu, và luật ẩn-vs-vô-hiệu-hoá theo lý do (FR-046B)
- [ ] T138 [P] Cập nhật `docs/02-architecture/overview.md` — thêm `packages/ui/src/context/` và `packages/ui/src/commands/` vào bản đồ kiến trúc
- [ ] T139 [P] Sửa lệch tài liệu phát hiện trong lúc lập kế hoạch: `docs/05-rules/AGENTS.md` §8 trỏ tới `packages/services/src/` (không tồn tại — thực tế là `packages/engine/src/handlers/`) và `packages/ui/src/i18n/<lang>/<namespace>.json` (thực tế là `dictionaries.ts`)
- [ ] T140 Cập nhật `docs/04-plan/testing-strategy.md` §1 — thêm tầng kiểm thử rộng vào bảng 5 tầng, ghi ngân sách thời gian thật đo được cho cả hai tầng
- [ ] T141 [P] Đo và ghi các mục tiêu độ trễ của [research.md R9](./research.md) vào `docs/04-plan/testing-strategy.md` §8 — thay số dự kiến bằng số đo thật
- [ ] T142 Chạy `pnpm verify` + `pnpm test:e2e` lần cuối, ghi output vào PR; xác minh bằng mắt trọn 8 bước của [quickstart.md §5](./quickstart.md); đối chiếu toàn bộ 16 SC của spec và ghi rõ SC nào đạt, SC nào chưa và vì sao

---

## Dependencies

```
Phase 1 (Setup)
   └─▶ Phase 2 (Foundational)
          ├─▶ Phase 3 (US1) ──┐
          │                   ├─▶ Phase 6 (US4) ─┐
          ├─▶ Phase 4 (US2) ──┘                  ├─▶ Phase 9 (Polish)
          │        │                             │
          │        └─▶ Phase 7 (US5) ────────────┤
          └─▶ Phase 5 (US3) ─────────────────────┘
                                    Phase 8 (US6) ─┘
```

| Story | Chặn bởi | Vì sao |
|---|---|---|
| US1 | Phase 2 | Cần kiểu `ActiveContext` |
| US2 | Phase 2 + **US1** | `evaluate()` đọc `ActiveContext`; không có ngữ cảnh thì không gating được |
| US3 | Phase 2 | Chạy song song với US1/US2 (khác file), nhưng phải xanh trước khi mở US4 |
| US4 | **US1 + US2** | Mỗi lệnh nối vào phải qua registry và phải gating được |
| US5 | **US1 + US2** | Cùng lý do; độc lập với US4 nên chạy song song được |
| US6 | US1…US5 | Chỉ rà soát trạng thái sau khi các story kia xong |

---

## Parallel Execution Examples

**Phase 3 (US1) — bỏ chuỗi cứng khỏi chrome**: T028, T029, T030, T031, T033 chạy song song (5 file khác nhau, không phụ thuộc nhau). T027 và T032 phải tuần tự vì chạm `Toolbar.tsx` và `dictionaries.ts` mà task khác cũng đọc.

**Phase 4 (US2) — gắn 11 bề mặt**: T056…T065 chạy song song (10 file khác nhau). T055 làm trước vì `NavPane` là bề mặt tham chiếu để chốt hình dạng `useContextMenu`.

**Phase 4 (US2) — test**: T069 chạy song song với T070…T074 (T069 không cần DOM).

**Phase 6 (US4) — test**: T114…T119 chạy song song (6 file test khác nhau).

**Phase 7 (US5) — wizard**: T123, T124 song song sau khi T122 chốt hình dạng dùng `WizardShell`. T129…T132 song song.

**Phase 9**: T136, T137, T138, T139, T141 song song (5 file khác nhau).

---

## Implementation Strategy

### MVP = Phase 1 + 2 + 3 (US1)

Giao được độc lập và sửa **trực tiếp** lỗi người dùng báo: "connect db xong, mở connection thì lỗi". Sau MVP, chrome nói đúng về DB thật và lỗi mở kết nối đọc được kèm nút thử lại.

### Incremental delivery

| Mốc | Phase | Giá trị giao được |
|---|---|---|
| M1 | 1–3 | Mở kết nối đúng, chrome đúng, lỗi phục hồi được (**MVP**) |
| M2 | 4 | Nút bấm phụ thuộc engine; 11 bề mặt context menu hoạt động |
| M3 | 5 | Cổng chống hồi quy hoạt động — từ đây trở đi hồi quy bị chặn |
| M4 | 6 | L-1…L-5 xong; `UI_WIRING_DEBT = 0` |
| M5 | 7 | L-6 xong — trọn 6 luồng cốt lõi |
| M6 | 8–9 | Hàng đợi có trạng thái; tài liệu và cổng máy được siết |

**Khuyến nghị**: đưa M3 lên **song song với M1** thay vì chờ tuần tự. Lý do: nếu cổng chống hồi quy chỉ bật ở M3 mà M1/M2 đã đóng trước đó, không có gì chứng minh M1/M2 thật sự sửa được vấn đề — mà đó chính là điều SC-007 đòi ("test đỏ trước, xanh sau").

---

## Tổng kết

| | Số lượng |
|---|---:|
| Tổng task | **142** |
| Phase 1 Setup | 7 |
| Phase 2 Foundational | 15 |
| Phase 3 US1 (P1) | 22 |
| Phase 4 US2 (P1) | 31 |
| Phase 5 US3 (P1) | 12 |
| Phase 6 US4 (P2) | 34 |
| Phase 7 US5 (P2) | 12 |
| Phase 8 US6 (P3) | 2 |
| Phase 9 Polish | 7 |
| Task có `[P]` (song song được) | 52 |
| Task viết/chạy test | 38 |
