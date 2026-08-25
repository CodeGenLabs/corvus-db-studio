# Phase 0 — Research & Technical Decisions: 004-navicat-ui-ergonomics

**Date**: 2026-08-25 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

---

## R1 — Tích hợp Bottom Navigation Bar & Phân trang trong DataGrid

**Vấn đề**: Người dùng Navicat quen thuộc với thanh điều hướng đáy dạng bảng tính (`Use Navigation Bar`: `+`, `-`, `✓`, `✗`, `↻`, `[⏮ ◀ 1/6 ▶ ⏭]`, `Record A of B in page C`, `Limit record setting`). Trong Corvus DB Studio, `DataGrid.tsx` hiện chỉ cuộn vô tận hoặc phân trang ảo mà thiếu thanh điều hướng vật lý ở chân bảng.

**Decision**:
- Xây dựng component `packages/ui/src/components/grid/DataGridBottomBar.tsx` gắn cố định ở chân `DataView.tsx` và `DataGrid.tsx`.
- Quản lý trạng thái dòng đang chọn (`selectedRowIndex`), trạng thái dirty (`hasPendingChanges`), phân trang (`currentPage`, `totalPages`, `pageSize`, `totalRecords`).
- Đấu nối phím tắt toàn cục cho bảng: `Insert` / `Ctrl+N` (thêm dòng), `Ctrl+Delete` (xoá dòng), `Ctrl+S` (áp dụng thay đổi), `Escape` (huỷ thay đổi), `F5` (làm mới).

**Alternatives considered**:
- *Chỉ giữ phím tắt, không thêm thanh công cụ đáy*: Bị loại vì người dùng không nhìn thấy trực quan số trang/dòng và các nút bấm quen thuộc của Navicat.
- *Thêm nút vào thanh công cụ trên cùng*: Bị loại vì Navicat đặt cụm điều hướng dữ liệu theo dòng ở đáy bảng để gần tầm nhìn của dòng đang duyệt.

---

## R2 — Cơ chế Visual Filter & Sort Panel

**Vấn đề**: Người dùng muốn lọc nhanh một tập bản ghi theo giá trị cột (`WHERE status = 1 AND age > 25`) mà không cần chuyển sang SQL Editor viết câu lệnh `SELECT`.

**Decision**:
- Tận dụng và nâng cấp `packages/ui/src/components/FilterPanel.tsx`.
- Hỗ trợ danh sách điều kiện lọc:
  - Trường: Danh sách các cột của bảng hiện tại.
  - Toán tử: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `does not contain`, `starts with`, `ends with`, `is null`, `is not null`, `between`.
  - Giá trị: Input text / number / date.
  - Liên kết logic: `AND` / `OR`.
- Khi nhấp phải vào một ô dữ liệu trong DataGrid $\rightarrow$ `Filter -> Field Value`, tự động bổ sung điều kiện `column = cellValue` vào FilterPanel và kích hoạt lọc dữ liệu.
- Chuyển đổi bộ lọc thành RPC parameter cho `data.browse` (`filter: { rules: [...] }`).

---

## R3 — Kiến trúc Tabbed Table Designer (Fields, Indexes, Foreign Keys, SQL Preview)

**Vấn đề**: Trình thiết kế bảng của Navicat chia thành 4 tab rất rõ ràng: Fields, Indexes, Foreign Keys, SQL Preview. `DesignView.tsx` hiện tại cần được cấu trúc lại theo chuẩn tab này để dễ thao tác và cho phép xem trước DDL trước khi lưu.

**Decision**:
- Chia `packages/ui/src/views/DesignView.tsx` thành 4 tab con:
  1. `TabFields`: Quản lý danh sách cột, kiểu dữ liệu theo dialect của engine, PK, Auto Increment, Not Null, Default, Comment.
  2. `TabIndexes`: Quản lý chỉ mục, các cột thành phần, kiểu Unique / Normal / Fulltext, thuật toán BTREE / HASH.
  3. `TabForeignKeys`: Quản lý ràng buộc khoá ngoại, bảng cha, cột cha, On Delete, On Update.
  4. `TabSqlPreview`: Hiển thị câu lệnh `CREATE TABLE` hoặc `ALTER TABLE` sinh tự động.
- Khi người dùng nhấn `Save`, hệ thống gọi `ddl.previewTable` để lấy Preview Token, hiển thị modal xác nhận và thực thi qua `ddl.applyTable` (tuân thủ Rule 5 & ADR-0010).

---

## R4 — Ghim tab kết quả truy vấn & Tuỳ biến bố cục Split (Bottom/Right)

**Vấn đề**: Khi viết nhiều câu lệnh SQL trong `SqlView`, mỗi lần bấm Run thì tab kết quả cũ bị ghi đè, khiến người dùng không so sánh được kết quả giữa 2 câu query.

**Decision**:
- Cập nhật state kết quả trong `SqlView.tsx` thành mảng `tabs: Array<{ id: string; name: string; isPinned: boolean; data: any; executionTime: number }>`.
- Trên mỗi tab kết quả, thêm nút `[📌 Pin]` (hoặc context menu `Pin Tab`).
- Khi tab đang active có `isPinned === true`, lần chạy query tiếp theo sẽ tự động tạo tab mới `Result 2`, `Result 3`.
- Bổ sung nút chuyển đổi Layout `[Bottom Split]` $\leftrightarrow$ `[Right Split]` với thanh kéo Splitter (`react-resizable` / flex splitter) để người dùng có thể xem kết quả bên phải trình soạn thảo khi dùng màn hình rộng.

---

## R5 — Nhận diện màu sắc kết nối (Connection Colorings) & Tìm kiếm CSDL

**Vấn đề**: Khi kết nối nhiều server (Production, Staging, Dev), người dùng rất dễ nhầm lẫn gây nguy cơ sửa nhầm dữ liệu production.

**Decision**:
- Mở rộng schema `ConnectionProfile` trong `@corvus/contract`: thêm trường `color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'`.
- Lưu trữ trường `color` vào bảng `connections` trong `workspace.db`.
- Hiển thị chấm màu / viền màu tại node kết nối trên cây điều hướng `NavPane.tsx` và dải viền trên đỉnh của các tab làm việc thuộc kết nối đó trong `TabStrip.tsx`.
- Thêm hộp thoại `FindInDatabaseDialog.tsx` (`Ctrl+Shift+F`) quét tìm kiếm chuỗi văn bản trên các bảng được chọn trong database và mở DataGrid trỏ tới dòng khớp.
