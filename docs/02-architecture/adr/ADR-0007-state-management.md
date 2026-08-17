# ADR-0007: Zustand cho shell state + TanStack Query cho server state

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: ADR-0002, [overview.md](../overview.md) §5

## Bối cảnh

UI shell hiện tại dùng một React Context (`StudioProvider`) giữ **toàn bộ** state trong một
object và một hàm `set()`. Điều đó hợp lý khi mọi dữ liệu là mock tĩnh.

Khi nối dữ liệu thật sẽ xuất hiện hai loại state có vòng đời khác hẳn nhau:

| | Shell state | Server state |
|---|---|---|
| Nguồn sự thật | Client | Engine |
| Có thể cũ đi không | Không | **Có** |
| Cần cache / invalidate | Không | Có |
| Cần retry, loading, error | Không | Có |
| Ví dụ | tab đang mở, pane width, theme | danh sách bảng, kết quả query |

Trộn hai loại vào một context sẽ dẫn tới: mọi component re-render khi bất kỳ thứ gì đổi, tự
viết lại logic cache/invalidate, và không có cách chuẩn xử lý loading/error.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| Giữ nguyên một Context lớn | Không phải đổi gì | Re-render toàn cây; tự viết cache; không xử lý được stale data |
| Redux Toolkit + RTK Query | Một hệ sinh thái, devtools tốt | Nhiều boilerplate; RTK Query gắn với fetch/HTTP, phải viết baseQuery riêng cho `Transport` |
| Jotai / Recoil (atom) | Re-render tối ưu | Mô hình atom khó suy luận khi state nhiều; vẫn cần lớp server cache riêng |
| **Zustand + TanStack Query** | Zustand: nhỏ (1 KB), selector chọn lọc re-render, không boilerplate. TanStack Query: chuẩn công nghiệp cho server state, hỗ trợ transport tuỳ ý qua `queryFn` | Hai thư viện thay vì một; phải kỷ luật phân loại state đúng chỗ |

## Quyết định

- **Shell state** → `useShellStore` (Zustand), một store, chia theo slice.
- **Server state** → TanStack Query v5, `queryFn` gọi `client.request(...)`.
- Stream (`query.execute`) **không** dùng react-query; dùng hook riêng `useQueryStream`
  quản lý ring buffer và huỷ.

Quy ước key cho react-query:
```ts
['connection', connectionId, 'databases']
['connection', connectionId, 'schema', db, 'objects', kind]
['connection', connectionId, 'table', db, schema, table, 'meta']
```
Topic `schema.invalidated` → `queryClient.invalidateQueries({ queryKey: ['connection', id, 'schema'] })`.

## Hệ quả

### Tích cực
- Đổi tab không làm re-render grid; đổi theme không làm re-fetch dữ liệu.
- Loading/error/retry/stale xử lý một cách thống nhất, không viết tay từng chỗ.
- Vô hiệu hoá cache sau DDL trở nên tường minh và một dòng.
- `transport-mock` + react-query cho phép test UI không cần database.

### Tiêu cực / cái giá
- Phải refactor `StudioProvider` hiện tại (task `T-005`). Có rủi ro hồi quy → cần E2E che phủ
  trước khi refactor.
- Lập trình viên phải phân loại đúng: state này là shell hay server? Quy tắc phân biệt:
  *"Nếu người dùng khác cũng thấy được thì đó là server state."*

### Việc phải làm kèm theo
- `T-005` Tách `StudioProvider` → `useShellStore` + hook react-query.
- `T-017` `useQueryStream` cho result set.
- Bổ sung mục vào [coding-rules.md](../../05-rules/coding-rules.md): cấm để dữ liệu server
  trong `useShellStore`.
