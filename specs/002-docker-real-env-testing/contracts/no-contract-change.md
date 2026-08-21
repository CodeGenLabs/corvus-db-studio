# Contract Impact: không thay đổi hợp đồng RPC

**Branch**: `002-docker-real-env-testing` | **Date**: 2026-08-21

Dự án không dùng REST/GraphQL. Hợp đồng là **registry RPC khai bằng zod** (ADR-0008), gồm 76 method, mỗi method có `params`, `result`, `permission`, `audit`, được `pnpm check:contract` kiểm bằng máy.

## Kết luận: 0 thay đổi hợp đồng

Feature này **không thêm, sửa, hay xoá** method nào trong registry. `pnpm check:contract` phải giữ nguyên **76/76 method, `HANDLER_DEBT = 0`** trước và sau khi làm.

Lý do: mọi việc trong phạm vi đều nằm **dưới** hoặc **bên cạnh** hợp đồng, không nằm trong nó:

| Nhóm việc | Tầng | Vì sao không chạm hợp đồng |
|---|---|---|
| `docker/dev-db/` + seed | ngoài mã ứng dụng | là hạ tầng; engine đích không biết gì về RPC |
| `tools/devdb/` | công cụ phát triển | không chạy trong tiến trình ứng dụng |
| `packages/driver-core/src/testenv/` | tầng test | chỉ test gọi; không có handler nào dùng |
| Bỏ mock ở `packages/ui` | tầng hiển thị | UI **đã** gọi đúng các method có sẵn; chỉ bỏ nhánh fallback |
| Nối engine thật cho desktop (A-11) | tầng vận chuyển | `IpcRpcHost` nhận một router; chỉ đổi **router nào** được đưa vào, không đổi hình dạng method |
| Bảng README, CI | tài liệu / hạ tầng | — |

## Ba hợp đồng nội bộ **có** thay đổi (không phải RPC)

Đây là interface trong mã, không phải hợp đồng RPC — nhưng cần ghi lại vì có consumer.

### C-1 · `ConformanceDialect` — thêm hai hằng

**Vị trí**: `packages/driver-core/src/conformance/dialect.ts`

**Trước**: 5 hằng — `POSTGRES_`, `SQLITE_`, `MYSQL_`, `MSSQL_`, `ORACLE_CONFORMANCE`.

**Sau**: thêm `MONGODB_CONFORMANCE` và `REDIS_CONFORMANCE` (FR-023). Interface `ConformanceDialect` **không đổi hình dạng** — hai engine mới dùng `skip` đã có sẵn để khai báo nhóm kiểm tra không áp dụng được, kèm lý do.

**Tương thích ngược**: có. `runConformanceSuite` vẫn mặc định `POSTGRES_CONFORMANCE`, nên 5 file test hiện tại không phải sửa.

### C-2 · `TestEnvDialect` — interface mới

**Vị trí**: `packages/driver-core/src/testenv/dialect.ts` (mới)

Khai báo cho mỗi engine ba việc: tạo không gian riêng, đủ điều kiện tên, xoá không gian. Chi tiết ánh xạ 7 engine ở [research.md §R-3](../research.md). Đây là **chỗ duy nhất** được phép chứa tri thức theo engine cho tầng test (giữ Cấm 2).

**Consumer**: chỉ các file `*.integration.test.ts`. Không có mã sản phẩm nào import.

### C-3 · Điểm vào của `CorvusApp` — transport trở thành bắt buộc

**Vị trí**: `packages/ui/src/store/studio.tsx`

**Trước**: `const t = transport ?? createMockTransport()` — transport là tuỳ chọn, thiếu thì thành mock.

**Sau**: transport là **bắt buộc**. Thiếu thì lỗi kiểu ở thời điểm biên dịch (không phải lỗi runtime) — nghĩa là không có cách nào vô tình rơi vào mock (FR-013).

**Tương thích ngược**: **không**. Đây là breaking change có chủ ý với mọi nơi đang gọi `<CorvusApp />` không tham số — hiện là `src/App.tsx` và test UI. Cả hai đều nằm trong phạm vi feature.

**Kèm theo**: `packages/ui/src/index.ts` bỏ dòng `export * from './data/schema'` (FR-015a) — đây cũng là breaking change với API công khai của package, nhưng thứ bị bỏ là fixture mock, không phải năng lực sản phẩm.
