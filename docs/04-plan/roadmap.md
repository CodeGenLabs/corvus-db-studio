# Roadmap

10 wave. Mỗi wave kết thúc bằng một bản **chạy thật, dùng được**, không phải demo.

Giả định nhân lực cơ sở: **4 kỹ sư** (2 frontend, 2 backend) + 1 QA bán thời gian.
Điều chỉnh thời lượng theo [estimation.md](estimation.md) nếu khác.

---

## Tổng quan

| Wave | Tên | Thời lượng | Mốc phát hành | Ai dùng được? |
|---|---|---|---|---|
| **W-0** | Nền tảng & Kết nối | 6 tuần | `0.1.0` alpha nội bộ | Kỹ sư trong team |
| **W-1** | Xem & sửa dữ liệu, chạy SQL | 7 tuần | `0.2.0` alpha | Early adopter nội bộ |
| **W-2** | Thiết kế bảng & hoàn thiện editor | 6 tuần | `0.3.0` beta kín | Beta tester |
| **W-3** | Import/Export & Backup | 6 tuần | **`0.5.0` beta công khai** | Người dùng thật |
| **W-4** | Query Builder, ER, tổ chức workspace | 5 tuần | `0.6.0` | |
| **W-5** | Automation, Monitor, Security, multi-user | 7 tuần | **`1.0.0` GA** | Phát hành chính thức |
| **W-6** | Transfer/Sync, Model, Data Gen, MSSQL | 8 tuần | `1.1.0` | |
| **W-7** | MongoDB, Redis, Corvus Agent, macOS/Linux | 8 tuần | `1.2.0` | |
| **W-8** | AI, Profiling, Oracle | 7 tuần | `1.3.0` | |
| **W-9** | BI, Collaboration, làm cứng | 8 tuần | `2.0.0` | |

**Tới GA (`1.0.0`): ~37 tuần ≈ 8.5 tháng.**

---

## W-0 · Nền tảng & Kết nối (6 tuần)

Không có tính năng nào cho người dùng cuối. Đây là wave xây móng — làm sai ở đây thì mọi wave
sau đều đắt hơn.

**Giao được**
- Monorepo pnpm + turbo, luật phụ thuộc ép bằng máy
- `@corvus/contract` với zod + `defineUnary`/`defineStream` + `tools/check-contract`
- 3 transport: http, ipc, mock
- Driver SPI + `CapabilitySet` + conformance suite (khung + nhóm C1, C2)
- Driver PostgreSQL, MySQL, SQLite (mức connect + introspect)
- `@corvus/storage`: `workspace.db` + migration + `SecretVault` (2 hiện thực)
- SSH tunnel + TLS + kiểm host key
- `apps/web` (Fastify + SPA) và `apps/desktop` (Electron 3 tiến trình) **cùng render `<CorvusApp/>`**
- UI: di chuyển toàn bộ shell hiện tại vào `packages/ui`; tách `StudioProvider` → `useShellStore` + react-query
- Kết nối thật: dialog kết nối theo `connectionSchema`, test, mở, cây điều hướng thật
- CI: lint, typecheck, unit, build, depcruise, e2e web smoke, desktop smoke

**SPEC**: SPEC-01, SPEC-02 (một phần), SPEC-15 (khung)

**Tiêu chí ra wave**
```
[ ] Cả 3 driver vượt C1 + C2 của conformance suite
[ ] Web build và desktop build đều kết nối được tới PostgreSQL thật và duyệt cây
[ ] pnpm verify xanh; depcruise không vi phạm
[ ] Test rò secret xanh
[ ] Mở/đóng 200 kết nối không rò socket
[ ] Không có `if (isElectron)` trong packages/ui (grep + ESLint)
```

**Rủi ro chính**: đánh giá thấp công sức hạ tầng transport. Giảm thiểu: làm `transport-mock`
**trước tiên** để UI không bị chặn.

---

## W-1 · Xem & sửa dữ liệu, chạy SQL (7 tuần)

Wave đưa sản phẩm từ "kết nối được" thành "làm việc được".

**Giao được**
- `DataGrid` ảo hoá — thành phần nền tảng, dùng lại ở 5 chỗ
- Data Editor: đọc, sửa, thêm, xoá, transaction, phân trang, sort, filter pane
- `SqlEditor` (CodeMirror 6) + chạy + nhiều result set + Messages + huỷ
- Streaming result set với backpressure end-to-end
- `splitStatements` cho 3 dialect + golden tests
- Preview-token + `SqlPreviewDialog`
- Chế độ read-only (2 lớp)
- Query history
- Conformance C3, C4, C5, C6

**SPEC**: SPEC-03, SPEC-04 (lõi), SPEC-02 (hoàn thiện)

**Tiêu chí ra wave**
```
[ ] NFR-01 (150 ms first paint), NFR-02 (55 fps @ 1M dòng), NFR-03 (400 MB @ 10M dòng) đạt
[ ] Sửa dữ liệu round-trip đúng mọi kiểu trên 3 engine (C4)
[ ] Optimistic lock phát hiện xung đột
[ ] NULL ≠ chuỗi rỗng giữ nguyên qua toàn bộ luồng
[ ] Huỷ query ≤ 200 ms, server nhận CANCEL
[ ] Không có đường nào ghi dữ liệu mà bỏ qua preview-token
[ ] Read-only chặn ở cả UI và engine
```

**Rủi ro chính**: `DataGrid` khó hơn dự kiến. Giảm thiểu: dành 2 tuần đầu chỉ cho nó, có
benchmark trong CI từ ngày đầu.

---

## W-2 · Thiết kế bảng & hoàn thiện editor (6 tuần)

**Giao được**
- Table Designer đầy đủ (fields/indexes/FK/checks/triggers/options)
- Thuật toán diff `ALTER TABLE` + golden file 40 kịch bản × 3 engine
- View Designer
- Code completion schema-aware, format/minify, find/replace, folding
- Objects Detail view + chọn cột
- Form View, cell editor đầy đủ (12 kiểu)
- Copy/paste (TSV, INSERT, UPDATE, JSON, Markdown)
- Tab thật có state riêng + khôi phục sau khởi động
- Settings đầy đủ 6 mục
- Connection coloring, URI

**SPEC**: SPEC-06, SPEC-04 (hoàn thiện), SPEC-15 (đầy đủ)

**Tiêu chí ra wave**
```
[ ] Golden file diff ALTER TABLE xanh 100% trên 3 engine
[ ] SQLite recreate-table giữ nguyên dữ liệu, index, trigger
[ ] Rename cột không sinh drop+add
[ ] Cảnh báo mất dữ liệu / rebuild bảng đúng lúc
[ ] Completion gợi ý đúng cột sau alias
[ ] Mở 3 tab SQL độc lập, mỗi tab giữ query riêng
```

---

## W-3 · Import/Export & Backup (6 tuần) → **beta công khai**

Wave đưa sản phẩm ra ngoài lần đầu.

**Giao được**
- `JobRunner` (worker thread) + `Scheduler` (khung) + job log streaming
- `FileGateway` (2 hiện thực) + upload resume ở web
- Import Wizard: 6 định dạng, 5 mode, mapping, profile
- Export Wizard: 9 định dạng, profile
- Backup & Restore built-in cho MySQL/PG/SQLite + verify + lịch sử
- Extract SQL
- Explain + `ExplainTree`
- Routine Designer
- Maintain objects
- Đóng gói: Docker image, NSIS installer đã ký, auto-update

**SPEC**: SPEC-08, SPEC-10, SPEC-06 (routine)

**Tiêu chí ra wave**
```
[ ] Import 1 GB CSV: RAM ≤ 300 MB, thời gian trong ngưỡng
[ ] Backup → restore round-trip: schema + dữ liệu giống bản gốc (3 engine)
[ ] File backup chạy được bằng psql/mysql bên ngoài
[ ] Huỷ job: dọn sạch mọi thứ
[ ] Web: upload resume sau khi ngắt mạng
[ ] Installer đã ký, cài được trên Windows sạch, auto-update hoạt động
[ ] Docker image chạy được, migration workspace tự động
[ ] Toàn bộ checklist phát hành trong packaging-release.md
```

**Rủi ro chính**: ký số EV mất thời gian mua và thiết lập. Giảm thiểu: bắt đầu thủ tục mua
chứng chỉ **từ W-1**.

---

## W-4 · Query Builder, ER, tổ chức workspace (5 tuần)

**Giao được**
- `DiagramCanvas` dùng chung (React Flow + elkjs)
- ER Diagram view tự sinh, auto-layout, lưu vị trí, tạo FK từ canvas
- Query Builder trực quan
- Query parameters, snippets
- Virtual grouping, favorites, share via URI
- Find in Database/Schema
- Foreign-key data selection, table profile

**SPEC**: SPEC-05, SPEC-07 (ER), SPEC-13 (find)

**Tiêu chí ra wave**
```
[ ] ER 50 bảng: introspect + layout + render ≤ 3 s
[ ] > 150 bảng → dialog chọn, không treo
[ ] buildSelect golden file xanh trên 3 dialect
[ ] SQL từ builder chạy được thật
[ ] Cảnh báo ghi đè khi người dùng đã chỉnh tay
```

---

## W-5 · Automation, Monitor, Security, multi-user (7 tuần) → **GA 1.0.0**

**Giao được**
- Batch job + Scheduler đầy đủ + leader election + email/webhook
- CLI `corvus run-job`
- Server Monitor (process/variables/status)
- User/Role/Privilege Manager (3 engine)
- Web multi-user: đăng nhập local + OIDC, RBAC, connection ACL, audit log
- Tray mode desktop
- Đường dẫn công cụ ngoài (`mysqldump`, `pg_dump`) + wrapper
- Làm cứng: xử lý lỗi, thông điệp, tài liệu người dùng

**SPEC**: SPEC-11, SPEC-12, SPEC-13 (monitor), [security.md](../02-architecture/security.md)

**Tiêu chí ra wave (GA — nghiêm ngặt nhất)**
```
[ ] Toàn bộ tier T0 và T1 của feature-inventory ở trạng thái ✅ (7 điều kiện của scope-decisions §6)
[ ] Integration test đủ 4 engine × 3 version
[ ] E2E xanh trên 4 trình duyệt + desktop
[ ] Toàn bộ NFR-01…NFR-10 đo được và đạt
[ ] Kiểm thử bảo mật: 4 test rò rỉ xanh, pentest nội bộ xong
[ ] pnpm audit + trivy sạch (không high/critical)
[ ] Tài liệu người dùng đủ cho mọi tính năng T0/T1
[ ] Nâng cấp từ 0.5.0 → 1.0.0 giữ nguyên workspace (thử với file thật)
[ ] Chạy thử 2 tuần với ≥ 10 người dùng thật, không có lỗi P0/P1 mở
```

---

## W-6 · Transfer/Sync, Model, Data Gen, SQL Server (8 tuần)

**Giao được**
- Data Transfer cross-engine + bảng ánh xạ kiểu
- Data Synchronization (merge join streaming) + rollback script
- Structure Synchronization
- Model Designer (reverse/forward/diff)
- Data Generation (30+ generator)
- Data Dictionary
- Driver SQL Server (đầy đủ conformance)
- Materialized view, sequence, trigger, event designer
- Phím tắt tuỳ biến, Focus mode

**SPEC**: SPEC-09, SPEC-07 (model)

---

## W-7 · MongoDB, Redis, Agent, macOS/Linux (8 tuần)

**Giao được**
- Driver MongoDB + view riêng (grid/tree/json) + aggregation builder + schema analysis
- Driver Redis + key browser + command monitor + pub/sub
- Corvus Agent (giải quyết localhost cho web)
- Phát hành chính thức macOS (dmg, notarized) và Linux (AppImage, deb)
- MongoDump/MongoRestore, MongoImport/Export

**SPEC**: SPEC-13

---

## W-8 · AI, Profiling, Oracle (7 tuần)

**Giao được**
- AI Assistant (4 provider, allowlist payload, không tự chạy)
- Data Profiling
- Driver Oracle (thin mode) + Data Pump
- Console (CLI tương tác)
- Clipboard stack, proxy settings
- PL/pgSQL debugger

**SPEC**: SPEC-14

---

## W-9 · BI, Collaboration, làm cứng (8 tuần) → `2.0.0`

**Giao được**
- BI: data source, 16 loại chart, dashboard
- Collaboration: self-hosted sync server, project, member
- Conceptual/logical model
- Làm cứng toàn diện, tối ưu hiệu năng, giảm nợ kỹ thuật

---

## Nguyên tắc vận hành roadmap

1. **Không wave nào bắt đầu trước khi wave trước đạt đủ tiêu chí ra wave.** Nếu chậm thì cắt
   scope của wave hiện tại, không đẩy nợ sang wave sau.
2. **Nợ kỹ thuật được trả trong wave phát sinh.** Mỗi wave dành 15% thời lượng cho việc này.
3. **Mỗi wave có một "spike" tối đa 3 ngày** cho phần chưa biết rõ, làm ở đầu wave.
4. Tier T3 chỉ được làm khi mọi T0/T1/T2 của cùng module đã xong.
5. Mọi thay đổi roadmap phải cập nhật file này kèm lý do trong git commit.
