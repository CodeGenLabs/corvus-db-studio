# Tasks: Nâng cấp trải nghiệm UI/UX theo chuẩn Navicat 17 (Navicat UI Ergonomics)

**Branch**: `004-navicat-ui-ergonomics` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup Infrastructure & Contract Extensions

**Goal**: Mở rộng các định nghĩa hợp đồng RPC (`@corvus/contract`), lưu trữ bền vững (`@corvus/storage`), và bộ từ điển đa ngôn ngữ (`dictionaries.ts`).

- [x] T001 [P] Mở rộng `packages/contract/src/methods/connection.ts` — thêm `ConnectionColorSchema` (`'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'`) và bổ sung trường `color` vào `ConnectionProfileSchema` (FR-010)
- [x] T002 [P] Mở rộng `packages/contract/src/methods/data.ts` — thêm `FilterRuleSchema`, `SortRuleSchema`, và các trường tuỳ chọn `filterRules`, `sortRules` trong `DataBrowseParamsSchema` (FR-004, FR-005)
- [x] T003 Cập nhật `packages/storage/src/` — lưu trữ và truy vấn trường `color` trong bảng `connections` của `workspace.db` (FR-010)
- [x] T004 Cập nhật `packages/engine/src/handlers/connection.ts` — xử lý trường `color` trong các RPC handler `connection.create`, `connection.update`, `connection.list` (FR-010)
- [x] T005 [P] Cập nhật `packages/ui/src/i18n/dictionaries.ts` — bổ sung toàn bộ các chuỗi i18n cho 3 ngôn ngữ VI, EN, JA cho Bottom Bar, Filter/Sort, Table Designer 4 tabs, Pin Result, Split Layout, Connection Colors, và Find in DB

**Checkpoint**: `pnpm typecheck` và `tools/check-contract.ts` pass sạch sẽ.

---

## Phase 2: User Story 1 — DataGrid Bottom Navigation Bar & Cell Quick Actions (Priority: P1 - MVP)

**Goal**: Cung cấp thanh điều hướng đáy bảng tính chuẩn Navicat (`+ - ✓ ✗ ↻`, phân trang `[⏮ ◀ 1/6 ▶ ⏭]`, `Record A of B in page C`, limit selector) và menu chuột phải trên ô dữ liệu (`Set to NULL`, `Copy As`).

- [x] T006 [US1] Tạo `packages/ui/src/components/grid/DataGridBottomBar.tsx` — hiển thị cụm nút thao tác dòng: `[+]` Thêm dòng, `[-]` Xoá dòng, `[✓]` Áp dụng lưu, `[✗]` Huỷ thay đổi, `[↻]` Làm mới (FR-001)
- [x] T007 [US1] Cài đặt cụm lật trang `[⏮]` (Trang đầu), `[◀]` (Trang trước), `[Ô nhập trang / Tổng trang]`, `[▶]` (Trang sau), `[⏭]` (Trang cuối) và nhãn `Record A of B in page C` trong `DataGridBottomBar.tsx` (FR-002)
- [x] T008 [US1] Cài đặt dropdown chọn số dòng/trang (`Limit`: `100`, `200`, `500`, `1000`, `All`) trong `DataGridBottomBar.tsx` (FR-002)
- [x] T009 [P] [US1] Cập nhật `packages/ui/src/commands/defs/grid.ts` — khai báo các lệnh: `grid.setNull`, `grid.setEmptyString`, `grid.copyAsInsert`, `grid.copyAsUpdate`, `grid.copyAsTsv`, `grid.filterByValue` (FR-003)
- [x] T010 [US1] Cài đặt logic tạo chuỗi câu lệnh SQL INSERT / UPDATE / TSV và sao chép vào Clipboard hệ thống trong `packages/ui/src/views/DataView.tsx` (FR-003)
- [x] T011 [US1] Cài đặt xử lý gán `NULL` và chuỗi rỗng `""` cho ô dữ liệu, đánh dấu dirty state trong `packages/ui/src/components/grid/DataGrid.tsx` (FR-003)
- [x] T012 [US1] Đấu nối `DataGridBottomBar.tsx` vào chân `packages/ui/src/views/DataView.tsx`, đồng bộ trạng thái phân trang và nạp dữ liệu theo lô qua `data.browse` (FR-001, FR-002)
- [x] T013 [US1] Bổ sung phím tắt thao tác nhanh trong `DataView.tsx`: `Insert`/`Ctrl+N` (thêm dòng), `Ctrl+Delete` (xoá dòng), `Ctrl+S` (lưu), `Escape` (huỷ), `F5` (làm mới), `Ctrl+PageUp/Down` (chuyển trang) (FR-001)
- [x] T014 [P] [US1] Viết bài kiểm thử DOM `packages/ui/src/__tests__/datagrid-bottom-bar.dom.test.tsx` — kiểm tra hiển thị Bottom Bar, chuyển trang, đổi limit, và các nút điều hướng dòng (SC-001)
- [x] T015 [P] [US1] Viết bài kiểm thử DOM `packages/ui/src/__tests__/cell-quick-actions.dom.test.tsx` — kiểm tra `Set to NULL`, `Set to Empty String`, `Copy As -> Insert / Update / TSV` (SC-002)

**Checkpoint**: DataGrid hiển thị Bottom Bar đầy đủ, các thao tác dòng và menu ô hoạt động mượt mà.

---

## Phase 3: User Story 2 — Visual Filter & Sort Toolbar (Priority: P1 - MVP)

**Goal**: Cung cấp thanh công cụ lọc và sắp xếp dữ liệu trực quan trên đầu DataGrid mà không bắt buộc người dùng gõ SQL thủ công.

- [x] T016 [US2] Nâng cấp `packages/ui/src/components/FilterPanel.tsx` — giao diện chọn trường từ metadata cột của bảng đang mở, chọn toán tử so sánh, và nhập giá trị (FR-004)
- [x] T017 [US2] Cài đặt danh sách toán tử hỗ trợ đầy đủ (`=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_null`, `is_not_null`, `between`) trong `FilterPanel.tsx` (FR-004)
- [x] T018 [US2] Hỗ trợ thêm/xoá nhiều dòng điều kiện lọc và kết hợp logic `AND` / `OR` trong `FilterPanel.tsx` (FR-004)
- [x] T019 [US2] Cài đặt giao diện sắp xếp đa cột (Multi-Column Sorting) với thứ tự ưu tiên và hướng `ASC` / `DESC` trong `FilterPanel.tsx` (FR-005)
- [x] T020 [US2] Đấu nối `FilterPanel.tsx` vào `packages/ui/src/views/DataView.tsx` — chuyển đổi bộ lọc trực quan sang query params gọi `data.browse` (FR-004, FR-005)
- [x] T021 [US2] Đấu nối lệnh `Filter -> Field Value` từ Cell Context Menu để tự động bổ sung điều kiện lọc và kích hoạt tìm kiếm tức thì (FR-004)
- [x] T022 [US2] Bổ sung nút bật/tắt `Filter & Sort` trên `packages/ui/src/components/ObjectToolbar.tsx` và gán phím tắt `Ctrl+R` (FR-004)
- [x] T023 [P] [US2] Viết bài kiểm thử DOM `packages/ui/src/__tests__/filter-sort-panel.dom.test.tsx` — kiểm tra thêm điều kiện lọc, sắp xếp đa cột, và lọc nhanh từ ô (SC-003)

**Checkpoint**: Lọc và sắp xếp trực quan hoạt động trơn tru trên DataGrid.

---

## Phase 4: User Story 3 — Tabbed Table Designer (Priority: P1 - MVP)

**Goal**: Trình thiết kế bảng trực quan chia theo 4 tab chuẩn Navicat (Fields, Indexes, Foreign Keys, SQL Preview) với quy trình Preview Token an toàn.

- [x] T024 [US3] Tái cấu trúc `packages/ui/src/views/DesignView.tsx` quản lý 4 tab: `Fields`, `Indexes`, `Foreign Keys`, `SQL Preview` (FR-006)
- [x] T025 [US3] Tạo `packages/ui/src/components/designer/TabFields.tsx` — quản lý danh sách cột (Tên, Kiểu dữ liệu theo engine, Length, Decimals, Allow Null, PK, Auto Inc, Default, Comment) + Nút thêm/xoá/di chuyển cột (FR-006)
- [x] T026 [US3] Tạo `packages/ui/src/components/designer/TabIndexes.tsx` — quản lý danh sách chỉ mục (Tên Index, Cột thành phần, Loại `NORMAL`/`UNIQUE`/`FULLTEXT`, Thuật toán `BTREE`/`HASH`) (FR-006)
- [x] T027 [US3] Tạo `packages/ui/src/components/designer/TabForeignKeys.tsx` — quản lý ràng buộc khoá ngoại (Tên FK, Cột con, Bảng cha, Cột cha, `On Delete`, `On Update`) (FR-006)
- [x] T028 [US3] Tạo `packages/ui/src/components/designer/TabSqlPreview.tsx` — hiển thị câu lệnh DDL `CREATE TABLE` / `ALTER TABLE` tự động sinh trước khi lưu (FR-006)
- [x] T029 [US3] Tích hợp bộ sinh DDL từ `@corvus/sql` trong `DesignView.tsx` để so sánh diff và sinh câu lệnh chính xác theo từng engine (FR-006, FR-007)
- [x] T030 [US3] Đấu nối nút `Save` trong `DesignView.tsx` gọi RPC `ddl.previewTable` để lấy Preview Token $\rightarrow$ hiển thị modal xác nhận và thực thi qua `ddl.applyTable` (FR-007, Rule 5, ADR-0010)
- [x] T031 [US3] Cài đặt bộ ánh xạ kiểu dữ liệu (`Data Types Dropdown`) theo từng engine (PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, Oracle) trong `TabFields.tsx` (FR-006)
- [x] T032 [P] [US3] Viết bài kiểm thử DOM `packages/ui/src/__tests__/table-designer-tabs.dom.test.tsx` — kiểm tra chỉnh sửa cột, thêm index, thêm FK trên các tab của Table Designer (SC-004)
- [x] T033 [P] [US3] Viết bài kiểm thử DOM `packages/ui/src/__tests__/table-designer-preview-token.dom.test.tsx` — kiểm tra luồng Preview Token an toàn trước khi áp dụng DDL (SC-004, SR-002)

**Checkpoint**: Table Designer 4 tab hoạt động hoàn chỉnh, xem trước DDL chuẩn xác.

---

## Phase 5: User Story 4 — Query Results Tab Pinning & View Split Layout (Priority: P2)

**Goal**: Hỗ trợ ghim tab kết quả truy vấn `[📌 Pin]` để lưu kết quả các lần chạy trước và chuyển đổi bố cục Split (Bottom/Right).

- [x] T034 [US4] Cập nhật `packages/ui/src/views/SqlView.tsx` — quản lý mảng đa tab kết quả `tabs: QueryResultTab[]` (FR-008)
- [x] T035 [US4] Thêm nút biểu tượng `[📌 Pin]` trên tab kết quả và context menu `Pin Tab` trong `SqlView.tsx` (FR-008)
- [x] T036 [US4] Cài đặt logic thực thi truy vấn: nếu tab kết quả hiện tại có `isPinned === true`, tự động mở thêm tab mới `Result 2`, `Result 3` mà không xoá tab đã ghim (FR-008)
- [x] T037 [US4] Hỗ trợ nút `[Unpin]` để bỏ ghim và cho phép tái sử dụng tab kết quả ở lần chạy tiếp theo (FR-008)
- [x] T038 [US4] Thêm nút chuyển đổi Layout `[Bottom Split]` $\leftrightarrow$ `[Right Split]` trên thanh công cụ của `SqlView.tsx` (FR-009)
- [x] T039 [US4] Cài đặt bộ chia màn hình Splitter kéo thả điều chỉnh kích thước giữa vùng soạn thảo SQL và vùng kết quả ở cả 2 chế độ (FR-009)
- [x] T040 [US4] Hỗ trợ phím tắt `Alt+1` .. `Alt+9` để chuyển nhanh giữa các tab kết quả trong `SqlView.tsx` (FR-008)
- [x] T041 [P] [US4] Viết bài kiểm thử DOM `packages/ui/src/__tests__/query-pin-layout.dom.test.tsx` — kiểm tra ghim tab kết quả, chạy nhiều query không bị ghi đè, và chuyển đổi Split layout (SC-005, SC-006)

**Checkpoint**: Ghim tab kết quả và chuyển đổi bố cục Bottom/Right hoạt động mượt mà.

---

## Phase 6: User Story 5 — Connection Colorings & Find in Database (Priority: P2)

**Goal**: Gán màu nhận diện kết nối (Prod/Dev) trên cây điều hướng và thanh tab + Hộp thoại tìm kiếm chuỗi ký tự trên toàn bộ CSDL.

- [x] T042 [US5] Cập nhật `packages/ui/src/components/dialogs/ConnectionDialog.tsx` — thêm bảng chọn 7 màu sắc nhận diện khi tạo hoặc chỉnh sửa kết nối (FR-010)
- [x] T043 [US5] Thêm menu ngữ cảnh `Color` trên node kết nối trong `packages/ui/src/components/NavPane.tsx` (FR-010)
- [x] T044 [US5] Hiển thị chấm màu / viền màu nhận diện kết nối trên `NavPane.tsx` (cây điều hướng) và dải viền trên đỉnh tab trong `packages/ui/src/components/TabStrip.tsx` (FR-010)
- [x] T045 [US5] Tạo component `packages/ui/src/components/dialogs/FindInDatabaseDialog.tsx` — cho phép nhập từ khoá tìm kiếm, chọn chế độ khớp, và chọn phạm vi các bảng cần quét dữ liệu (FR-011)
- [x] T046 [US5] Khai báo lệnh `tools.findInDatabase` trong `packages/ui/src/commands/defs/tools.ts` với phím tắt toàn cục `Ctrl+Shift+F` (FR-011)
- [x] T047 [US5] Cài đặt chức năng tìm kiếm an toàn (Read-only + LIMIT) và nhấp đúp kết quả trong `FindInDatabaseDialog.tsx` để mở DataGrid nhảy thẳng tới dòng khớp (FR-011, SR-001)
- [x] T048 [P] [US5] Viết bài kiểm thử DOM `packages/ui/src/__tests__/connection-colorings.dom.test.tsx` — kiểm tra gán màu kết nối và phản ánh đúng màu trên cây điều hướng và tab bar (SC-007)
- [x] T049 [P] [US5] Viết bài kiểm thử DOM `packages/ui/src/__tests__/find-in-database.dom.test.tsx` — kiểm tra tìm kiếm chuỗi văn bản trong CSDL và mở dòng kết quả (SC-008)

**Checkpoint**: Gán màu kết nối và tìm kiếm trong CSDL hoạt động chuẩn xác.

---

## Phase 7: End-to-End Testing, Quality Gates & Polish

**Goal**: Kiểm thử E2E đầu-cuối, cập nhật tài liệu, và đảm bảo toàn bộ cổng chất lượng xanh 100%.

- [ ] T050 [US1..US5] Viết Playwright E2E spec `e2e/specs/L7-ui-ergonomics.spec.ts` — kiểm thử đầu-cuối 5 gói tính năng trên ứng dụng thật với PostgreSQL và MySQL (SC-009)
- [ ] T051 [P] Cập nhật `docs/05-rules/ui-rules.md` — bổ sung quy chuẩn thiết kế cho Bottom Navigation Bar, Tabbed Table Designer, Pin Results, và Connection Colorings
- [ ] T052 [P] Cập nhật `docs/04-plan/navicat-feature-parity.md` — đánh dấu 5 gói tính năng UI/UX đạt trạng thái ĐÃ CÓ (100%)
- [ ] T053 Chạy kiểm tra tĩnh `tools/check-contract.ts` và `tools/check-ui-wiring.ts` đảm bảo `UI_WIRING_DEBT = 0` và `SURFACE_DEBT = 0`
- [ ] T054 Chạy `pnpm verify` (lint + typecheck + test + build) xác nhận 100% xanh (SC-009)
- [ ] T055 Đối chiếu toàn bộ 10 Tiêu chí Thành công (SC-001 $\rightarrow$ SC-010) trong `spec.md` và lập báo cáo nghiệm thu hoàn tất

---

## Dependencies & Execution Mapping

```
Phase 1: Setup & Contracts (T001-T005)
   │
   ├─▶ Phase 2: US1 DataGrid Bottom Bar & Cell Actions (T006-T015) [MVP]
   │      │
   │      └─▶ Phase 3: US2 Visual Filter & Sort Toolbar (T016-T023) [MVP]
   │
   ├─▶ Phase 4: US3 Tabbed Table Designer (T024-T033) [MVP]
   │
   ├─▶ Phase 5: US4 Query Results Pinning & Split Layout (T034-T041)
   │
   └─▶ Phase 6: US5 Connection Colorings & Find in DB (T042-T049)
          │
          └─▶ Phase 7: E2E Testing, Quality Gates & Polish (T050-T055)
```
