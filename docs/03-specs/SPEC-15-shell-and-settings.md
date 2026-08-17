# SPEC-15: Shell, Settings, Workspace

- **Trạng thái**: Ready
- **Wave**: W-0 (khung) / W-2 (đầy đủ) / W-6 (phím tắt tuỳ biến)
- **Tier**: T0
- **Phụ thuộc**: ADR-0007, ADR-0009, [workspace-storage.md](../02-architecture/workspace-storage.md)
- **Task**: T-005, T-010 … T-019, T-470 … T-486

## 1. Mục tiêu

Bộ khung chứa mọi thứ khác: title bar, menu bar, toolbar, tab, pane, status bar, command
palette, dialog Settings, quản lý workspace. Phần lớn **đã tồn tại** trong UI shell hiện tại;
việc còn lại là nối vào dữ liệu thật và bổ sung tính năng thiếu.

## 2. Phạm vi

**Trong**: shell layout, tab management, command palette, Settings (7 mục), i18n, theme, phím
tắt, favorites, virtual group, export/import workspace, kiểm tra cập nhật, About, tray mode
(desktop), đăng nhập (web).
**Ngoài**: nội dung từng view → SPEC riêng.

## 3. Yêu cầu chức năng

### 3.1 Shell

| ID | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| FR-15.01 | Title bar tự vẽ với nút thu nhỏ/phóng to/đóng (desktop) hoặc ẩn (web) | MUST | đã có |
| FR-15.02 | Menu bar 6 menu với phím tắt và dấu tick trạng thái | MUST | đã có |
| FR-15.03 | Toolbar với 11 nhóm chức năng, trạng thái active theo view | MUST | đã có |
| FR-15.04 | Tab bar: mở nhiều tab, đóng tab, `Ctrl+Tab` chuyển, kéo đổi thứ tự | MUST | **cần bổ sung**: tab hiện là view tĩnh, phải thành tab thật có state riêng |
| FR-15.05 | Tab MUST giữ state riêng (query đang gõ, vị trí cuộn grid, filter) | MUST | mới |
| FR-15.06 | Tab có thay đổi chưa lưu MUST hiện dấu ● và hỏi khi đóng | MUST | mới |
| FR-15.07 | Nav pane và Info pane: ẩn/hiện, kéo đổi rộng, maximize/restore | MUST | đã có (thiếu maximize) |
| FR-15.08 | Status bar: trạng thái, connection, latency, nút toggle pane | MUST | đã có |
| FR-15.09 | Command palette (`Ctrl+K`): tìm bảng, query đã lưu, lệnh, cài đặt — fuzzy search | MUST | đã có khung, cần nội dung thật |
| FR-15.10 | Focus mode: ẩn mọi thứ trừ view đang làm việc, `Esc` để ra | SHOULD | mới |
| FR-15.11 | Khi mất kết nối tới engine (web), MUST hiện banner và tự nối lại | MUST | mới |

### 3.2 Settings

Bảy mục, ánh xạ từ Navicat Ch.22:

| Mục | Nội dung | Trạng thái |
|---|---|---|
| **General** | ngôn ngữ, view khi khởi động, xác nhận trước khi xoá, timeout query, kiểm tra cập nhật, chia sẻ dữ liệu sử dụng | đã có 4/6 |
| **Appearance** | theme, mật độ dòng, cỡ chữ code | đã có |
| **Editor** | font mono (5 lựa chọn), số dòng, folding, brace, word wrap, tab width, uppercase keyword, keymap, màu syntax | đã có 4/9 |
| **Data grid** | auto commit, số dòng/trang, hiển thị NULL, font grid, định dạng date/time | đã có 3/5 |
| **Connections** | SSL mặc định, tự cập nhật, timeout, keepalive, đường dẫn công cụ ngoài (`mysqldump`, `pg_dump`) | đã có 2/5 |
| **AI assistant** | bật/tắt, provider, khoá, model, quyền đọc schema | đã có 2/5 |
| **Shortcuts** | bảng phím tắt, gán lại, phát hiện xung đột, đặt lại mặc định | mới (W6) |

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-15.12 | Mọi setting MUST áp dụng ngay, không cần khởi động lại (trừ những cái ghi rõ) | MUST |
| FR-15.13 | Setting MUST lưu vào `workspace.db` bảng `setting`, theo `owner_id` | MUST |
| FR-15.14 | Setting MUST có giá trị mặc định tường minh trong một chỗ duy nhất (`DEFAULT_CONFIG`) | MUST |
| FR-15.15 | Nút "Đặt lại về mặc định" cho từng mục | SHOULD |
| FR-15.16 | Phím tắt gán lại MUST phát hiện xung đột và cảnh báo | SHOULD |

### 3.3 i18n

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-15.17 | 3 ngôn ngữ: vi, en, ja — đủ 100% khoá | MUST |
| FR-15.18 | Đổi ngôn ngữ áp dụng ngay, không reload | MUST |
| FR-15.19 | Khoá thiếu MUST fallback về en và **log cảnh báo ở dev**, không hiện khoá thô cho người dùng | MUST |
| FR-15.20 | CI MUST fail nếu có khoá thiếu ở bất kỳ ngôn ngữ nào | MUST |
| FR-15.21 | Số, ngày, dung lượng file MUST format theo locale | SHOULD |

> Hiện tại i18n dùng object phẳng + hàm `tr(vi, en)` cho chuỗi inline. Cần hợp nhất: **mọi**
> chuỗi vào dictionary có khoá; bỏ `tr()`. Task `T-472`.

### 3.4 Workspace

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-15.22 | Favorites: thêm object vào danh sách, mở bằng `Ctrl+1..9` | SHOULD |
| FR-15.23 | Virtual group: nhóm connection/query/backup nhiều cấp, kéo thả | SHOULD |
| FR-15.24 | Export workspace ra `.corvusws`; import lại | MUST |
| FR-15.25 | Export có tuỳ chọn kèm secret (yêu cầu passphrase) | MUST |
| FR-15.26 | Share via URI: sinh URI cho object, mở URI | SHOULD |
| FR-15.27 | Migration workspace tự động khi nâng cấp, có backup trước | MUST |

### 3.5 Cập nhật & About

| ID | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| FR-15.28 | Desktop: kiểm tra cập nhật, tải nền, nhắc khởi động lại | MUST | UI đã có |
| FR-15.29 | KHÔNG tự cài khi có job đang chạy | MUST | mới |
| FR-15.30 | Web: phát hiện server đã nâng cấp → banner "tải lại trang" | MUST | mới |
| FR-15.31 | About: phiên bản, build, giấy phép, driver bundle | MUST | đã có |

### 3.6 Riêng từng target

| ID | Yêu cầu | Target |
|---|---|---|
| FR-15.32 | Đăng nhập (local / OIDC), đăng xuất, quản lý user Corvus | web |
| FR-15.33 | Tray mode: đóng cửa sổ → thu vào tray, job tiếp tục | desktop |
| FR-15.34 | Cảnh báo khi thoát mà còn job đang chạy hoặc transaction mở | cả hai |
| FR-15.35 | Deep link `corvus://` mở object | desktop |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `CorvusApp` | `packages/ui/src/CorvusApp.tsx` | mới — nhận `transport` qua prop |
| `Shell` | `…/shell/Shell.tsx` | tách từ `App.tsx` hiện tại |
| `TitleBar`, `MenuBar`, `Toolbar`, `TabStrip`, `StatusBar` | `…/shell/` | **đã có** — di chuyển |
| `TabManager` + `useTabStore` | `…/shell/tabs/` | mới — tab thật có state |
| `CommandPalette` | `…/dialogs/CommandPalette.tsx` | **đã có** — thêm fuzzy search + nguồn thật |
| `SettingsDialog` + 7 section | `…/dialogs/settings/` | **đã có 6 section** — hoàn thiện + thêm Shortcuts |
| `ShortcutEditor` | `…/dialogs/settings/ShortcutEditor.tsx` | mới |
| `LoginView` | `…/auth/LoginView.tsx` | mới (web) |
| `ConnectionLostBanner` | `…/shell/ConnectionLostBanner.tsx` | mới |
| `useShellStore` | `…/store/shell.ts` | mới — thay `StudioProvider` |

## 5. Hợp đồng RPC

```ts
export const settingsGet = defineUnary({
  name: 'workspace.settings.get',
  params: z.object({ keys: z.array(z.string()).optional() }),
  result: z.record(z.unknown()),
  permission: 'workspace:read',
  audit: 'none',
})

export const settingsSet = defineUnary({
  name: 'workspace.settings.set',
  params: z.object({ values: z.record(z.unknown()) }),
  result: z.object({ ok: z.literal(true) }),
  permission: 'workspace:write',
  audit: 'none',
})

export const paletteSearch = defineUnary({
  name: 'workspace.paletteSearch',
  params: z.object({ query: z.string().max(200), limit: z.number().int().max(50).default(20) }),
  result: z.array(z.object({
    kind: z.enum(['table', 'view', 'query', 'command', 'setting', 'connection', 'favorite']),
    label: z.string(), sublabel: z.string().optional(),
    score: z.number(), action: z.record(z.unknown()),
  })),
  permission: 'workspace:read',
  audit: 'none',
})
```

Còn lại: `workspace.export`, `.import`, `workspace.favorites.*`, `.groups.*`,
`auth.login`, `.logout`, `.me` (web), `app.version`, `app.checkUpdate`.

## 6. Logic — tab thật

Đây là thay đổi kiến trúc UI lớn nhất của SPEC này. Hiện tại `view` là một chuỗi duy nhất
trong state; tab bar chỉ đổi giá trị đó. Cần:

```ts
interface Tab {
  id: string
  kind: 'objects' | 'data' | 'sql' | 'design' | 'er' | 'compare' | 'backup' | 'jobs' | 'monitor' | …
  title: string
  connectionId?: string
  target?: ObjectRef
  dirty: boolean
  /** State riêng của tab, kiểu tuỳ theo kind. */
  state: unknown
}

interface TabStore {
  tabs: Tab[]
  activeId: string
  open(spec: TabSpec): void          // nếu đã có tab tương đương thì focus, không mở trùng
  close(id: string): Promise<boolean> // false nếu người dùng huỷ vì dirty
  reorder(from: number, to: number): void
  updateState(id: string, patch: unknown): void
}
```

Component view nhận `tabId` và đọc/ghi state của chính mình qua `useTabState(tabId)`.
Nhờ đó mở 3 tab SQL Editor cùng lúc, mỗi tab giữ query riêng.

Khôi phục sau khởi động: setting `onStartup` = `objects-only` / `restore-tabs` /
`specific-tabs` (FR ánh xạ Navicat Ch.22 Tabs).

## 7. Khác biệt theo target

| | Web | Desktop |
|---|---|---|
| Title bar | Ẩn (không có nút cửa sổ) | Hiện đủ, `titleBarStyle: hidden` |
| Đăng nhập | Có | Không |
| Kiểm tra cập nhật | Banner khi server đổi version | `electron-updater` |
| Thoát app | Đóng tab trình duyệt (`beforeunload` cảnh báo) | Tray hoặc thoát hẳn |
| Deep link | URL thường | `corvus://` protocol handler |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Mất kết nối tới engine (web) | Banner cố định + tự nối lại backoff; tab vẫn xem được dữ liệu đã tải |
| Contract version không khớp | `426` → màn hình "Phiên bản đã cập nhật, hãy tải lại trang" |
| Workspace migration thất bại | Từ chối khởi động, nêu đường dẫn file backup vừa tạo |
| Setting có giá trị không hợp lệ (file bị sửa tay) | Dùng mặc định, log cảnh báo, không sập |
| Session hết hạn (web) | Chuyển về LoginView, giữ URL để quay lại sau khi đăng nhập |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Khởi động desktop tới lúc dùng được | ≤ 2.5 s (NFR-04) |
| Bundle SPA initial (gzip) | ≤ 900 KB (NFR-05) |
| Chuyển tab | ≤ 50 ms |
| Command palette hiện kết quả | ≤ 80 ms |
| Đổi theme | ≤ 1 frame (chỉ đổi biến CSS) |
| Đổi ngôn ngữ | ≤ 100 ms |

Lazy load bắt buộc: `ModelView`, `BiView`, `PipelineBuilder`, `SchemaAnalysisView`,
`ExplainTree` — `React.lazy` + Suspense.

## 10. Bảo mật

- Web: cookie `HttpOnly; Secure; SameSite=Strict`, CSRF token, session xoay 8 giờ.
- Desktop: `contextIsolation` + `sandbox`; preload phơi đúng một API.
- CSP nghiêm; **font đóng gói cùng bundle**, không nạp từ Google Fonts (sửa `index.html` hiện
  tại — task `T-011`).
- Export workspace kèm secret cần passphrase; PBKDF2 600k vòng.
- Deep link `corvus://` phải validate kỹ — không được dùng để chèn connection string tự động
  mà không xác nhận.

## 11. i18n

Toàn bộ khoá của mọi module. Hiện có ~200 khoá; ước tính v1.0 cần ~900 khoá.
Cấu trúc mới: file JSON theo namespace (`shell.json`, `grid.json`, `sql.json`, `error.json`…),
`vi/en/ja` mỗi ngôn ngữ một thư mục. CI kiểm khoá đủ (FR-15.20).

## 12. Tiêu chí chấp nhận

```
[ ] FR-15.01–35 đều có test
[ ] Tab thật: mở 3 tab SQL, mỗi tab giữ query riêng, đóng tab dirty thì hỏi
[ ] Khôi phục tab sau khởi động lại (cả 3 chế độ onStartup)
[ ] 7 mục Settings đầy đủ; mọi setting áp dụng ngay
[ ] CI fail khi thiếu khoá i18n (test có chủ đích xoá 1 khoá)
[ ] Bundle initial ≤ 900 KB gzip (kiểm trong CI)
[ ] Khởi động desktop ≤ 2.5 s (đo trong CI trên runner Windows)
[ ] Không còn request tới font/CDN bên ngoài (test CSP + kiểm network trong Playwright)
[ ] Mất kết nối engine → banner, tự nối lại, không mất dữ liệu đã tải
[ ] Export → import workspace: mọi thứ khôi phục đúng, có và không có secret
[ ] Migration workspace từ version trước chạy được với file thật
[ ] Desktop: tray mode giữ job chạy; thoát khi có job → hỏi
[ ] Web: đăng nhập/đăng xuất, session hết hạn xử lý đúng
[ ] i18n vi/en/ja đủ 100%
```
