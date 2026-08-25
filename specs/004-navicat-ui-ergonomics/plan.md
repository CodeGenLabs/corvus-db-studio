# Implementation Plan: Nâng cấp trải nghiệm UI/UX theo chuẩn Navicat 17 (Navicat UI Ergonomics)

**Branch**: `004-navicat-ui-ergonomics` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-navicat-ui-ergonomics/spec.md`

---

## 1. Summary

Corvus DB Studio đã đạt 100% kết nối RPC (76/76 methods) và hoạt động ổn định trên 7 engine thật. Mục tiêu của tính năng này là **tối ưu hoá và nâng cấp các điểm chạm giao diện người dùng (UI/UX Ergonomics)** để mang lại trải nghiệm tiện tay, tự nhiên và dễ dùng như Navicat 17 — tập trung vào 5 gói cốt lõi:
1. **DataGrid Bottom Navigation Bar & Cell Actions**: Thanh điều hướng đáy bảng tính (`+ - ✓ ✗ ↻`, phân trang, limit selector) và menu chuột phải trên ô (`Set to NULL`, `Copy As`).
2. **Visual Filter & Sort Toolbar**: Thanh lọc và sắp xếp trực quan trên đầu DataGrid.
3. **Tabbed Table Designer**: Trình thiết kế bảng 4 tab (Fields, Indexes, Foreign Keys, SQL Preview).
4. **Query Results Tab Pinning & Layout Toggle**: Ghim tab kết quả truy vấn `[📌 Pin]` và đổi bố cục Bottom/Right split.
5. **Connection Colorings & Find in Database**: Gán màu nhận diện kết nối (Prod/Dev) + Hộp thoại tìm kiếm chuỗi trong CSDL.

---

## 2. Technical Context

- **Language/Version**: TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`), Node ≥ 20, ESM
- **Primary Dependencies**: React 18.3, Zustand 5.0, TanStack Query 5.66, Vitest 3.2, Playwright
- **Target Platform**: Web SPA + Electron Desktop App (Windows)
- **Monorepo Packages Touched**:
  - `packages/contract`: Mở rộng `ConnectionProfile` (thêm trường `color`), cập nhật params cho `data.browse`.
  - `packages/storage`: Lưu trường `color` vào bảng `connections` trong `workspace.db`.
  - `packages/engine`: Xử lý lưu `color` trong connection handlers.
  - `packages/ui`: Triển khai các components, views, dialogs, và i18n dictionaries.
- **Constraints**:
  - `packages/ui` không import `node:*`, `electron`, hay driver database (Rule 1).
  - Không rẽ nhánh theo `driverId`, chỉ rẽ nhánh theo `CapabilitySet` (Rule 2).
  - Mọi thao tác ghi/sửa DDL phải qua Preview Token (Rule 5 & ADR-0010).
  - Không hardcode màu hex, dùng token CSS; không hardcode chuỗi, dùng đa ngôn ngữ `t(...)` (VI, EN, JA).

---

## 3. Constitution & Quality Gates Check

| # | Luật | Trạng thái | Giải pháp kiến trúc |
|---|---|---|---|
| Rule 1 | UI không import `node:*`, `electron`, driver | ✅ Pass | 100% tương tác qua RPC Client `useClient()`. |
| Rule 2 | Không rẽ nhánh theo `driverId` | ✅ Pass | Kiểm tra `capabilities` của connection active. |
| Rule 3 | Không `isElectron` trong component | ✅ Pass | Sử dụng `Transport` và abstractions có sẵn. |
| Rule 4 | Không ghép chuỗi SQL thô | ✅ Pass | Dùng `quoteIdentifier` và DDL generator từ `@corvus/sql`. |
| Rule 5 | Ghi DB phải qua Preview Token | ✅ Pass | `DesignView` bắt buộc qua `ddl.previewTable` $\rightarrow$ `ddl.applyTable`. |
| Rule 6 | Không đưa secret vào log / UI | ✅ Pass | Màu sắc và kết nối được lưu an toàn không chứa password plaintext. |
| Rule 10 | `pnpm verify` phải xanh 100% | ✅ Pass | Mỗi gói đều có DOM test và E2E test tương ứng. |

---

## 4. Phase Breakdown & Package Impact

### Phase 1: Gói 1 — DataGrid Bottom Navigation Bar & Cell Quick Actions (P1)
- Tạo component `packages/ui/src/components/grid/DataGridBottomBar.tsx`:
  - Nút `+` (Insert/Add row), `-` (Delete row), `✓` (Apply/Save row), `✗` (Discard changes), `↻` (Refresh).
  - Cụm lật trang `[⏮] [◀] [Trang X/Y] [▶] [⏭]` và nhãn `Record A of B in page C`.
  - Dropdown chọn số dòng/trang: `100`, `200`, `500`, `1000`, `All`.
- Bổ sung lệnh trên Cell Context Menu (`packages/ui/src/commands/defs/grid.ts`):
  - `grid.setNull`: Đặt ô thành NULL.
  - `grid.setEmptyString`: Đặt ô thành `""`.
  - `grid.copyAsInsert`: Sao chép dòng thành câu lệnh `INSERT INTO ...`.
  - `grid.copyAsUpdate`: Sao chép dòng thành câu lệnh `UPDATE ... SET ...`.
  - `grid.copyAsTsv`: Sao chép định dạng Tab-Separated.
  - `grid.filterByValue`: Thêm điều kiện lọc theo giá trị ô.
- Đấu nối vào `packages/ui/src/views/DataView.tsx` và `packages/ui/src/components/grid/DataGrid.tsx`.

### Phase 2: Gói 2 — Visual Filter & Sort Toolbar (P1)
- Nâng cấp `packages/ui/src/components/FilterPanel.tsx`:
  - Chọn cột từ danh sách metadata cột của bảng đang mở.
  - Chọn toán tử: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_null`, `is_not_null`, `between`.
  - Hỗ trợ thêm nhiều dòng điều kiện kết hợp `AND` / `OR`.
  - Tab Sort: Thêm nhiều cột sắp xếp với thứ tự `ASC` / `DESC`.
- Kết nối `FilterPanel` với query params của `data.browse` trong `DataView.tsx`.

### Phase 3: Gói 3 — Tabbed Table Designer (P1)
- Nâng cấp `packages/ui/src/views/DesignView.tsx`:
  - Chia 4 tabs:
    1. **Fields**: Bảng danh sách cột (Tên, Kiểu, Độ dài, Thập phân, Allow Null, PK, Auto Inc, Default, Comment) + Nút thêm/xoá/di chuyển dòng.
    2. **Indexes**: Tên index, danh sách cột, loại (`NORMAL`, `UNIQUE`, `FULLTEXT`), thuật toán (`BTREE`, `HASH`).
    3. **Foreign Keys**: Tên khoá ngoại, cột con, bảng cha, cột cha, `On Delete`, `On Update`.
    4. **SQL Preview**: Xem trước DDL sinh ra.
  - Tích hợp nút `Save` $\rightarrow$ gọi `ddl.previewTable` lấy Preview Token $\rightarrow$ hiển thị modal xác nhận và chạy qua `ddl.applyTable`.

### Phase 4: Gói 4 — Query Results Tab Pinning & View Split Layout (P2)
- Nâng cấp `packages/ui/src/views/SqlView.tsx`:
  - Quản lý mảng tab kết quả truy vấn `tabs: QueryResultTab[]`.
  - Thêm nút `[📌 Pin]` trên thanh tab kết quả.
  - Khi tab đang active được ghim, lần thực thi query tiếp theo tự động mở tab `Result N+1`.
  - Nút chuyển đổi Layout `[Bottom Split]` $\leftrightarrow$ `[Right Split]` với Splitter điều chỉnh tỷ lệ mượt mà.

### Phase 5: Gói 5 — Connection Colorings & Find in Database (P2)
- Mở rộng `@corvus/contract`, `@corvus/storage`, `@corvus/engine`:
  - Thêm trường `color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'` vào `ConnectionProfile`.
  - Hỗ trợ chọn màu trong `ConnectionDialog.tsx` và context menu của kết nối trên cây `NavPane.tsx`.
  - Hiển thị chấm màu nhận diện trên `NavPane.tsx` và viền màu trên `TabStrip.tsx`.
- Tạo hộp thoại `packages/ui/src/components/dialogs/FindInDatabaseDialog.tsx`:
  - Tìm kiếm chuỗi văn bản trên các bảng được chọn trong CSDL.
  - Mở DataGrid trỏ thẳng tới bản ghi khớp.

### Phase 6: Testing & Quality Verification (P1/P2)
- Viết các bài kiểm thử DOM unit test (Vitest + jsdom):
  - `packages/ui/src/__tests__/datagrid-bottom-bar.dom.test.tsx`
  - `packages/ui/src/__tests__/filter-sort-panel.dom.test.tsx`
  - `packages/ui/src/__tests__/table-designer-tabs.dom.test.tsx`
  - `packages/ui/src/__tests__/query-pin-layout.dom.test.tsx`
  - `packages/ui/src/__tests__/connection-colorings.dom.test.tsx`
  - `packages/ui/src/__tests__/find-in-database.dom.test.tsx`
- Chạy `pnpm verify` đảm bảo 100% lint, typecheck, unit tests, contracts, và ratchets passed.

---

## 5. Next Steps

Sau khi kế hoạch kỹ thuật này được duyệt, chúng ta sẽ chạy lệnh `/speckit-tasks` để bóc tách thành danh sách các task chi tiết (`tasks.md`) sẵn sàng cho việc triển khai bằng TDD.
