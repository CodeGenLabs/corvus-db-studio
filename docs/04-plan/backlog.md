# Backlog — Epic → Task

Đây là **danh sách việc thực thi được**. Mỗi task đủ nhỏ để một người (hoặc một AI agent) làm
xong trong ≤ 2 ngày, và đủ rõ để không cần hỏi lại.

## Cách đọc một dòng task

```
T-030 · [W1] DataGrid: ảo hoá hàng + cột
        SPEC-03 FR-03.01, FR-03.02 · ADR-0005
        ⇦ T-002
        📁 packages/ui/src/grid/DataGrid.tsx, GridHeader.tsx, GridRow.tsx
        ✅ 1M dòng ≥ 55 fps (benchmark); resize cột ≤ 16 ms/frame; test: grid.bench.ts
```

- `T-nnn` mã task · `[Wn]` wave
- Dòng 2: SPEC/FR và ADR liên quan — **đọc trước khi code**
- `⇦` task phụ thuộc (phải xong trước)
- `📁` file dự kiến tạo/sửa
- `✅` tiêu chí xong, luôn kiểm chứng được

---

# E-001 · Nền tảng monorepo  `[W0]`

```
[DONE] T-001 · [W0] Dựng pnpm workspace + Turborepo + tsconfig.base
        docs: monorepo.md §2, §6
        📁 package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json
        ✅ pnpm install chạy; turbo run build chạy; app hiện tại vẫn build được

[DONE] T-002 · [W0] Di chuyển UI hiện tại vào packages/ui
        monorepo.md §3 bước 2
        ⇦ T-001
        📁 packages/ui/src/** (từ src/components, src/views, src/styles, src/i18n)
        ✅ import từ @corvus/ui hoạt động; app chạy như trước; không mất tính năng nào

[DONE] T-003 · [W0] Tách kiểu dùng chung sang packages/contract/src/models
        ⇦ T-001
        📁 packages/contract/src/models/*.ts
        ✅ ui và engine cùng import một kiểu; không khai báo trùng

[DONE] T-004 · [W0] Chuyển mock data sang packages/transport-mock/src/fixtures
        ⇦ T-001
        📁 packages/transport-mock/src/fixtures/sakila.ts
        ✅ Storybook và unit test UI chạy không cần database

[DONE] T-005 · [W0] Tách StudioProvider → useShellStore (zustand) + hook react-query
        ADR-0007 · SPEC-15 §4
        ⇦ T-002, T-014
        📁 packages/ui/src/store/shell.ts, packages/client/src/queries/*
        ✅ đổi tab không re-render grid; đổi theme không refetch; e2e hiện có vẫn xanh

[DONE] T-006 · [W0] Dựng apps/web (Fastify + SPA) và apps/desktop (Electron 3 tiến trình)
        ADR-0001 · overview.md §3
        ⇦ T-002, T-012, T-013
        📁 apps/web/{client,server}, apps/desktop/{main,preload,renderer}
        ✅ cả hai render <CorvusApp/>; khác nhau đúng 1 dòng bootstrap; cả hai chạy được

T-007 · [W0] Cấu hình @electron/rebuild cho better-sqlite3
        packaging-release.md §2
        ⇦ T-006
        📁 apps/desktop/package.json, scripts/rebuild-native.mjs
        ✅ require('better-sqlite3') OK trong Electron đã đóng gói (smoke test)

T-008 · [W0] Thiết lập CI: lint + typecheck + unit + build + depcruise
        packaging-release.md §5
        ⇦ T-001
        📁 .github/workflows/ci.yml, .dependency-cruiser.cjs, eslint.config.js
        ✅ PR vi phạm luật phụ thuộc bị chặn (test bằng PR có chủ đích)

T-009 · [W0] ESLint rule tuỳ biến: no-driver-id-branching, no-raw-sql-concat, no-node-in-ui
        ADR-0003 · coding-rules.md
        ⇦ T-008
        📁 tools/eslint-rules/*.js
        ✅ 3 rule chặn đúng vi phạm, không báo sai với code hợp lệ
```

# E-002 · Contract & Transport  `[W0]`

```
[DONE] T-010 · [W0] defineUnary / defineStream + registry METHODS
        ADR-0008 · rpc-contract.md §3
        ⇦ T-001
        📁 packages/contract/src/define.ts, index.ts
        ✅ z.infer cho ra type đúng; registry gom đủ method

[DONE] T-011 · [W0] Đóng gói font vào bundle, bỏ Google Fonts, siết CSP
        security.md §8 · SPEC-15 §10
        ⇦ T-002
        📁 packages/ui/src/theme/fonts.css, apps/*/index.html
        ✅ Playwright kiểm: 0 request ra domain ngoài

[DONE] T-012 · [W0] transport-http: client + server + ack window + reconnect
        ADR-0002 · rpc-contract.md §5.1
        ⇦ T-010
        📁 packages/transport-http/src/{client.ts,server.ts,frames.ts}
        ✅ stream 1M dòng không làm phồng RAM client; ngắt WS → tự nối lại, subscribe khôi phục

[DONE] T-013 · [W0] transport-ipc: preload + host + MessagePort stream
        rpc-contract.md §5.2
        ⇦ T-010
        📁 packages/transport-ipc/src/{client.ts,host.ts,preload.ts}
        ✅ contextIsolation+sandbox bật; chỉ window.corvus được phơi; method ngoài registry bị từ chối

[DONE] T-014 · [W0] transport-mock + createClient
        ⇦ T-010, T-004
        📁 packages/transport-mock/src/index.ts, packages/client/src/createClient.ts
        ✅ toàn bộ UI chạy trên mock, không cần engine

T-015 · [W0] tools/check-contract.mjs
        rpc-contract.md §3
        ⇦ T-010
        📁 tools/check-contract.mjs
        ✅ CI fail khi method thiếu handler / handler thiếu method / method thiếu test

T-016 · [W1] tools/gen-api-docs.ts → docs/api/
        ⇦ T-010
        ✅ mọi method có trang tài liệu sinh tự động, kèm schema

T-017 · [W1] useQueryStream: ring buffer + huỷ + phát hiện lỗ hổng seq
        streaming-and-jobs.md §A
        ⇦ T-012, T-014
        📁 packages/client/src/useQueryStream.ts
        ✅ ring buffer giới hạn 200k dòng; huỷ ≤ 200 ms; seq không liên tục → báo lỗi

[DONE] T-018 · [W0] Engine router: validate zod + AuthContext + audit + guard
        rpc-contract.md · security.md §4
        ⇦ T-010
        📁 packages/engine/src/router.ts, auth/, audit.ts, guards.ts
        ✅ mọi method đi qua 4 bước; test khẳng định không bypass được

[DONE] T-019 · [W0] Bảng lỗi CorvusError + i18n key + redaction middleware
        overview.md §6 · security.md §3
        ⇦ T-010
        📁 packages/contract/src/errors.ts, packages/engine/src/redact.ts
        ✅ redact() phủ 10 khoá nhạy cảm, đệ quy; test rò rỉ xanh
```

# E-003 · Driver layer  `[W0]`

```
[DONE] T-020 · [W0] Định nghĩa CapabilitySet đầy đủ
        ADR-0003 · capability-matrix.md
        ⇦ T-010
        📁 packages/contract/src/capabilities.ts
        ✅ khớp 100% với capability-matrix.md

[DONE] T-021 · [W0] Driver SPI interface + registry
        driver-spi.md §1
        ⇦ T-020
        📁 packages/driver-core/src/{types.ts,registry.ts}

[DONE] T-022 · [W0] driver-conformance-suite: khung + C1 Connect + C2 Introspect
        driver-spi.md §8
        ⇦ T-021
        📁 packages/driver-core/src/conformance/**
        ✅ chạy được với testcontainers; báo cáo rõ nhóm nào fail

[DONE] T-023 · [W0] driver-postgres: connect, pool, introspect, dialect
        ⇦ T-022
        📁 packages/driver-postgres/src/**
        ✅ vượt C1+C2; listObjects 5000 bảng ≤ 800 ms; không N+1 (test đếm query)

[DONE] T-024 · [W0] driver-mysql: tương tự + đọc lower_case_table_names lúc connect
        ⇦ T-022
        📁 packages/driver-mysql/src/**
        ✅ vượt C1+C2; capabilities thu hẹp đúng theo version server

[DONE] T-024b · [W0] driver-sqlite
        ⇦ T-022
        📁 packages/driver-sqlite/src/**
        ✅ vượt C1+C2

[DONE] T-029 · [W0] @corvus/tunnel: SSH (ssh2) + known_hosts + TLS config
        SPEC-01 FR-01.08–11 · security.md §8
        ⇦ T-021
        📁 packages/tunnel/src/**
        ✅ host key mới → hỏi; host key đổi → chặn, KHÔNG có tuỳ chọn bỏ qua;
           tunnel đếm tham chiếu, đóng sau 30 s ân hạn
```

# E-004 · Storage & Security  `[W0]`

```
[DONE] T-025 · [W0] @corvus/storage + migration runner có checksum
        ADR-0006 · workspace-storage.md
        ⇦ T-001
        📁 packages/storage/src/**, migrations/0001_init.sql
        ✅ migration idempotent; sửa file cũ → checksum fail → từ chối khởi động

[DONE] T-026 · [W0] Tự backup workspace.db trước khi migrate
        ⇦ T-025
        ✅ file .bak-<version> được tạo; test với file thật

T-027 · [W1] corvus workspace export/import định dạng .corvusws
        workspace-storage.md §6
        ⇦ T-025
        ✅ round-trip đầy đủ, có và không có secret; passphrase PBKDF2 600k

[DONE] T-028 · [W0] Từ chối khởi động khi user_version mới hơn app
        ⇦ T-025
        ✅ thông điệp rõ, không downgrade âm thầm

[DONE] T-029b · [W0] SecretVault: OsKeychainVault + EnvelopeVault
        security.md §2
        ⇦ T-025
        📁 packages/storage/src/vault/**
        ✅ desktop dùng safeStorage; web dùng envelope + HKDF; server từ chối start khi thiếu MK

[DONE] T-029c · [W0] Test rò rỉ secret (4 bộ)
        security.md §2, §11
        ⇦ T-029b, T-019
        📁 packages/engine/src/__tests__/{vault,connection,security,ai}-leak.test.ts
        ✅ sentinel không xuất hiện trong response / log / audit / telemetry
```

# E-005 · Kết nối (SPEC-01)  `[W0]`

```
[DONE] T-070 · [W0] connection.* methods trong contract
[DONE] T-071 · [W0] SessionManager + pool + idle timeout + heartbeat + backoff reconnect
[DONE] T-072 · [W0] connection.test (profile đã lưu + draft chưa lưu)
[DONE] T-073 · [W0] ConnectionForm render từ driver.connectionSchema
[DONE] T-074 · [W0] SslTab, SshTab, AdvancedTab
[DONE] T-075 · [W0] HostKeyPrompt + luồng trustHostKey
[DONE] T-076 · [W0] Chế độ read-only: SQL parse guard + session-level + UI badge
[DONE] T-077 · [W1] Connection coloring + virtual group
[DONE] T-078 · [W1] parseUri / toUri
[DONE] T-079 · [W1] Host policy chống SSRF (web) + cảnh báo localhost
[DONE] T-080 · [W1] Nhân bản profile, sắp xếp lại
[DONE] T-081 · [W0] NavPane nối dữ liệu thật (lazy load)
[DONE] T-082 · [W1] Trạng thái empty/loading/error cho toàn bộ luồng kết nối
```
Mỗi task: SPEC-01 FR tương ứng; `✅` theo tiêu chí chấp nhận §12 của SPEC-01.

# E-006 · Điều hướng & Objects (SPEC-02)  `[W0-W2]`

```
[DONE] T-085 · [W0] introspect.* methods
[DONE] T-086 · [W0] Introspector cho PG/MySQL/SQLite (truy vấn gộp, không N+1)
[DONE] T-087 · [W1] Cache metadata trên đĩa (msgpack) + TTL + fingerprint
[DONE] T-088 · [W1] schema.invalidated topic + invalidateQueries phía client
[DONE] T-089 · [W1] Objects List view ảo hoá (5000 object)
[DONE] T-090 · [W2] Objects Detail view + ColumnChooser
[DONE] T-091 · [W1] Tìm kiếm lọc trong cây và trong Objects tab
[DONE] T-092 · [W1] InfoPane tab General (dữ liệu thật)
[DONE] T-093 · [W1] InfoPane tab DDL (introspect.ddl + syntax highlight + Ctrl+F)
[DONE] T-094 · [W2] InfoPane tab Dependencies (Using / Used By)
[DONE] T-095 · [W1] introspect.identifiers + cache cho code completion
[DONE] T-096 · [W2] ObjectContextMenu theo capability + quyền
[DONE] T-097 · [W1] Copy tên object đã quote đúng dialect
[DONE] T-098 · [W2] Virtual grouping cho object
```

# E-007 · DataGrid (ADR-0005)  `[W1]`

```
[DONE] T-030 · [W1] DataGrid: ảo hoá hàng + cột, resize, chọn vùng
        ✅ 1M dòng ≥ 55 fps (benchmark trong CI); resize ≤ 16 ms/frame
[DONE] T-031 · [W1] CellEditor: 12 kiểu (text, memo, số, bool 3 trạng thái, date/time, enum, set,
        json, xml, blob/hex/image, uuid, array)
        ✅ round-trip đúng mọi kiểu (dùng lại C4)
T-032 · [W1] Nạp tăng dần từ AsyncIterable<ResultChunk> + ring buffer 200k
[DONE] T-033 · [W1] Copy/paste: TSV, INSERT, UPDATE, JSON, Markdown (chạy trong Web Worker)
        ✅ copy 100k cell ≤ 1 s
T-034 · [W1] Benchmark grid trong CI, cảnh báo khi tụt fps
[DONE] T-035 · [W2] Ẩn/hiện cột, đóng băng N cột đầu, lưu theo (connection, bảng)
[DONE] T-036 · [W2] Renderer NULL / chuỗi rỗng / BLOB / missing (Mongo) phân biệt trực quan
[DONE] T-037 · [W1] Điều hướng bàn phím + ARIA role
[DONE] T-038 · [W2] Find/Replace trong grid
[DONE] T-039 · [W1] NavigationBar (first/prev/next/last page & record, limit setting)
```

# E-008 · Data Editor (SPEC-03)  `[W1-W2]`

```
[DONE] T-100 · [W1] data.browse (stream) + FilterExpr AST → SQL
[DONE] T-101 · [W1] data.previewChanges / applyChanges + preview-token
[DONE] T-102 · [W1] Optimistic locking (expected values → WHERE)
[DONE] T-103 · [W1] Thứ tự áp dụng DELETE → UPDATE → INSERT trong transaction
[DONE] T-104 · [W1] Bảng không PK: đọc được, không sửa, banner
[DONE] T-105 · [W1] tx.begin/commit/rollback + TransactionBar + timeout 10 phút
[DONE] T-106 · [W1] FilterPanel nối logic thật (builder + text mode + preview SQL)
[DONE] T-107 · [W2] Filter nhanh từ giá trị cell
[DONE] T-108 · [W1] Sort server-side theo header click
[DONE] T-109 · [W1] Set NULL / Set Empty String (2 hành động riêng)
[DONE] T-110 · [W2] FormView
[DONE] T-111 · [W4] Foreign-key data selection
[DONE] T-112 · [W4] Table Profile (lưu filter/sort/cột/độ rộng)
[DONE] T-113 · [W2] Sửa nhiều cell cùng lúc
[DONE] T-114 · [W2] data.count chính xác (tuỳ chọn) + estimateRowCount mặc định
[DONE] T-115 · [W1] SqlPreviewDialog dùng chung
[DONE] T-116 · [W1] ConflictDialog (mine ↔ theirs ↔ overwrite/skip)
[DONE] T-117 · [W2] Định dạng date/time theo setting
[DONE] T-118 · [W2] Cell editor lớn (panel/dialog) cho memo/json/xml/hex/image
```

# E-009 · SQL Editor (SPEC-04)  `[W1-W2]`

```
[DONE] T-040 · [W1] SqlEditor (CodeMirror 6) + corvusTheme buộc vào biến CSS
[DONE] T-041 · [W2] Extension completion từ introspect.identifiers (debounce + cache)
[DONE] T-042 · [W2] Extension diagnostics từ CorvusError.position
[DONE] T-043 · [W1] Bảng phím tắt editor
[DONE] T-044 · [W1] splitStatements cho PG/MySQL/SQLite + golden 60 case/dialect
        ✅ đủ 8 trường hợp khó ở SPEC-04 §6
[DONE] T-045 · [W1] query.execute + nhiều result set + ResultTabs
[DONE] T-046 · [W1] MessagesPanel (notice, warning, affected rows theo statement)
[DONE] T-047 · [W1] Huỷ query (Esc / nút Stop) ≤ 200 ms
[DONE] T-048 · [W1] Guard read-only + cảnh báo DELETE/UPDATE không WHERE
[DONE] T-049 · [W1] Query history: ghi + tìm kiếm + panel
[DONE] T-120 · [W2] query.format / minify + tuỳ chọn
[DONE] T-121 · [W2] Find/Replace trong editor (regex, whole word, match case)
[DONE] T-122 · [W2] Folding, brace highlight, word wrap, zoom
[DONE] T-123 · [W2] Lưu query vào workspace + mở/lưu file ngoài qua FileGateway
[DONE] T-124 · [W4] Query parameters (:name) + ParamPrompt
[DONE] T-125 · [W4] Snippets (built-in + custom + placeholder)
[DONE] T-126 · [W3] query.explain + ExplainTree + tô node đắt nhất
[DONE] T-127 · [W2] Draft tự lưu, giữ qua khởi động lại
```

# E-010 · Object Designer (SPEC-06)  `[W2-W3]`

```
[DONE] T-140 · [W2] TableDesign schema + FieldDesign có id bền vững
[DONE] T-141 · [W2] DdlGenerator.createTable cho 3 engine
[DONE] T-142 · [W2] DdlGenerator.alterTable — thuật toán diff theo id
        ✅ golden file 40 kịch bản × 3 engine
[DONE] T-143 · [W2] Cảnh báo DDL: mất dữ liệu, rebuild, khoá bảng, NOT NULL violation
[DONE] T-144 · [W2] SQLite recreate-table 12 bước
        ✅ dữ liệu, index, trigger, view được giữ (integration)
[DONE] T-145 · [W2] FieldGrid + typeCatalog dropdown
[DONE] T-146 · [W2] IndexTab, ForeignKeyTab, CheckTab, OptionTab
[DONE] T-147 · [W3] TriggerTab + editor body
[DONE] T-148 · [W2] ddl.previewTable / applyTable + PreviewStore
[DONE] T-149 · [W2] DropObjectDialog (gõ tên + hiện dependencies)
[DONE] T-150 · [W2] ViewDesigner
[DONE] T-151 · [W3] RoutineDesigner (tham số, body, security, determinism)
[DONE] T-152 · [W3] ddl.maintain theo capability
[DONE] T-153 · [W2] Xử lý DDL_PARTIAL_FAILURE (dialog nêu trạng thái)
[DONE] T-154 · [W2] Read-only → designer chỉ đọc
```

# E-011 · Job & File  `[W3]`

```
[DONE] T-050 · [W3] FileGateway interface + 2 hiện thực
[DONE] T-051 · [W3] Upload theo chunk có resume + dọn file tạm (web)
[DONE] T-052 · [W1] Cảnh báo localhost ở dialog kết nối (web)
T-054 · [W5] Tray mode desktop + cảnh báo lịch
[DONE] T-055 · [W3] JobRunner trong worker thread + progress + log file + huỷ
[DONE] T-056 · [W3] JobProgressPanel + job.log stream (tail)
[DONE] T-057 · [W3] Khoá theo target: 2 job không cùng ghi một bảng
[DONE] T-058 · [W3] Khởi động lại → job đang chạy → failed/INTERRUPTED, không tự chạy lại
```

# E-012 · Import / Export (SPEC-08)  `[W3]`

```
[DONE] T-250 · [W3] WizardShell dùng chung (Back/Next/Save profile/Start)
[DONE] T-251 · [W3] import.analyze (đọc phần đầu file, suy luận kiểu, preview 100 dòng)
[DONE] T-252 · [W3] Parser CSV/TSV/TXT delimited + fixed-width
[DONE] T-253 · [W3] Parser JSON (stream-json) + XML (sax)
T-254 · [W3] Parser XLSX (exceljs streaming)
[DONE] T-255 · [W3] decodeStream đa encoding + BOM
[DONE] T-256 · [W3] FieldMappingGrid (Smart/Direct/Unmatch)
[DONE] T-257 · [W3] 5 import mode → SQL
[DONE] T-258 · [W3] Đường nhanh: PG COPY FROM STDIN, MySQL extended insert, MSSQL bulk
T-259 · [W3] Import job pipeline + tiến trình theo byte + log lỗi từng dòng
[DONE] T-260 · [W3] Export: 9 formatter stream
T-261 · [W3] Export nhiều object (file riêng / gộp / XLSX nhiều sheet)
[DONE] T-262 · [W3] tool_profile lưu/nạp cấu hình
[DONE] T-263 · [W3] ImportWizard 6 bước UI
[DONE] T-264 · [W3] ExportWizard 5 bước UI
[DONE] T-265 · [W3] Copy/Delete mode qua preview
```

# E-013 · Backup / Restore (SPEC-10)  `[W3]`

```
[DONE] T-320 · [W3] Định dạng file backup + header metadata + file .meta checksum
T-321 · [W3] Backup job: thứ tự object, index/FK ở cuối, stream ra file
T-322 · [W3] Nén gzip/zstd + verify sau khi ghi
T-323 · [W3] backup.list đọc header (không đọc cả file)
[DONE] T-324 · [W3] restore.preview: willDrop + currentRows + compatibility
[DONE] T-325 · [W3] Restore job: đọc stream, splitStatements, transaction nếu có
[DONE] T-326 · [W3] Extract SQL từ file backup
T-327 · [W5] Wrapper mysqldump/pg_dump khi có sẵn
[DONE] T-328 · [W3] BackupView nối logic thật + BackupHistoryGrid
[DONE] T-329 · [W3] RestoreWizard
T-330 · [W3] Xử lý DISK_FULL, BACKUP_CORRUPT, RESTORE_PARTIAL
```

# E-014 · Query Builder & Diagram  `[W4]`

```
[DONE] T-200 · [W4] QueryModel + buildSelect(model, dialect) + golden 30 case/dialect
T-201 · [W4] DiagramCanvas dùng chung (React Flow) + autoLayout (elkjs)
[DONE] T-202 · [W4] BuilderCanvas + TableNode + JoinEdge
[DONE] T-203 · [W4] ClauseTabs: FROM/SELECT/WHERE/GROUP BY/HAVING/ORDER BY
[DONE] T-204 · [W4] Join tự sinh theo FK + đổi loại join
T-205 · [W4] Subquery trong FROM và WHERE
[DONE] T-206 · [W4] SqlPreviewPane realtime + cảnh báo ghi đè
[DONE] T-220 · [W4] ErView: introspect toàn schema + layout + render
[DONE] T-221 · [W4] Lưu vị trí node theo (connection, schema)
[DONE] T-222 · [W4] Ngưỡng 150 bảng → dialog chọn tập bảng
[DONE] T-223 · [W4] Tạo/sửa/xoá FK từ canvas (qua preview-token)
[DONE] T-224 · [W4] Export PNG/SVG
```

# E-015 · Automation (SPEC-11)  `[W5]`

```
[DONE] T-350 · [W5] batch_job + schedule + job_run schema + CRUD methods
T-351 · [W5] Batch job runner (tuần tự, continueOnError, huỷ)
[DONE] T-352 · [W5] Scheduler (node-cron) + timezone + hot reload
T-353 · [W5] Leader election qua schedule_lock (web nhiều instance)
T-354 · [W5] Bỏ qua lần bắn chồng + ghi log
[DONE] T-355 · [W5] Notify: SMTP (nodemailer) + webhook HMAC + sendTest
[DONE] T-356 · [W5] BatchJobEditor + StepPicker (kéo thả)
[DONE] T-357 · [W5] CronBuilder + diễn giải bằng chữ + 5 lần chạy kế tiếp
[DONE] T-358 · [W5] RunHistoryGrid + LogViewer (tail, tìm, tải về)
T-359 · [W5] apps/cli: corvus run-job + exit code + stdout log
T-360 · [W5] Xoay vòng lịch sử chạy
```

# E-016 · Server Security (SPEC-12)  `[W5]`

```
[DONE] T-380 · [W5] SecurityProvider interface + privilegeCatalog
[DONE] T-381 · [W5] Hiện thực cho PG / MySQL / MSSQL
[DONE] T-382 · [W5] security.users / .roles / .privileges
[DONE] T-383 · [W5] previewUser / applyUser (mật khẩu che khi hiển thị + comment giải thích)
[DONE] T-384 · [W5] previewGrant / applyGrant
[DONE] T-385 · [W5] UsersDialog nối logic thật
[DONE] T-386 · [W5] UserDesigner render từ driver.userDesignSchema
[DONE] T-387 · [W5] RoleDesigner
[DONE] T-388 · [W5] PrivilegeMatrix (3 trạng thái: gán / không / thừa hưởng)
[DONE] T-389 · [W5] Cảnh báo tác động vào chính mình / user hệ thống
T-390 · [W5] security-password-leak.test.ts
```

# E-017 · Monitoring (SPEC-13 monitor)  `[W5]`

```
[DONE] T-400 · [W5] monitor.processes (stream, interval, đánh dấu dòng thay đổi)
[DONE] T-401 · [W5] monitor.killProcess qua preview
[DONE] T-402 · [W5] monitor.variables + previewSetVariable
[DONE] T-403 · [W5] monitor.status + highlight chỉ số thay đổi
[DONE] T-404 · [W5] ServerMonitorView + auto refresh + huỷ stream khi rời view
[DONE] T-405 · [W4] search.findInSchema (job, data + structure, 4 mode)
```

# E-018 · Multi-user web  `[W5]`

```
[DONE] T-410 · [W5] AuthContext: SingleUserAuth + MultiUserAuth
T-411 · [W5] Local account (argon2id) + OIDC
T-412 · [W5] RBAC 5 role + connection ACL
T-413 · [W5] Cookie + CSRF + session xoay 8 giờ
[DONE] T-414 · [W5] audit_log + ghi theo mức khai báo trong contract
[DONE] T-415 · [W5] LoginView + xử lý session hết hạn
[DONE] T-416 · [W5] Quản lý user Corvus (admin UI)
```

# E-019 · Shell & Settings (SPEC-15)  `[W0-W6]`

```
[DONE] T-470 · [W2] TabManager + useTabStore: tab thật có state riêng
[DONE] T-471 · [W2] Khôi phục tab sau khởi động (3 chế độ onStartup)
T-472 · [W2] Hợp nhất i18n: bỏ tr(), mọi chuỗi vào dictionary theo namespace
        ✅ CI fail khi thiếu khoá ở bất kỳ ngôn ngữ nào
[DONE] T-473 · [W2] Settings đầy đủ 7 mục + DEFAULT_CONFIG một chỗ duy nhất
[DONE] T-474 · [W2] CommandPalette: fuzzy search + nguồn thật (workspace.paletteSearch)
[DONE] T-475 · [W2] Pane maximize/restore
[DONE] T-476 · [W6] Focus mode
[DONE] T-477 · [W6] ShortcutEditor + phát hiện xung đột
[DONE] T-478 · [W4] Favorites (Ctrl+1..9) + Share via URI
[DONE] T-479 · [W1] ConnectionLostBanner + tự nối lại
T-480 · [W3] Contract version check → 426 → màn hình tải lại trang
[DONE] T-481 · [W5] Cảnh báo thoát khi có job/transaction
[DONE] T-482 · [W6] Deep link corvus:// (desktop)
T-483 · [W3] Lazy load view nặng (ModelView, BiView, PipelineBuilder, ExplainTree)
        ✅ bundle initial ≤ 900 KB gzip
[DONE] T-484 · [W3] app.checkUpdate + không tự cài khi có job chạy
[DONE] T-485 · [W2] Trạng thái empty/loading/error/unsupported chuẩn hoá thành component dùng chung
[DONE] T-486 · [W2] Format số/ngày/dung lượng theo locale
```

# E-020 · Đóng gói & Phát hành  `[W3]`

```
[DONE] T-500 · [W3] Dockerfile nhiều tầng + docker-compose mẫu + healthcheck
[DONE] T-501 · [W3] Biến môi trường + từ chối start khi thiếu CORVUS_MASTER_KEY
[DONE] T-502 · [W3] electron-builder.yml + NSIS + portable
T-503 · [W1] Mua và thiết lập chứng chỉ EV Code Signing (bắt đầu SỚM)
T-504 · [W3] Ký số trong CI + verify bằng signtool
T-505 · [W3] electron-updater + feed generic + kênh stable/beta
[DONE] T-506 · [W3] release.yml: build 3 artifact, ký, publish, changelog
[DONE] T-507 · [W3] integration.yml nightly: testcontainers ma trận engine × version
[DONE] T-508 · [W3] security.yml weekly: pnpm audit + trivy + license check
T-509 · [W3] Smoke test sau đóng gói (native module load được)
```

---

## Wave 6–9

Task cho W-6 … W-9 được viết chi tiết **khi wave đó bắt đầu**, theo cùng khuôn mẫu. Viết trước
36 tuần là vô nghĩa — SPEC sẽ thay đổi theo phản hồi từ beta. Mã task dự trữ:

| Wave | Dải mã | Epic |
|---|---|---|
| W-6 | T-290…T-349, T-600…T-649 | Transfer/Sync, Model, DataGen, DataDict, driver MSSQL |
| W-7 | T-420…T-449, T-650…T-699 | MongoDB, Redis, Corvus Agent, macOS/Linux |
| W-8 | T-450…T-469, T-700…T-749 | AI, Profiling, driver Oracle, Console |
| W-9 | T-750…T-799 | BI, Collaboration, làm cứng |

---

## Thứ tự thực thi khuyến nghị cho W-0

Đường tới hạn (critical path) — làm đúng thứ tự này để không bị chặn:

```
T-001 ─┬─ T-010 ─┬─ T-014 ── T-005 (UI chạy trên mock, frontend không bị chặn)
       │         ├─ T-012 ─┬─ T-006 ── T-007
       │         ├─ T-013 ─┘
       │         ├─ T-018 ── T-019 ── T-029c
       │         └─ T-020 ── T-021 ── T-022 ─┬─ T-023
       │                                      ├─ T-024
       │                                      └─ T-024b
       ├─ T-002 ── T-003, T-004, T-011
       ├─ T-008 ── T-009
       └─ T-025 ─┬─ T-026, T-028
                 └─ T-029b ── T-029c

Sau đó: T-070…T-082 (kết nối), T-085…T-086 (introspect)
```

**Việc song song được ngay từ ngày 1**: `T-014` (mock) mở đường cho frontend làm UI trong khi
backend làm driver. Đây là lý do `transport-mock` phải xong sớm.
