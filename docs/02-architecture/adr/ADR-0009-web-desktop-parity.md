# ADR-0009: Hoà giải khác biệt web ↔ desktop

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: [scope-decisions.md](../../01-scope/scope-decisions.md) §5

## Bối cảnh

Ba năng lực **về bản chất** không giống nhau giữa hai target. Nếu không giải quyết tường minh,
chúng sẽ rò `if (isElectron)` vào khắp UI và phá vỡ ADR-0002.

| # | Năng lực | Desktop | Web |
|---|---|---|---|
| A | Truy cập hệ thống file người dùng | Trực tiếp | Chỉ upload/download qua trình duyệt |
| B | Kết nối tới `localhost` của người dùng | Được | Không — engine ở server |
| C | Job chạy khi UI đóng | Cần tiến trình nền | Server luôn chạy |

## Quyết định

### A · Interface `FileGateway`

UI **không bao giờ** biết file đến từ đâu. Nó chỉ gọi:

```ts
export interface FileGateway {
  /** Mở picker, trả về handle (KHÔNG phải đường dẫn). */
  pickOpen(opts: { accept: string[]; multiple?: boolean }): Promise<FileHandle[]>
  pickSave(opts: { suggestedName: string; accept: string[] }): Promise<FileHandle | null>
  read(h: FileHandle, range?: ByteRange): AsyncIterable<Uint8Array>
  write(h: FileHandle): WritableStreamDefaultWriter<Uint8Array>
  stat(h: FileHandle): Promise<{ name: string; size: number }>
}
```

| | Desktop | Web |
|---|---|---|
| `pickOpen` | `dialog.showOpenDialog` → handle trỏ đường dẫn thật | `<input type=file>` → upload lên `/upload`, handle trỏ file tạm ở server |
| `pickSave` | `dialog.showSaveDialog` → ghi thẳng đĩa | handle trỏ file tạm ở server; khi job xong → trả download token, trình duyệt tải về |
| Job import 5 GB | Đọc trực tiếp, không copy | Upload theo chunk có resume, lưu `tmp/`, xoá sau khi xong |

UI hiển thị **giống nhau** ở cả hai. Khác biệt duy nhất người dùng thấy: web có thanh tiến
trình upload trước khi job bắt đầu.

### B · Corvus Agent cho `localhost`

Người dùng web muốn nối tới MySQL trên máy của chính họ. Server không tới được.

Giải pháp: **Corvus Agent** — chính `@corvus/engine` chạy như một tiến trình nhỏ trên máy
người dùng, nghe ở `127.0.0.1:7717`.

```
Browser (UI web)
   ├── RPC tới server công ty     → connection "prod", "staging"
   └── RPC tới localhost:7717     → connection "local dev"
```

- UI hỗ trợ **nhiều transport cùng lúc**; mỗi connection profile ghi rõ nó thuộc "site" nào
  (`server` hay `agent`).
- Agent bắt cặp với UI bằng mã một lần; sau đó dùng token; chỉ chấp nhận origin đã đăng ký.
- Agent là **cùng binary** với CLI, thêm cờ `--agent`.

Trước khi Agent xong (W7), UI web hiển thị thông báo rõ khi người dùng nhập host là
`localhost`/`127.0.0.1`: *"Host này được phân giải từ máy chủ Corvus, không phải máy của bạn."*

### C · Job nền trên desktop

- Mặc định: đóng cửa sổ → app thu vào tray, engine tiếp tục chạy job và lịch.
- Setting "Thoát hẳn khi đóng cửa sổ" (mặc định TẮT). Khi BẬT, UI hiển thị cảnh báo trong
  màn hình Automation: *"Lịch chỉ chạy khi ứng dụng đang mở."*
- Thoát khi còn job đang chạy → hộp thoại xác nhận liệt kê job.

## Hệ quả

### Tích cực
- UI không có một dòng `if (isElectron)` nào.
- Web không phải là bản què: mọi tính năng đều có đường đi, kể cả file lớn và localhost.
- `FileGateway` cũng là chỗ thuận tiện để áp giới hạn dung lượng và quét nội dung sau này.

### Tiêu cực / cái giá
- Bản web tốn thêm dung lượng đĩa tạm cho upload → cần cấu hình `CORVUS_MAX_UPLOAD_MB` và
  dọn rác định kỳ.
- Corvus Agent là artifact thứ tư phải phát hành và cập nhật.
- Upload 5 GB qua trình duyệt chậm hơn đọc file cục bộ — không tránh được, phải nói rõ với
  người dùng.

### Việc phải làm kèm theo
- `T-050` `FileGateway` + 2 hiện thực.
- `T-051` Upload theo chunk có resume + dọn file tạm.
- `T-052` Cảnh báo localhost ở dialog kết nối bản web.
- `T-053` (W7) Corvus Agent + luồng bắt cặp.
- `T-054` Chế độ tray + cảnh báo lịch ở desktop.
