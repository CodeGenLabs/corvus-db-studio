# Contract: không thêm, không đổi phương thức RPC

**Feature**: 003-ui-workflow-integration · **Date**: 2026-08-24

## Khẳng định

Feature này **không** thêm, xoá, hay đổi hình dạng bất kỳ phương thức nào trong
`packages/contract`. `packages/contract` không được sửa.

## Vì sao khẳng định này giữ được

Rà soát 2026-08-24 cho thấy hợp đồng RPC đã đủ cho toàn bộ 59 FR của spec:

| Nhu cầu của spec | Phương thức đã có | Hiện UI có gọi? |
|---|---|---|
| Engine + phiên bản + encoding cho chrome (FR-002) | `connection.status` | ❌ → cần nối |
| Đóng kết nối (FR-007) | `connection.close` | ❌ → cần nối |
| Tạo kết nối từ URI, lấy URI (FR-027) | `connection.parseUri`, `connection.toUri` | ❌ → cần nối |
| Nhân bản, xoá kết nối (FR-027) | `connection.duplicate`, `connection.delete` | ❌ → cần nối |
| Giao dịch khi sửa dữ liệu (FR-028) | `tx.begin`, `tx.commit`, `tx.rollback`, `tx.status` | ❌ → cần nối |
| Huỷ truy vấn đang chạy (FR-029) | `query.cancel` | ❌ → cần nối |
| Người dùng / vai trò / quyền (FR-030, FR-016) | `security.users`, `security.roles`, `security.privileges`, `security.previewGrant`, `security.applyGrant` | ❌ → cần nối |
| DDL cho view và routine, bảo trì, xoá (FR-031) | `ddl.previewView`, `ddl.applyView`, `ddl.previewRoutine`, `ddl.applyRoutine`, `ddl.maintain`, `ddl.dropObject` | ❌ → cần nối |
| Sao lưu / phục hồi (FR-032) | `job.start` + `job.get` + `job.log` + `job.artifacts` + `job.cancel` + `job.list` | ❌ → cần nối |
| Nhập / xuất tệp (FR-033, FR-034) | `job.*` + `file.pickOpen`, `file.pickSave`, `file.readChunk`, `file.writeChunk`, `file.stat` | ❌ → cần nối |
| Lưu bền thiết lập (FR-035) | `workspace.settings.get`, `workspace.settings.set` | ❌ → cần nối |
| Tra cứu khoá ngoại trong lưới | `data.fkLookup` | ❌ → cần nối |
| Phụ thuộc / định danh / metadata routine | `introspect.dependencies`, `introspect.identifiers`, `introspect.routineMeta` | ❌ → cần nối |
| Xoá lịch sử truy vấn, phân tích câu lệnh | `query.history.clear`, `query.parse` | ❌ → cần nối |
| Lịch sử và sửa lịch trình (FR-036) | `schedule.history`, `schedule.update` | ❌ → cần nối |
| Trò chuyện AI, giải thích kế hoạch | `ai.chat`, `ai.explainPlan` | ❌ → cần nối |
| Data Transfer, Data Sync, Structure Sync, Dump/Execute SQL (FR-037…FR-040) | `job.start` với `JobKind` tương ứng | ❌ → cần nối |

**Tổng** (đo bằng `Object.keys(METHODS)` của `@corvus/contract`, 2026-08-24): **76 phương thức**, UI đã gọi **30**, cần nối **46**, cần tạo **0**.

> Ghi chú: `workspace.db` xuất hiện dưới dạng chuỗi trong `packages/engine` nhưng **không** là contract method — không tính vào 76.

## Cổng máy giữ khẳng định này

- `pnpm check:contract` (`tools/check-contract.ts`) — `HANDLER_DEBT = 0`: mọi phương thức đã có
  handler. Con số này **chỉ được giảm**, nên nếu ai thêm phương thức mới mà chưa có handler thì cổng đỏ.
- `depcruise` luật `contract-is-leaf` — `contract` không import package nội bộ nào.
- Cổng mới `tools/check-ui-wiring.ts` — ratchet `UI_WIRING_DEBT` khởi điểm **46**, chỉ được giảm.

## Nếu khẳng định này bị phá

Phát hiện cần phương thức RPC mới trong lúc hiện thực là **tín hiệu dừng lại**, không phải việc
cứ thế làm: AGENTS.md §3 buộc hỏi khi cần thêm endpoint. Cách xử lý: ghi rõ FR nào không thực hiện
được với hợp đồng hiện có, nêu 2–3 phương án kèm hệ quả, và hỏi người phụ trách.
