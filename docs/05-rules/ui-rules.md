# UI Rules & Design System

Design đã tồn tại và đã được chấp thuận. Tài liệu này ghi lại nó thành luật để không bị trôi.

---

## 1. Token — nguồn sự thật duy nhất là biến CSS

**Cấm hard-code màu.** Mọi màu qua biến CSS trong `packages/ui/src/theme/theme.css`.

### Bảng token

| Nhóm | Biến | Dùng cho |
|---|---|---|
| Nền | `--bg` | nền ngoài cùng của shell |
| | `--pane` | nền vùng nội dung chính |
| | `--pane2` | nền vùng phụ (header, sidebar, toolbar) |
| | `--titlebar` | title bar và status bar |
| | `--row-alt` | dòng xen kẽ trong grid |
| Viền | `--border` | viền thường |
| | `--border-strong` | viền nhấn (input, card, dialog) |
| | `--grid-line` | đường lưới trong grid, đường phân cách nhẹ |
| Chữ | `--text` | chữ chính |
| | `--text2` | chữ phụ |
| | `--text3` | chữ mờ, placeholder, metadata |
| Nhấn | `--accent` | màu thương hiệu, trạng thái active |
| | `--accent-hi` | hover của accent |
| | `--accent-soft` | nền nhạt của accent (tab active, pill) |
| | `--sel` | nền dòng đang chọn |
| | `--on-accent` | chữ trên nền accent |
| Ngữ nghĩa | `--green` | thành công, kết nối, thêm mới |
| | `--amber` | cảnh báo, khoá chính, giá trị đã đổi |
| | `--red` | lỗi, xoá, nguy hiểm |
| | `--coral` | chuỗi ký tự, nhấn thứ cấp |
| Khác | `--shadow` | shadow của dialog và popover |
| | `--mono` | font mono (đổi theo setting) |

### Quy tắc

| # | Luật |
|---|---|
| 1.1 | Không dùng mã hex trong component. Ngoại lệ: `#fff` cho knob của toggle (nó phải trắng ở cả 2 theme) và `#c42b1c` cho nút Close (màu chuẩn Windows) — cả hai đã có comment |
| 1.2 | Thêm token mới → thêm vào **cả** `:root` và `[data-theme="dark"]` |
| 1.3 | Màu ngữ nghĩa dùng đúng ý nghĩa: `--red` không dùng làm màu trang trí |
| 1.4 | Không dùng `opacity` để tạo màu mờ — dùng `--text3` |

---

## 2. Kích thước và mật độ

Đây là công cụ cho developer, mật độ **cao** là chủ ý.

| Thành phần | Chiều cao | Ghi chú |
|---|---:|---|
| Title bar | 34 px | |
| Menu bar | 26 px | |
| Toolbar | 62 px | icon + caption |
| Tab bar | 30 px | |
| Object toolbar | 32 px | |
| Status bar | 24 px | |
| Dòng grid / cây (compact) | 23 px | mặc định |
| Dòng grid / cây (comfortable) | 28 px | |
| Nút nhỏ | 20–22 px | |
| Nút thường | 26 px | |
| Input | 24–26 px | |
| Pane bên | 180–520 px | kéo được, mặc định nav 246 / info 304 |

| Cỡ chữ | Dùng cho |
|---:|---|
| 10 px | metadata trong grid (kiểu cột) |
| 10.5 px | label mờ, caption uppercase, hint |
| 11 px | chữ phụ, status bar |
| 11.5 px | chữ trong menu, dialog, form |
| 12 px | **cỡ nền tảng** — dữ liệu grid, nội dung chính |
| 12.5 px | code (đổi theo setting `fontSize`) |
| 13–14 px | tiêu đề trong panel |
| 17 px | tiêu đề dialog lớn |

**Không thêm cỡ chữ mới.** Nếu cần cỡ khác, hỏi trước.

---

## 3. Hover

Design mô tả hover cạnh inline style. Trong code, hover là **class tiện ích** trong
`theme.css`, dùng `!important` vì phải thắng inline style.

| Class | Hiệu ứng |
|---|---|
| `.hv-accent` | `color: var(--accent)` |
| `.hv-accent-border` | `color` + `border-color` → accent |
| `.hv-border-accent` | chỉ `border-color` → accent |
| `.hv-accent-soft` | `background: var(--accent-soft)` + `color: var(--accent)` |
| `.hv-accent-soft-bg` | chỉ background |
| `.hv-accent-bg` | `background: var(--accent)` |
| `.hv-row` | `background: var(--row-alt)` |
| `.hv-pane` / `.hv-pane2` | background pane / pane2 |
| `.hv-text` | `color: var(--text)` |
| `.hv-red` / `.hv-red-pane` | color đỏ (+ background pane) |
| `.hv-close` | nền `#c42b1c`, chữ trắng — chỉ cho nút Close |

**Không thêm class hover mới nếu đã có class phù hợp.** Cần hiệu ứng mới → thêm vào `theme.css`,
không viết inline `onMouseEnter`.

---

## 4. Năm trạng thái — bắt buộc cho mọi màn hình

| Trạng thái | Hiển thị thế nào |
|---|---|
| **empty** | Thông điệp giải thích **vì sao** rỗng + hành động tiếp theo. Không phải bảng trắng |
| **loading** | Skeleton giữ đúng hình dạng nội dung. **Không** spinner toàn màn hình. Loading > 1 s thì thêm số đếm tiến trình |
| **ready** | Nội dung |
| **error** | Banner trong ngữ cảnh (không phải toast biến mất). Thông điệp i18n + nút "Chi tiết" + nút thử lại nếu retryable |
| **unsupported** | Ẩn, hoặc vô hiệu hoá kèm tooltip giải thích engine không hỗ trợ. **Không bao giờ** để bấm rồi gặp lỗi server |

Dùng component chung: `<EmptyState>`, `<LoadingSkeleton>`, `<ErrorBanner>`, `<UnsupportedHint>`
(task `T-485`).

```tsx
// ✅ mẫu chuẩn
if (!caps.objects.materializedView) return <UnsupportedHint feature="materializedView" />
if (query.isLoading) return <LoadingSkeleton rows={12} />
if (query.isError)   return <ErrorBanner error={query.error} onRetry={query.refetch} />
if (!query.data?.length) return <EmptyState titleKey="objects.empty" actionKey="objects.createTable" onAction={…} />
return <ObjectsGrid data={query.data} />
```

---

## 5. i18n

| # | Luật |
|---|---|
| 5.1 | Mọi chuỗi hiển thị qua `t('namespace.key')`. Không hard-code, kể cả "OK", "×" là ký hiệu nên được phép |
| 5.2 | Đủ 3 ngôn ngữ: `vi`, `en`, `ja`. CI fail nếu thiếu |
| 5.3 | Không ghép chuỗi từ nhiều khoá. Dùng placeholder: `t('grid.showing', { from, to, total })` |
| 5.4 | Số nhiều dùng cơ chế plural của i18n, không `if (n > 1)` |
| 5.5 | Số, ngày, dung lượng format theo locale |
| 5.6 | **Layout phải chịu được tiếng Nhật** — chuỗi tiếng Nhật thường ngắn hơn nhưng chữ rộng gấp đôi |
| 5.7 | Không dùng chuỗi làm selector test — dùng `data-testid` |

**Kiểm layout tiếng Nhật là bắt buộc** trước khi đóng task chạm UI. Chữ Nhật rộng 2 ô latin;
nút vừa với tiếng Anh có thể vỡ với tiếng Nhật.

---

## 6. Font mono

5 lựa chọn, đổi qua `data-mono` trên root:

| Key | Font | Khi nào dùng |
|---|---|---|
| `plex` | IBM Plex Mono | mặc định, latin sắc nét |
| `mplus` | M PLUS 1 Code | khi có nhiều tiếng Nhật — chữ Nhật rộng đúng 2 ô latin |
| `noto` | Noto Sans Mono | phủ ký tự rộng |
| `jb` | JetBrains Mono | x-height cao, dễ đọc cỡ nhỏ |
| `system` | font hệ thống | theo máy |

Font phải **đóng gói trong bundle**, không nạp từ Google Fonts (task `T-011`, lý do: CSP +
hoạt động offline + không rò thông tin người dùng cho bên thứ ba).

`--mono` dùng cho: SQL, DDL, tên cột, giá trị numeric trong grid, đường dẫn file, timestamp,
mã lỗi, phím tắt.

---

## 7. Accessibility

| # | Luật |
|---|---|
| 7.1 | Mọi thao tác làm được bằng chuột phải làm được bằng bàn phím |
| 7.2 | Focus phải thấy được — không `outline: none` mà không có thay thế |
| 7.3 | Grid có `role="grid"`, `role="row"`, `role="gridcell"`, `aria-rowindex` |
| 7.4 | Dialog: focus trap, `Esc` đóng, focus trả về nơi cũ khi đóng |
| 7.5 | Icon-only button phải có `title` và `aria-label` |
| 7.6 | Không truyền tải thông tin **chỉ** bằng màu — kèm icon hoặc chữ |
| 7.7 | Tương phản: chữ chính ≥ 4.5:1, chữ lớn ≥ 3:1 (kiểm cả 2 theme) |

Luật 7.6 quan trọng trong Compare view: `+` / `−` / `~` là ký hiệu, màu chỉ là phụ trợ.

---

## 8. Component dùng chung — không nhân bản

Những component sau dùng ở nhiều nơi. **Tìm trước khi viết mới.**

| Component | Dùng ở |
|---|---|
| `DataGrid` | Data Editor · Query Results · Compare diff · Users dialog · Backup history · Mongo grid · Redis keys · Process list · Privilege matrix |
| `SqlPreviewDialog` | Data apply · DDL apply · GRANT apply · Model sync · Data sync apply · Restore |
| `WizardShell` | Import · Export · Transfer · DataSync · StructSync · DataGen · Restore · DataDict |
| `SqlEditor` | SQL view · View designer · Routine designer · Trigger body · Script editor · JSON/XML cell editor |
| `DiagramCanvas` | ER view · Model designer · Query Builder |
| `JobProgressPanel` | Import · Export · Backup · Restore · Transfer · Sync · DataGen · Batch job |
| `EmptyState` / `LoadingSkeleton` / `ErrorBanner` / `UnsupportedHint` | mọi màn hình |

Nếu component chung không đủ cho ca dùng của bạn: **mở rộng nó** (thêm prop), đừng fork.

---

## 9. Layout và cấu trúc shell

```
┌─ TitleBar 34 ────────────────────────────────────────────────┐
├─ MenuBar 26 ─────────────────────────────────────────────────┤
├─ Toolbar 62 ─────────────────────────────────────────────────┤
├──────────┬─┬──────────────────────────────────┬─┬────────────┤
│ NavPane  │▮│ TabStrip 30                      │▮│ InfoPane   │
│ 180-520  │ │ ObjectToolbar 32                 │ │ 180-520    │
│          │ │ [FilterPanel — có điều kiện]     │ │            │
│          │ │ ┌──────────────────────────────┐ │ │            │
│          │ │ │ View đang active             │ │ │            │
│          │ │ └──────────────────────────────┘ │ │            │
├──────────┴─┴──────────────────────────────────┴─┴────────────┤
└─ StatusBar 24 ───────────────────────────────────────────────┘
                ▮ = tay kéo 4 px
```

| # | Luật |
|---|---|
| 9.1 | Shell chiếm `100vw × 100vh`, `overflow: hidden` |
| 9.2 | Chỉ vùng nội dung view được cuộn. Body **không bao giờ** cuộn ngang |
| 9.3 | Bảng/diagram/code rộng cuộn trong container riêng có `overflow-x: auto` |
| 9.4 | Tối thiểu hỗ trợ 1366 × 768 mà không cắt nội dung |
| 9.5 | Pane bị ẩn có `width: 0` + `overflow: hidden`, không `display: none` (giữ state) |

---

## 10. Animation

Tối giản. Đây là công cụ làm việc, không phải trang giới thiệu.

| Được dùng | Thời lượng |
|---|---|
| `popIn` cho dialog và popover | 0.1–0.16 s |
| `transition` cho background/color khi hover | 0.12–0.15 s |
| `transform` caret của cây | 0.12 s |
| Thanh tiến trình | linear, theo dữ liệu thật |
| Knob của toggle | 0.15 s |

**Không**: animation vào/ra của view, parallax, spring, bounce, animation > 0.2 s.
Tôn trọng `prefers-reduced-motion: reduce` — tắt mọi transition.

---

## 11. Checklist trước khi đóng task chạm UI

```
[ ] Không có mã màu hard-code
[ ] Không có cỡ chữ mới ngoài bảng §2
[ ] Hover dùng class có sẵn
[ ] Đủ 5 trạng thái (empty/loading/ready/error/unsupported)
[ ] Mọi chuỗi qua t(), đủ vi/en/ja
[ ] Đã xem bằng mắt ở tiếng Nhật — layout không vỡ
[ ] Đã xem ở dark mode
[ ] Đã xem ở 1366×768
[ ] Điều hướng được bằng bàn phím; focus thấy được
[ ] Icon-only button có title + aria-label
[ ] Có data-testid cho phần tử tương tác
[ ] Đã dùng component chung thay vì viết bản thứ hai
[ ] Đã chạy trên CẢ web build và desktop build
[ ] Nếu là danh sách > 200 phần tử: đã ảo hoá
```

---

## 12. Sổ đăng ký lệnh & 11 Bề mặt Context Menu (Command Registry & Context Menus)

### 12.1 Sổ đăng ký lệnh tập trung (`CommandRegistry`)
- Toàn bộ hành động trên giao diện (Toolbar, Menubar, Context Menu, Phím tắt, Palette) phải được khai báo tập trung trong `packages/ui/src/commands/defs/`.
- Mỗi lệnh định nghĩa:
  - `id`: Định danh duy nhất (ví dụ: `object.designTable`, `sql.runSelection`).
  - `surfaces`: Danh sách các bề mặt hỗ trợ lệnh.
  - `targets`: Loại đối tượng áp dụng (`database`, `table`, `cell`, `empty`, v.v.).
  - `cardinality`: `'single'` hoặc `'multi'`.
  - `availability`: Điều kiện khả dụng (`needsConnection`, `requiredCapabilities`, `permission`, `supportedKinds`).
  - `write`: `'none'` | `'preview-required'`.
  - `rpc`: Danh sách các RPC method tương ứng trong `@corvus/contract`.

### 12.2 Luật Ẩn vs Vô hiệu hoá (FR-046B)
- **Ẩn hoàn toàn (Hidden)**:
  - Khi engine hiện tại không hỗ trợ tính năng (dựa trên `CapabilitySet` của server lúc kết nối).
  - Trên cây điều hướng: Ẩn các nhóm đối tượng không tồn tại trên engine đó.
- **Vô hiệu hoá kèm lý do (Disabled with Tooltip/Reason)**:
  - Khi ngữ cảnh hiện tại chưa thoả mãn (chưa chọn đối tượng, thiếu quyền ghi, sai loại đối tượng, chưa kết nối).
  - Lý do vô hiệu hoá phải hiển thị rõ ràng khi hover hoặc trong context menu để người dùng hiểu cách khắc phục.

### 12.3 11 Bề mặt Context Menu (S-01 → S-11)
Mọi bề mặt tương tác đều phải hỗ trợ mở menu chuột phải và phím tắt (`Menu` / `Shift+F10`):
1. `ctx-nav`: Cây điều hướng (connection, database, schema, group, object, field).
2. `ctx-object-list`: Danh sách đối tượng (single, multi, empty).
3. `ctx-data-grid`: Lưới dữ liệu (cell, row-header, column-header, empty).
4. `ctx-sql-editor`: Trình soạn thảo SQL (selection, empty).
5. `ctx-query-builder`: Trình dựng truy vấn trực quan (table, join, empty).
6. `ctx-er-diagram`: Sơ đồ quan hệ ER (table, relation, empty).
7. `ctx-tab-bar`: Thanh tab (tab).
8. `ctx-toolbar`: Thanh công cụ chính (customize, reset).
9. `ctx-snippet`: Thư viện đoạn mã (snippet, empty).
10. `ctx-job-list`: Danh sách tác vụ chạy nền (job, empty).
11. `ctx-diff`: Khung so sánh dữ liệu / cấu trúc (diff-item, empty).

---

## 13. Quy chuẩn trải nghiệm tiện ích (Navicat UI Ergonomics)

### 13.1 DataGrid Bottom Navigation Bar
- Gắn cố định ở chân lưới dữ liệu (`DataGridBottomBar.tsx`, cao 26px).
- Cụm nút thao tác dòng: `[+]` Thêm dòng (`Insert` / `Ctrl+N`), `[-]` Xoá dòng (`Ctrl+Delete`), `[✓]` Áp dụng lưu (`Ctrl+S`), `[✗]` Huỷ thay đổi (`Escape`), `[↻]` Làm mới (`F5`).
- Cụm lật trang: `[⏮]` (Trang đầu), `[◀]` (Trang trước), `[Ô nhập trang / Tổng trang]`, `[▶]` (Trang sau), `[⏭]` (Trang cuối).
- Nhãn đếm dòng: `Record A of B in page C`.
- Bộ chọn Limit: `100`, `200`, `500`, `1000`, `All`.

### 13.2 Visual Filter & Sort Toolbar
- Bảng lọc `FilterPanel.tsx` hỗ trợ chọn cột trực quan, toán tử đa dạng (`=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `starts_with`, `ends_with`, `is_null`, `is_not_null`, `between`), và kết hợp `AND` / `OR`.
- Hỗ trợ sắp xếp đa cột (Multi-Column Sorting `ASC`/`DESC`).
- Lọc nhanh từ menu chuột phải trên ô (`Filter -> Field Value`).

### 13.3 Tabbed Table Designer
- Chia 4 tab chuẩn: `Fields` (Cột), `Indexes` (Chỉ mục), `Foreign Keys` (Khoá ngoại), `SQL Preview` (Xem trước DDL).
- Quy trình lưu DDL bắt buộc qua Preview Token (`ddl.previewTable` $\rightarrow$ `ddl.applyTable`) để xem trước câu lệnh an toàn trước khi thực thi.

### 13.4 Query Results Pinning & View Split Layout
- Nút `[📌 Pin]` trên từng tab kết quả truy vấn trong `SqlView.tsx`. Khi tab đang active được ghim, câu lệnh tiếp theo tự động mở thêm tab `Result 2`, `Result 3`.
- Nút chuyển đổi bố cục `[Bottom Split]` $\leftrightarrow$ `[Right Split]` với thanh chia Splitter mượt mà.

### 13.5 Connection Colorings & Find in Database
- Phân biệt môi trường kết nối (Production = Đỏ, Staging = Vàng/Cam, Development = Xanh lá) bằng chấm màu nhận diện trên `NavPane.tsx` và dải viền trên `TabStrip.tsx`.
- Hộp thoại `FindInDatabaseDialog.tsx` (`Ctrl+Shift+F`) quét tìm kiếm chuỗi văn bản trên các bảng trong database (an toàn Read-only + LIMIT) và nhảy thẳng tới dòng kết quả.


