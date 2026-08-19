# Prompt giao việc — Corvus DB Studio

Mỗi file là **một khối dán được nguyên vẹn** vào phiên AI mới. Không cần sửa gì trước khi dán.

> Trạng thái gốc của mọi prompt ở đây: **2026-08-19**, sau T-B05 + T-C00 + T-024b.
> `pnpm verify` exit 0 · 132 unit test · 73 integration test · 8/76 method RPC có handler.
> Engine kết nối thật: **PostgreSQL, SQLite**.

## Việc còn lại — thứ tự khuyến nghị

| # | Prompt | Task | Ước lượng | Vì sao thứ tự này |
|---|---|---|---|---|
| 1 | [T-B01-B02-sql-safety.md](T-B01-B02-sql-safety.md) | T-B02 + T-B01 | 3–4 ngày | Làm TRƯỚC MySQL: thêm engine vào lúc `uri.ts` còn rẽ nhánh theo `driverId` là biến 2 chỗ thành 6 |
| 2 | [T-024-mysql-driver.md](T-024-mysql-driver.md) | T-024 | 3–4 ngày | Engine thật thứ ba; conformance đã trung lập engine nên đường đi đã dọn sẵn |
| 3 | [T-B06-conformance-c4-c9.md](T-B06-conformance-c4-c9.md) | T-B06 | 3–4 ngày | Sau khi có 3 engine thì C4/C7/C8 mới đáng viết một lần dùng ba chỗ |
| 4 | [T-B03-node-app-bundling.md](T-B03-node-app-bundling.md) | T-B03 | 2 ngày | Chặn mọi việc đóng gói; độc lập, chen vào lúc nào cũng được |
| 5 | [R-01-reaudit-done-markers.md](R-01-reaudit-done-markers.md) | R-01 | 3–5 ngày | Việc rà soát, không phải việc xây; giao song song được |

## Việc cần BẠN quyết định, không giao cho AI

| Task | Vì sao cần người |
|---|---|
| **T-C01 / ADR-0011** | MongoDB và Redis không làm được với SPI hiện tại (`dialect: SqlDialect` bắt buộc, `execute({sql})`). [driver-roadmap.md §2.2](../04-plan/driver-roadmap.md) nêu 3 phương án và khuyến nghị C. Đây là ranh giới package → theo AGENTS.md, AI **phải hỏi**, không tự chọn |
| Thứ tự W-1 | Nối UI SqlView vào `query.execute` cần CodeMirror trước (ADR-0004). Việc này quyết định W-1 bắt đầu từ đâu |

## Việc nhỏ, gộp vào PR gần nhất chạm cùng file

Không cần prompt riêng; nêu trong phần "việc kèm theo" của prompt tương ứng:

- **Nhánh lỗi HTTP `/rpc` mất mã CorvusError** — [apps/web/server/src/index.ts:60](../../apps/web/server/src/index.ts) trả `{error: message}`, không nhất quán với `toWireError()` của WebSocket. UI không phân biệt được `TABLE_NOT_FOUND` với `CONNECTION_FAILED` trên đường HTTP.
- **Stream handler còn thiếu**: `data.browse` (cần dịch `FilterExpr` AST → SQL, thuộc SPEC-03), `job.log`, `monitor.processes`, `ai.chat`.
- **`permessage-deflate`** cho WebSocket (rpc-contract §5.1) chưa bật.
- **T-B04** — nối `PreviewTokenManager` vào handler + `schemaFingerprint` (ADR-0010). Chưa cấp thiết vì chưa có handler ghi nào.
- **T-024b-ddl** — chuỗi 12 bước tạo lại bảng của SQLite (SPEC-06 §6). Cần khi UI có Table Designer.

## Prompt cho việc rà soát

[REVIEW-for-claude.md](REVIEW-for-claude.md) — dán vào phiên mới để rà soát lại **chính phần code
đã viết trong hai phiên T-B05 và T-024b**. Prompt này viết cho một AI *không* tin lời phiên trước.

## Prompt tổng quát

Cần giao một task không có prompt riêng ở đây thì dùng [../KICKOFF-PROMPT.md](../KICKOFF-PROMPT.md)
biến thể **A** (phiên mới) hoặc **B** (đã làm việc trong repo).

## Cách viết prompt mới cho repo này

Bốn phần đã chứng minh có tác dụng, rút từ T-B05:

1. **"ĐÃ CÓ, không cần viết lại"** — liệt kê cụ thể. Không có mục này, AI viết lại thứ đã tồn tại
   và tạo bản thứ hai của cùng một khái niệm.
2. **Cái bẫy đã biết** — rút từ việc đọc code thật, không phải phòng xa chung. Kèm lý do.
3. **Chốt kiểm soát**: đọc → tóm tắt → **dừng chờ xác nhận**. Chỗ rẻ nhất để bắt hiểu sai task.
4. **Tiêu chí xong đo được**, mỗi dòng có test hoặc lệnh chứng minh.
