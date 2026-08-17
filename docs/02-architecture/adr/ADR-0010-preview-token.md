# ADR-0010: Preview-token bắt buộc cho mọi thao tác phá huỷ

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: [security.md](../security.md) §6, [rpc-contract.md](../rpc-contract.md) §4

## Bối cảnh

Tai nạn tốn kém nhất khi dùng công cụ quản trị DB không phải là lỗi phần mềm, mà là **người
dùng chạy đúng thứ mình gõ nhưng không hiểu nó làm gì**: `ALTER` khiến bảng 40 triệu dòng bị
rebuild và khoá 20 phút; Table Designer sinh `DROP COLUMN` vì cột bị coi là đã xoá thay vì
đổi tên; `GRANT ALL` nhầm đối tượng.

Công cụ tự sinh SQL rồi chạy ngay là mô hình nguy hiểm. Nhưng chỉ "hiện hộp thoại xác nhận"
cũng không đủ: người dùng bấm OK theo phản xạ, và hộp thoại thường **không cho biết SQL thật
sự là gì**.

## Phương án đã cân nhắc

| Phương án | Nhược |
|---|---|
| Chạy ngay, có Undo | Nhiều engine không rollback được DDL (MySQL, Oracle). Undo là ảo tưởng. |
| Hộp thoại "Bạn có chắc không?" | Người dùng bấm theo quán tính; không hiển thị SQL; không phát hiện schema đã đổi |
| Hiển thị SQL rồi chạy lại từ cùng dữ liệu | SQL hiển thị và SQL chạy có thể khác nhau nếu code đi hai nhánh; schema có thể đã đổi giữa chừng |
| **Preview-token** | Phức tạp hơn một chút ở cả hai phía |

## Quyết định

Mọi thao tác phá huỷ đi theo cặp bắt buộc `preview*` → `apply*`.

```ts
// Bước 1
const { sql, previewToken, warnings, expiresAt } =
  await client.request('ddl.previewTable', { connectionId, design })

// UI BẮT BUỘC hiển thị `sql` và `warnings` cho người dùng.

// Bước 2 — chỉ nhận token, không nhận lại design
await client.request('ddl.applyTable', { previewToken })
```

Engine lưu bên trong token:
```ts
interface PreviewRecord {
  token: string
  actorId: string
  connectionId: string
  statements: string[]          // ĐÚNG những câu sẽ chạy
  schemaFingerprint: string     // hash của trạng thái object lúc preview
  createdAt: number
  expiresAt: number             // +5 phút
  consumed: boolean
}
```

`apply*` từ chối khi: token không tồn tại / hết hạn / đã dùng / khác actor / **`schemaFingerprint`
không còn khớp** (`STALE_PREVIEW`).

Áp dụng cho: `ddl.*`, `security.applyGrant`, `data.applyChanges`, `job.start` với job mutating
(restore, transfer, datasync, structsync).

## Hệ quả

### Tích cực
- **SQL hiển thị chính là SQL được chạy** — không thể lệch, vì `apply` không sinh lại SQL.
- Bắt được tình huống chạy đua: đồng nghiệp sửa bảng giữa lúc mình đang xem preview.
- Audit log ghi được cả preview lẫn apply → truy vết đầy đủ.
- Cảnh báo (`rebuild bảng lớn`, `mất dữ liệu do thu hẹp kiểu`) có chỗ tự nhiên để xuất hiện.
- Test dễ: khẳng định "không có đường nào chạy DDL mà không qua preview".

### Tiêu cực / cái giá
- Thêm một vòng round-trip cho mỗi thao tác ghi. Không đáng kể so với thời gian chạy DDL.
- Engine phải giữ state ngắn hạn (in-memory, TTL 5 phút). Mất khi restart → người dùng phải
  preview lại. Chấp nhận được.
- Nhà phát triển dễ quên. Giảm thiểu: helper `useMutationWithPreview()` trong `@corvus/client`
  và test contract khẳng định mọi `apply*` đều có `preview*` tương ứng.

### Việc phải làm kèm theo
- `T-060` `PreviewStore` trong engine (TTL, fingerprint).
- `T-061` `useMutationWithPreview()` + component `SqlPreviewDialog` dùng chung.
- `T-062` Test contract: mọi method `apply*` phải nhận `previewToken` và có `preview*` cặp đôi.
- `T-063` Bảng cảnh báo DDL theo engine (thao tác nào khoá bảng, thao tác nào mất dữ liệu).
