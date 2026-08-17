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
