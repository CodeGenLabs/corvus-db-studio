# ADR-0002: RPC transport-agnostic thay vì REST hay tRPC

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: ADR-0008, [rpc-contract.md](../rpc-contract.md)

## Bối cảnh

UI phải chạy được ở hai môi trường có cơ chế truyền tin hoàn toàn khác nhau:
HTTP/WebSocket (web) và Electron IPC (desktop). Cần chọn hình dạng API sao cho UI **không
biết** mình đang ở đâu.

Yêu cầu bắt buộc:
- Gọi-đáp (95% trường hợp)
- Stream có thứ tự, huỷ được, có backpressure (result set lớn)
- Server đẩy sự kiện (tiến trình job)
- Type-safe end-to-end
- Validate runtime ở server (không tin client, kể cả desktop)

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| **REST + OpenAPI** | Chuẩn, dễ tài liệu hoá, dễ cho bên thứ ba | Ánh xạ sang IPC rất gượng. Streaming phải chắp vá (SSE/chunked). Resource-oriented không hợp với các thao tác mệnh lệnh như `ddl.applyTable`. |
| **tRPC** | Type-safe tuyệt vời, DX tốt | Gắn chặt với HTTP adapter; subscription cần thêm lớp; ép cấu trúc router riêng; đưa type của server vào client → vi phạm luật phụ thuộc tầng |
| **gRPC-web** | Streaming hai chiều thật, contract-first | Cần proxy (Envoy) cho web; codegen nặng; ánh xạ sang Electron IPC vẫn phải tự viết |
| **RPC tự định nghĩa trên interface `Transport`** | Kiểm soát hoàn toàn 3 nguyên thuỷ cần dùng; ánh xạ tự nhiên sang cả HTTP lẫn IPC; contract độc lập cả client lẫn server | Phải tự viết ~600 dòng hạ tầng; không có sẵn công cụ bên ngoài |

## Quyết định

Tự định nghĩa lớp RPC mỏng quanh interface `Transport` với **đúng ba** nguyên thuỷ:
`request`, `stream`, `subscribe`.

Contract khai báo bằng zod trong `@corvus/contract` — một package **lá**, không phụ thuộc gì,
được cả client lẫn server import. Type suy ra từ schema, không khai báo hai lần.

Lý do quyết định: ba nguyên thuỷ đó là **tập nhỏ nhất đủ dùng**, và cả HTTP lẫn Electron IPC
đều hiện thực được tự nhiên. Mọi phương án có sẵn đều tối ưu cho HTTP rồi bắt ta gượng ép
phần desktop.

## Hệ quả

### Tích cực
- UI hoàn toàn không biết về transport. Đổi transport = đổi 1 dòng ở bootstrap.
- `transport-mock` cho phép chạy toàn bộ UI test và Storybook **không cần database**.
- Contract là nơi duy nhất khai báo permission, audit level, và guard → dễ rà soát bảo mật.
- Thêm transport thứ tư (ví dụ Web Worker) trong tương lai chỉ cần hiện thực 3 hàm.

### Tiêu cực / cái giá
- Tự viết và tự bảo trì hạ tầng: framing, backpressure, reconnect, huỷ, timeout.
- Không có sẵn Swagger UI. Bù lại: sinh tài liệu API từ registry zod (`tools/gen-api-docs.ts`).
- Bên thứ ba muốn tích hợp phải dùng client của ta, hoặc ta phơi thêm một lớp REST mỏng sau này.

### Việc phải làm kèm theo
- `T-012` Hiện thực `transport-http` (client + server) với ack window.
- `T-013` Hiện thực `transport-ipc` (preload + host).
- `T-014` Hiện thực `transport-mock`.
- `T-015` `tools/check-contract.mjs` — CI ép mọi method có handler + test.
- `T-016` Sinh tài liệu API tự động từ registry.
