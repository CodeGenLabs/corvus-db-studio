# ADR-0001: Electron thay vì Tauri cho bản desktop

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: ADR-0002, [packaging-release.md](../packaging-release.md)

## Bối cảnh

Cần một shell desktop cho Windows, dùng lại **nguyên vẹn** UI React đã có và chạy được driver
database. Ứng viên: Electron, Tauri v2, Wails, .NET MAUI + WebView2.

Ràng buộc quyết định:
- Toàn bộ driver database mà ta muốn dùng (`pg`, `mysql2`, `mssql`, `oracledb`, `mongodb`,
  `ioredis`, `ssh2`) là **thư viện Node**. Không có bộ tương đương đầy đủ và trưởng thành
  trong Rust cho cả 7 engine.
- Engine phải chạy **y hệt** ở web server (Node) và desktop. Nếu desktop dùng Rust thì phải
  duy trì **hai** hiện thực engine → phá vỡ tiền đề "một codebase".

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| **Electron** | Main process là Node → dùng lại 100% `@corvus/engine`. Hệ sinh thái chín (builder, updater, ký số). Playwright test được. | Cài đặt ~120 MB. RAM nền ~150 MB. Phải tự siết bảo mật renderer. |
| **Tauri v2** | Binary ~10 MB, RAM thấp, bảo mật mặc định tốt. | Backend là Rust → phải viết lại toàn bộ tầng driver + service bằng Rust, hoặc nhúng Node sidecar (mất hết ưu thế dung lượng). WebView2 khác Chromium bản đóng gói → rủi ro sai lệch render. |
| **Wails** | Backend Go, nhẹ. | Cùng vấn đề như Tauri: phải viết lại engine bằng Go. |
| **MAUI + WebView2** | Tích hợp Windows sâu. | Chỉ Windows; lại phải viết engine bằng .NET. |

## Quyết định

Dùng **Electron 33+**.

Yếu tố quyết định không phải kích thước binary mà là **tính duy nhất của engine**. Chọn Tauri
nghĩa là bảo trì hai hiện thực của driver layer, dialect, DDL generator, import/export — phần
khó và nhiều lỗi nhất của sản phẩm. Cái giá đó lớn hơn nhiều so với 120 MB installer.

## Hệ quả

### Tích cực
- `@corvus/engine` viết một lần, chạy ở cả 3 target.
- Cùng một runtime Chromium ở web dev và desktop → không có lớp lỗi "chỉ xảy ra trên desktop".
- Auto-update, ký số, crash report đều có sẵn công cụ chín.
- Test desktop bằng chính Playwright đang dùng cho web.

### Tiêu cực / cái giá
- Installer ~120 MB, RAM nền ~150 MB. Chấp nhận được với công cụ dành cho developer.
- Bề mặt tấn công lớn hơn → **bắt buộc** `contextIsolation` + `sandbox` + preload tối thiểu
  (xem [security.md](../security.md) TM-5).
- Phải theo kịp bản vá Chromium → chính sách: nâng Electron trong vòng 30 ngày kể từ khi có
  bản vá bảo mật.

### Việc phải làm kèm theo
- `T-006` Dựng `apps/desktop` với 3 tiến trình main/preload/renderer.
- `T-007` Cấu hình `@electron/rebuild` cho `better-sqlite3`.
- `T-008` Thiết lập ký số EV trong CI.
- Rà soát Electron security checklist mỗi quý.
