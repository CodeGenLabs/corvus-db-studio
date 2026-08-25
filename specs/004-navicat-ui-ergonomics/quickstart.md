# Quickstart: 004-navicat-ui-ergonomics

**Date**: 2026-08-25 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

---

## 1. Xác minh môi trường & Kiểm thử

### 1.1 Khởi động database stack (Docker)
```bash
pnpm db:up
pnpm db:doctor
```

### 1.2 Chạy bộ kiểm thử tự động
```bash
# Kiểm tra toàn bộ lint, typecheck, unit tests, contracts, ratchets
pnpm verify

# Chạy riêng bộ kiểm thử DOM cho UI ergonomics
pnpm test:dom
```

---

## 2. Các bước xác minh trực quan 5 gói UI/UX

1. **Gói 1: DataGrid Bottom Navigation Bar & Cell Quick Actions**:
   - Mở bất kỳ bảng nào (ví dụ `customer`).
   - Kiểm tra chân bảng có cụm nút điều hướng: `[+]`, `[-]`, `[✓]`, `[✗]`, `[↻]`, `[⏮ ◀ 1/6 ▶ ⏭]`, nhãn `Record 1 of 599 in page 1`, dropdown `Limit: 100/500/1000/All`.
   - Nhấp phải vào ô dữ liệu $\rightarrow$ Kiểm tra có `Set to NULL`, `Set to Empty String`, `Copy As` $\rightarrow$ `Insert Statement` / `Update Statement` / `TSV`.

2. **Gói 2: Visual Filter & Sort Toolbar**:
   - Bấm nút `Filter & Sort` trên Object Toolbar.
   - Thêm điều kiện lọc (ví dụ `active = 1`), bấm `Apply Filter & Sort`.
   - Kiểm tra lưới lọc đúng các dòng thoả mãn.
   - Nhấp phải vào ô bất kỳ $\rightarrow$ chọn `Filter -> Field Value` $\rightarrow$ kiểm tra tự động lọc theo giá trị đó.

3. **Gói 3: Tabbed Table Designer**:
   - Mở thiết kế bảng (Table Designer).
   - Kiểm tra 4 tab: `Fields`, `Indexes`, `Foreign Keys`, `SQL Preview`.
   - Thêm/sửa cột, index, FK $\rightarrow$ bấm tab `SQL Preview` $\rightarrow$ xem câu lệnh DDL sinh ra.
   - Bấm `Save` $\rightarrow$ xác nhận qua Preview Token modal $\rightarrow$ DDL được áp dụng thành công.

4. **Gói 4: Query Results Tab Pinning & Layout Toggle**:
   - Mở tab SQL Editor (`SqlView`), chạy câu lệnh `SELECT * FROM sakila.customer LIMIT 10;`.
   - Bấm nút `[📌 Pin]` trên tab `Result 1`.
   - Chạy câu lệnh khác `SELECT * FROM sakila.film LIMIT 5;` $\rightarrow$ kiểm tra hệ thống mở thêm tab `Result 2` mà không làm mất `Result 1`.
   - Bấm nút Layout Toggle $\rightarrow$ kiểm tra chuyển đổi mượt mà giữa `Bottom Split` và `Right Split`.

5. **Gói 5: Connection Colorings & Find in Database**:
   - Nhấp phải vào kết nối $\rightarrow$ chọn `Color` $\rightarrow$ chọn màu Đỏ (Production).
   - Kiểm tra chấm/viền màu hiển thị trên cây điều hướng và dải viền trên đỉnh của các tab mở từ kết nối đó.
   - Nhấn `Ctrl+Shift+F` mở `Find in Database` $\rightarrow$ tìm từ khoá `'MARY'` $\rightarrow$ kết quả hiển thị danh sách dòng khớp, nhấp đúp để mở DataGrid trỏ tới dòng đó.
