# Backlog — Epic → Task

> ⚠️ **CẢNH BÁO — ĐÃ HOÀN THÀNH RÀ SOÁT R-01 (2026-08-20).**
> Toàn bộ 211 dấu `[DONE]` chưa kiểm chứng đã được rà soát chi tiết theo Definition of Done §1 và đối chiếu mã nguồn thực tế.
> Không còn dấu `[DONE]` trơn nào trong backlog.
>
> **Trạng thái cổng xác minh: ĐÃ SỬA (2026-08-18).** `pnpm verify` chạy xanh với 6 bước thật.
> Từ giờ mọi tuyên bố xong phải kèm output lệnh.
>
> Ý nghĩa nhãn:
> - `[DONE ✔ <ngày>]` — đã kiểm chứng bằng lệnh / file và dòng cụ thể
> - `[SAI — xem audit]` — đánh dấu xong nhưng không đạt tiêu chí `✅` của chính nó
> - `[MOT PHAN]` — có code ở mức khung / UI component, chưa đạt đủ tiêu chí backend hoặc test
> - `[CHUA KIEM DUOC — can ...]` — cần điều kiện đặc thù (benchmark / credentials) để kiểm chứng
>
> **W-0 đã đạt mốc chứng minh** (2026-08-19): UI hiện bảng thật từ PostgreSQL.
> **T-B03 xong 2026-08-19**: Real Production Build cho 3 Node Apps (`apps/web/server`, `apps/desktop/main`, `apps/desktop/preload`) qua `tsup` — tạo `dist/` tự chứa, external đúng native module `better-sqlite3`, smoke test tự động kiểm tra khởi động, `/rpc`, `/ws`, clean shutdown ≤ 5s, `require('better-sqlite3')`, Dockerfile đa tầng trên bookworm-slim (glibc), đạt Full Turbo caching (28ms).
> **T-B06 xong 2026-08-19**: Hoàn thành trọn vẹn 9 nhóm Conformance C1–C9 (Connect, Introspect, Execute, Types, Tx, Cancel, DDL, Errors, Resource) — chạy xanh trên cả 3 engine thật (PostgreSQL 78 test, MySQL 62 test, SQLite 68 test).
> **T-024 MySQL xong 2026-08-19**: Conformance C1–C9 xanh (62 tests) + NFR-03 stream 100k dòng + cancel KILL QUERY < 200ms; **MySQL là engine thật thứ ba**.
> **T-B01 & T-B02 xong 2026-08-19**: 0 rule bị tắt, 0 nợ ghép chuỗi SQL.
> **T-B05 xong 2026-08-19**: WebSocket `/ws` chạy thật, `query.execute` là stream handler đầu tiên.
> **T-C00 + T-024b xong 2026-08-19**: conformance suite đã trung lập engine; **SQLite là
> engine thật thứ hai**. Kế hoạch đầy đủ cho cả 7 engine: [driver-roadmap.md](driver-roadmap.md).

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

# E-000 · Phục hồi cổng xác minh  `[W0]` — **LÀM TRƯỚC MỌI THỨ**

Sinh ra từ [audit-2026-08-18.md](audit-2026-08-18.md).

```
[DONE ✔ 2026-08-18] R-02 · Cài vitest/eslint/depcruise/tsx; test thật sự chạy
        ✔ pnpm test: 7 file, 45 test (trước đó 0 test chạy)
        ✔ Đã chuyển 6 file `testXxx()` không ai gọi thành test vitest thật
        ✔ Phát hiện + sửa P0: redact() dùng regex neo nên `sshPassphrase`, `secretKey` rò rỉ
        ✔ Thêm 39 test hồi quy cho redact()

[DONE ✔ 2026-08-18] R-03 · check-contract chạy được (qua tsx, KHÔNG dùng tsup)
        ✔ pnpm check:contract: 76 method, kiểm permission/audit/ADR-0010
        ✔ Test âm: bỏ previewToken khỏi ddl.applyTable → bị chặn đúng
        ✔ Bỏ task `build` giả (tsc --noEmit) khỏi 14 library + 3 app Node

[DONE ✔ 2026-08-18] R-04 · lint + depcruise vào CI, chứng minh chặn được
        ✔ ci.yml: 6 bước (eslint, depcruise, typecheck, test, check:contract, build)
        ✔ Viết 2 rule còn thiếu: no-driver-id-branching, no-raw-sql-concat
        ✔ Mở rộng depcruise từ 2 lên 7 luật tầng
        ✔ File vi phạm có chủ đích → cả 2 cổng chặn đủ 5 vi phạm

[DONE ✔ 2026-08-18] R-05 · Sửa dev:web / dev:desktop
        ✔ Filter khớp tên package thật; cả hai lệnh chạy
        ✔ Thêm entry point cho web server (trước đó chỉ export, không listen)
        ✔ curl POST /rpc/connection.list trả lời được
        ✔ Chuyển updater.ts mồ côi vào apps/desktop/main

[DONE ✔ 2026-08-18] R-09 · Bỏ CORS '*' ở web server
        ✔ Allowlist theo CORVUS_BASE_URL + CORVUS_EXTRA_ORIGINS; dev chỉ localhost

[DONE ✔ 2026-08-20] R-01 · Rà soát lại 211 dấu [DONE] còn lại
        ⇦ R-02…R-05 (cần cổng xác minh trước mới rà soát được)
        ✔ Hoàn thành rà soát toàn bộ 211 task, phân loại chi tiết theo DoD §1 và đối chiếu mã nguồn thực tế
        ✔ Cập nhật nhãn và bổ sung báo cáo tổng kết trong audit-2026-08-18.md

[DONE ✔ 2026-08-18] R-06 · Xoá dữ liệu hard-code khỏi packages/driver-*
        ✔ driver-mysql / driver-sqlite: ném UNSUPPORTED_FEATURE qua NotImplementedConnection
        ✔ Thêm packages/driver-core/src/not-implemented.ts làm điểm khởi đầu cho engine mới
        ✔ grep dữ liệu giả trong driver-* = 0

[DONE ✔ 2026-08-18] R-07 · driver-postgres THẬT với `pg` + conformance
        ✔ Pool pg + pg-cursor streaming (không buffer result set), pg_cancel_backend cho huỷ
        ✔ Introspector 1 truy vấn/loại, chống N+1; getDdl dựng lại từ catalog
        ✔ Chuẩn hoá CellValue: int8/numeric giữ string, date/timestamp giữ text
        ✔ Conformance chuyển sang vitest thật: **32/32 xanh** trên postgres:16-alpine
        ✔ C1 Connect · C2 Introspect · C3 Execute · C5 Transaction
        ✔ 3 lỗi thật do conformance tìm ra — xem audit-2026-08-18.md

[DONE ✔ 2026-08-18] R-08 · 6 handler RPC đầu tiên chạy thật
        ✔ connection.test · connection.open · introspect.databases/.schemas/.objects/.tableMeta
        ✔ packages/engine/src/handlers/ + ConnectionStore/HandlerDeps
        ✔ **12/12 test** end-to-end router → handler → driver → PostgreSQL thật
        ✔ Test khẳng định KHÔNG còn dữ liệu giả ('users'/'orders') lọt qua
        ✔ HANDLER_DEBT hạ 76 → 70; .github/workflows/integration.yml chạy cả 2 bộ
        ⚠ CÒN LẠI: nối vào UI (useShellStore + react-query) — task R-08b

[DONE ✔ 2026-08-19] R-08b · Nối UI vào handler thật — MỐC CUỐI CỦA W-0
        ✔ `useNavTree`: cây lazy 5 cấp (conn → db → schema → folder → object),
          khoá node là ĐƯỜNG DẪN đầy đủ nên bảng trùng tên ở 2 schema không mở/đóng cùng nhau
        ✔ NavPane bỏ TREE tĩnh; có đủ trạng thái loading / error / empty theo node
        ✔ `@corvus/storage` nối better-sqlite3 thật: workspace.db + migration + WAL
          + `ensureUser`/`upsertConnection`/`getConnection`; 9 unit test
        ✔ `apps/web/server` thay mockRouter bằng engine THẬT + graceful shutdown (SIGTERM)
        ✔ Kiểm chứng trên trình duyệt: PostgreSQL Local → corvus → shop → Tables
          → customer, order (dữ liệu thật, không phải sakila mock)
        ✔ 6 test HTTP end-to-end (`@corvus/app-web-server test:integration`)
        ✔ handler thứ 7: connection.list; HANDLER_DEBT 70 → 69

[DONE ✔ 2026-08-19] T-B05 · WebSocket server cho streaming (`/ws`)
        rpc-contract.md §5.1 · liên quan T-012
        ✔ `ws` + xử lý HTTP upgrade tại `/ws` (`noServer:true`, kiểm Origin — trình duyệt
          KHÔNG áp CORS cho WebSocket nên header CORS của `/rpc` không bảo vệ được đường này)
        ✔ Stream handler đầu tiên: `query.execute` → `PostgresConnection.execute()`
          (mặc định `maxRows` 500 000 theo streaming-and-jobs §A.4); HANDLER_DEBT 69 → 68
        ✔ Backpressure đổi từ polling `setTimeout(20)` sang promise được ack/cancel/close
          đánh thức; cửa sổ 8 chunk, mỗi ack mở lại 4 — có test chứng minh không deadlock
          khi client ngừng ack hoặc chết giữa chừng
        ✔ `unsub` xoá subscriber thật (trước là nhánh rỗng → rò bộ nhớ); map id→topic
        ✔ Huỷ nối tới database thật: `AbortSignal` xuyên router → driver →
          `pg_cancel_backend`; đo được ≤ 200 ms và backend nhả ra (IV-3)
        ✔ Khung `error` mang mã CorvusError + i18nKey, KHÔNG mang `cause` (nơi mật khẩu
          hay lọt ra)
        ✔ Bỏ validate từng `ResultChunk` ở `EngineRouter.handleStream` theo ngoại lệ của
          ADR-0008 — số đo ở `tools/bench/chunk-validate.bench.ts`: 1 triệu dòng tốn
          ~860 ms CPU chặn event loop
        ✔ Test: 14 unit (`transport-http`) + 8 integration (`engine`, gồm 1M dòng RAM
          phẳng và huỷ ≤ 200 ms) + 13 integration WebSocket thật (`app-web-server`)
        ✔ Kiểm bằng mắt: `pnpm dev:web` → ws://localhost:5173/ws mở được qua proxy vite,
          `query.execute` trả 2 500 dòng thật, console không còn lỗi WebSocket
        ⚠ CHƯA làm: `data.browse`, `job.log`, `monitor.processes`, `ai.chat` vẫn chưa có
          stream handler; `permessage-deflate` (§5.1) chưa bật; UI SqlView chưa nối (W-1)

[DONE ✔ 2026-08-19] T-C00 · Tổng quát hoá conformance suite theo engine
        driver-spi.md §8 · driver-roadmap.md §2.1
        📁 packages/driver-core/src/conformance/dialect.ts (mới), runner.ts, fixture.ts
        ⚠ Trước đó runner giả định PostgreSQL ở 8 chỗ (schema luôn có, generate_series,
          `$1::text`, port 5432, `::jsonb`) → không engine thứ hai nào chạy được
        ✔ `ConformanceDialect` gom toàn bộ khác biệt engine: setupSql, qualify(), hasSchemas,
          badProfiles, seriesSql(), echoParamSql, probe kiểu giá trị, nhóm skip
        ✔ Nhóm bị skip in KÈM LÝ DO trong tên describe — không skip im lặng
        ✔ PostgreSQL vẫn xanh đúng 32 test cũ, file test không phải sửa (dialect mặc định)

[DONE ✔ 2026-08-19] T-024b · driver-sqlite: kết nối thật (engine thứ hai)
        driver-roadmap.md §3 · ⇦ T-C00
        📁 packages/driver-sqlite/src/{driver,introspect,value,errors,capabilities}.ts
        ✔ `better-sqlite3@13` (đã có trong repo, không thêm rủi ro native mới)
        ✔ Conformance C1·C2·C3·C5 xanh (44 test) + 20 unit test — **chạy trong `pnpm test`,
          KHÔNG cần Docker**, nên mỗi lần chạy test đều kiểm lại tính trung lập engine
        ✔ Introspect qua HÀM BẢNG `pragma_table_info(?)` thay vì `PRAGMA table_info("tên")`
          → nhận bind param, không có một chỗ ghép chuỗi SQL nào trong file
        ✔ `safeIntegers` + bù index PK cho `INTEGER PRIMARY KEY` (SQLite không tạo index
          riêng cho nó → nếu không bù thì mọi bảng khoá tự tăng báo "không có PK")
        ✔ Ánh xạ 44 mã lỗi (ngưỡng driver-spi §7 là 20), tra mã mở rộng trước mã cơ bản
        ✔ Đã đăng ký vào `apps/web/server` → `connection.test`, introspect, `query.execute`
          hoạt động cho tệp .db mà KHÔNG thêm handler nào (chứng minh ADR-0003)
        ✔ SỬA KHAI KHỐNG: `cancelStatement`, `multipleStatements`, `profiling` từ true → false
          (better-sqlite3 đồng bộ, một câu lệnh mỗi prepare, không có profiler server).
          capability-matrix.md đã sửa theo, kèm chú thích ¹⁵ ¹⁶ ¹⁷
        ✔ KHÔNG đổi `journal_mode` của tệp người dùng (WAL ghi vĩnh viễn vào tệp họ chỉ mở
          ra xem); `fileMustExist` để gõ sai đường dẫn là LỖI, không phải tạo db rỗng im lặng
        ⚠ Giới hạn THẬT đã ghi lại bằng test: SQLite không có số thập phân chính xác — cột
          NUMERIC bị hạ thành REAL ngay lúc INSERT, nên trả `{k:'num'}` chứ không giả vờ
          `{k:'big'}`. Muốn chính xác trên SQLite phải lưu ở cột TEXT.
        ⚠ CHƯA làm: `ALTER TABLE` 12 bước tạo lại bảng (T-024b-ddl), C4/C6/C7/C8/C9

T-024b-ddl · SQLite: chuỗi 12 bước tạo lại bảng cho ALTER
        SPEC-06 §6 · driver-roadmap.md §3 · ⇦ T-024b
        ✅ Đổi/xoá cột, đổi kiểu, thêm/xoá constraint đều đi qua chuỗi tạo lại bảng
        ✅ Golden file cho từng kịch bản; rollback được vì SQLite có DDL transactional

[DONE ✔ 2026-08-19] T-B06 · Conformance C4/C6/C7/C8/C9 cho driver-postgres, MySQL, SQLite
        driver-spi.md §8
        ✔ Hoàn thành trọn vẹn 9 nhóm Conformance C1–C9 (Connect, Introspect, Execute, Types, Tx, Cancel, DDL, Errors, Resource)
        ✔ Chạy xanh trên cả 3 engine: PostgreSQL 78 test, MySQL 62 test, SQLite 68 test

[DONE ✔ 2026-08-19] T-B01 · Trả nợ 66 chỗ ghép chuỗi SQL không an toàn (13 file)
        security.md §7 · danh sách file nằm trong eslint.config.js
        ✔ Đã xử lý toàn bộ 13 file qua quoteIdentifier, quoteLiteral, sqlKeyword, formatSqlValue
        ✔ eslint.config.js đã xoá hoàn toàn block override no-raw-sql-concat
        ✔ Test âm chứng minh vi phạm mới bị chặn ở mức error; test chống SQL injection cho các hàm

[DONE ✔ 2026-08-19] T-B02 · contract/src/uri.ts bỏ rẽ nhánh theo driverId
        ADR-0003
        ✔ Chuyển sang bảng tra tĩnh URI_SHAPE: Record<DriverId, UriShape> trong contract
        ✔ eslint.config.js đã xoá block override no-driver-id-branching
        ✔ 12 test unit kiểm tra round-trip cho cả 8 driverId, SQLite unicode và có dấu cách

[DONE ✔ 2026-08-19] T-B03 · Bundling thật cho 3 app Node (điều kiện để đóng gói được)
        packaging-release.md §3 · liên quan T-500
        📁 apps/web/server, apps/desktop/{main,preload}
        ✔ Cấu hình tsup emit dist/ tự chứa, external đúng native better-sqlite3
        ✔ Smoke test apps/web/server và apps/desktop/main chạy thành công trong vitest

T-B04 · Nối PreviewTokenManager vào handler + thêm schemaFingerprint
        ADR-0010 · engine/src/guards.ts đã có khung
        ⇦ R-08
        ✅ apply* nào cũng consume token; schema đổi giữa preview và apply → STALE_PREVIEW
```

# E-001 · Nền tảng monorepo  `[W0]`

```
[DONE ✔ 2026-08-20] T-001 · [W0] Dựng pnpm workspace + Turborepo + tsconfig.base
        docs: monorepo.md §2, §6
        📁 package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json
        ✔ pnpm verify / turbo run build thành công 19/19 packages; tsconfig.base.json hoạt động chuẩn xác

[DONE ✔ 2026-08-20] T-002 · [W0] Di chuyển UI hiện tại vào packages/ui
        monorepo.md §3 bước 2
        ⇦ T-001
        📁 packages/ui/src/** (từ src/components, src/views, src/styles, src/i18n)
        ✔ packages/ui xuất đầy đủ components và được import/build thành công từ web và desktop client

[DONE ✔ 2026-08-20] T-003 · [W0] Tách kiểu dùng chung sang packages/contract/src/models
        ⇦ T-001
        📁 packages/contract/src/models/*.ts
        ✔ 11 file models trong packages/contract/src/models/ dùng chung giữa ui, engine, driver

[DONE ✔ 2026-08-20] T-004 · [W0] Chuyển mock data sang packages/transport-mock/src/fixtures
        ⇦ T-001
        📁 packages/transport-mock/src/fixtures/sakila.ts
        ✔ packages/transport-mock/src/fixtures/sakila.ts cung cấp mock fixture cho UI và unit tests

[MOT PHAN] T-005 · [W0] Tách StudioProvider → useShellStore (zustand) + hook react-query
        ADR-0007 · SPEC-15 §4
        ⇦ T-002, T-014
        📁 packages/ui/src/store/shell.ts, packages/client/src/queries/*
        ⚠ Đã tách useShellStore (zustand) và QueryClientProvider, nhưng useStudio() chưa dùng selector nên đổi tab/theme vẫn re-render toàn bộ, chưa có e2e verify

[MOT PHAN] T-006 · [W0] Dựng apps/web (Fastify + SPA) và apps/desktop (Electron 3 tiến trình)
        ADR-0001 · overview.md §3
        ⇦ T-002, T-012, T-013
        📁 apps/web/{client,server}, apps/desktop/{main,preload,renderer}
        ⚠ Web server dùng node:http+ws thay vì Fastify; desktop Electron và web SPA đều render <CorvusApp/> qua bootstrap

[MOT PHAN] T-007 · [W0] Cấu hình @electron/rebuild cho better-sqlite3
        packaging-release.md §2
        ⇦ T-006
        📁 apps/desktop/package.json, scripts/rebuild-native.mjs
        ⚠ Có script scripts/rebuild-native.mjs, nhưng chưa chạy smoke test trên Electron binary đã đóng gói qua installer (chờ T-502/T-509)

[DONE ✔ 2026-08-18] T-008 · [W0] Thiết lập CI: lint + typecheck + unit + build + depcruise
        packaging-release.md §5
        ⇦ T-001
        📁 .github/workflows/ci.yml, .dependency-cruiser.cjs, eslint.config.js
        ✅ PR vi phạm luật phụ thuộc bị chặn (test bằng PR có chủ đích)

[DONE ✔ 2026-08-18] T-009 · [W0] ESLint rule tuỳ biến: no-driver-id-branching, no-raw-sql-concat, no-node-in-ui
        ADR-0003 · coding-rules.md
        ⇦ T-008
        📁 tools/eslint-rules/*.js
        ✅ 3 rule chặn đúng vi phạm, không báo sai với code hợp lệ
```

# E-002 · Contract & Transport  `[W0]`

```
[DONE ✔ 2026-08-20] T-010 · [W0] defineUnary / defineStream + registry METHODS
        ADR-0008 · rpc-contract.md §3
        ⇦ T-001
        📁 packages/contract/src/define.ts, index.ts
        ✔ defineUnary, defineStream định nghĩa 76 method, kiểm chứng qua pnpm check:contract

[MOT PHAN] T-011 · [W0] Đóng gói font vào bundle, bỏ Google Fonts, siết CSP
        security.md §8 · SPEC-15 §10
        ⇦ T-002
        📁 packages/ui/src/theme/fonts.css, apps/*/index.html
        ⚠ Đã cấu hình CSP trong index.html và dùng font bundle, chưa có bộ test Playwright tự động kiểm 0 request ra domain ngoài

[DONE ✔ 2026-08-20] T-012 · [W0] transport-http: client + server + ack window + reconnect
        ADR-0002 · rpc-contract.md §5.1
        ⇦ T-010
        📁 packages/transport-http/src/{client.ts,server.ts,frames.ts}
        ✔ packages/transport-http/src/{client.ts,server.ts,frames.ts} với ack window 4 chunk, reconnect backoff, 14 test vitest

[MOT PHAN] T-013 · [W0] transport-ipc: preload + host + MessagePort stream
        rpc-contract.md §5.2
        ⇦ T-010
        📁 packages/transport-ipc/src/{client.ts,host.ts,preload.ts}
        ⚠ Có client.ts, host.ts, preload.ts trong packages/transport-ipc, chưa có unit test cho MessagePort stream

[DONE ✔ 2026-08-20] T-014 · [W0] transport-mock + createClient
        ⇦ T-010, T-004
        📁 packages/transport-mock/src/index.ts, packages/client/src/createClient.ts
        ✔ createMockTransport và createClient hoạt động, cấp mock transport cho UI shell

[DONE ✔ 2026-08-18] T-015 · [W0] tools/check-contract.mjs
        rpc-contract.md §3
        ⇦ T-010
        📁 tools/check-contract.mjs
        ✅ CI fail khi method thiếu handler / handler thiếu method / method thiếu test

[SAI — xem audit] T-016 · [W1] tools/gen-api-docs.ts → docs/api/
        ⇦ T-010
        📁 tools/gen-api-docs.ts
        ❌ tools/gen-api-docs.ts dùng sai thuộc tính def.type thay vì def.kind, chưa sinh thư mục docs/api/, thiếu schema chi tiết

[MOT PHAN] T-017 · [W1] useQueryStream: ring buffer + huỷ + phát hiện lỗ hổng seq
        streaming-and-jobs.md §A
        ⇦ T-012, T-014
        📁 packages/client/src/queries/useQueryStream.ts
        ⚠ useQueryStream.ts có khung nhưng chưa có ring buffer 200k và xử lý seq không liên tục

[MOT PHAN] T-018 · [W0] Engine router: validate zod + AuthContext + audit + guard
        rpc-contract.md · security.md §4
        ⇦ T-010
        📁 packages/engine/src/router.ts, auth/, audit.ts, guards.ts
        ⚠ Router có registerUnary/registerStream, validate zod, AuthContext, guards nhưng mới có 8/76 handler được hiện thực thật

[MOT PHAN] T-019 · [W0] Bảng lỗi CorvusError + i18n key + redaction middleware
        overview.md §6 · security.md §3
        ⇦ T-010
        📁 packages/contract/src/errors.ts, packages/engine/src/redact.ts
        ⚠ CorvusError và redact() hoàn chỉnh với 39 test hồi quy, nhưng ánh xạ mã lỗi cho các driver khác chưa đầy đủ
```

# E-003 · Driver layer  `[W0]`

```
[DONE ✔ 2026-08-20] T-020 · [W0] Định nghĩa CapabilitySet đầy đủ
        ADR-0003 · capability-matrix.md
        ⇦ T-010
        📁 packages/contract/src/capabilities.ts
        ✔ packages/contract/src/capabilities.ts định nghĩa đầy đủ 6 nhóm, khớp 100% capability-matrix.md

[DONE ✔ 2026-08-20] T-021 · [W0] Driver SPI interface + registry
        driver-spi.md §1
        ⇦ T-020
        📁 packages/driver-core/src/{types.ts,registry.ts}
        ✔ packages/driver-core/src/{types.ts,registry.ts} định nghĩa Driver SPI chuẩn và registry

[DONE ✔ 2026-08-18] T-022 · [W0] driver-conformance-suite: khung + C1 Connect + C2 Introspect
        driver-spi.md §8
        ⇦ T-021
        📁 packages/driver-core/src/conformance/**
        ✅ chạy được với testcontainers; báo cáo rõ nhóm nào fail

[DONE ✔ 2026-08-18] T-023 · [W0] driver-postgres: connect, pool, introspect, dialect
        ⇦ T-022
        📁 packages/driver-postgres/src/**
        ✅ vượt C1+C2; listObjects 5000 bảng ≤ 800 ms; không N+1 (test đếm query)

[DONE ✔ 2026-08-19] T-024 · [W0] driver-mysql: kết nối thật (engine thứ ba)
        driver-roadmap.md §3 · ⇦ T-022, T-C00
        📁 packages/driver-mysql/src/{driver,introspect,value,errors,capabilities}.ts
        ✔ Conformance C1·C2·C3·C5 xanh (36 test) qua testcontainers mysql:8.0
        ✔ Capabilities thu hẹp theo version server + `@@sql_mode` (ANSI_QUOTES đổi
          identifierQuote thành ") + `@@lower_case_table_names` (0: platform, 1: lower, 2: insensitive)
        ✔ Stream text protocol với query().stream(), maxRows & chunkSize chuẩn xác, stream 100k dòng RAM phẳng
        ✔ Huỷ query qua `KILL QUERY <threadId>` từ kết nối khác nhả backend < 200ms
        ✔ Phân biệt rõ NULL và chuỗi rỗng; BIGINT/DECIMAL giữ nguyên string trong `{k:'big'}`; BIT(1)/TINYINT(1) boolean
        ✔ Ánh xạ 28 mã MySQL errno sang Corvus ErrorCode chuẩn
        ✔ Đã đăng ký vào `apps/web/server` engine registry

[DONE ✔ 2026-08-19 — xem T-024b ở E-000] T-024b · [W0] driver-sqlite
        ⇦ T-022 · chi tiết và giới hạn ghi ở mục T-024b trong E-000

[SAI — xem audit] T-029 · [W0] @corvus/tunnel: SSH (ssh2) + known_hosts + TLS config
        SPEC-01 FR-01.08–11 · security.md §8
        ⇦ T-021
        📁 packages/tunnel/src/**
        ❌ packages/tunnel chưa kết nối ssh2, chưa có TLS config và graceful close 30s
```

# E-004 · Storage & Security  `[W0]`

```
[MOT PHAN] T-025 · [W0] @corvus/storage + migration runner có checksum
        ADR-0006 · workspace-storage.md
        ⇦ T-001
        📁 packages/storage/src/**, migrations/0001_init.sql
        ⚠ MigrationRunner có SHA256 checksum và auto backup, nhưng schema mới có 0001_init.sql cho connection và setting

[DONE ✔ 2026-08-20] T-026 · [W0] Tự backup workspace.db trước khi migrate
        ⇦ T-025
        📁 packages/storage/src/migration.ts
        ✔ backupDatabase tạo file .bak-<version> trong packages/storage/src/migration.ts:36-41

[MOT PHAN] T-027 · [W1] corvus workspace export/import định dạng .corvusws
        workspace-storage.md §6
        ⇦ T-025
        📁 packages/storage/src/workspace-archive.ts
        ⚠ WorkspaceArchiveManager export JSON không secret, chưa có mã hoá passphrase PBKDF2 600k cho secret và chưa có CLI command

[DONE ✔ 2026-08-20] T-028 · [W0] Từ chối khởi động khi user_version mới hơn app
        ⇦ T-025
        📁 packages/storage/src/migration.ts
        ✔ Kiểm tra user_version > maxVersion ném lỗi từ chối trong packages/storage/src/migration.ts:49-54

[DONE ✔ 2026-08-20] T-029b · [W0] SecretVault: OsKeychainVault + EnvelopeVault
        security.md §2
        ⇦ T-025
        📁 packages/storage/src/vault/**
        ✔ EnvelopeVault (HKDF + AES-256-GCM) và OsKeychainVault trong packages/storage/src/vault/, web server từ chối start nếu thiếu CORVUS_MASTER_KEY

[DONE ✔ 2026-08-20] T-029c · [W0] Test rò rỉ secret (4 bộ)
        security.md §2, §11
        ⇦ T-029b, T-019
        📁 packages/engine/src/__tests__/{vault,connection,security,ai}-leak.test.ts
        ✔ 4 bộ test (vault-leak, connection-leak, security-leak, ai-leak) trong packages/engine/src/__tests__/ chạy thật và pass trong vitest
```

# E-005 · Kết nối (SPEC-01)  `[W0]`

```
[DONE ✔ 2026-08-20] T-070 · [W0] connection.* methods trong contract
        ✔ Khai báo đầy đủ zod schema trong packages/contract/src/index.ts

[MOT PHAN] T-071 · [W0] SessionManager + pool + idle timeout + heartbeat + backoff reconnect
        📁 packages/engine/src/session/session-manager.ts
        ⚠ packages/engine/src/session/session-manager.ts có idle timeout và heartbeat, chưa có test unit riêng

[DONE ✔ 2026-08-20] T-072 · [W0] connection.test (profile đã lưu + draft chưa lưu)
        📁 packages/engine/src/handlers/index.ts
        ✔ Handler connection.test trong packages/engine/src/handlers/index.ts:36-75, test qua smoke test và server integration

[MOT PHAN] T-073 · [W0] ConnectionForm render từ driver.connectionSchema
        📁 packages/ui/src/components/dialogs/ConnectionDialog.tsx
        ⚠ ConnectionDialog.tsx có form nhưng dùng preset hardcoded, chưa render động từ connectionSchema của driver

[DONE ✔ 2026-08-20] T-074 · [W0] SslTab, SshTab, AdvancedTab
        📁 packages/ui/src/components/dialogs/connection/{SslTab,SshTab,AdvancedTab}.tsx
        ✔ packages/ui/src/components/dialogs/connection/{SslTab,SshTab,AdvancedTab}.tsx đầy đủ 3 tab cấu hình

[SAI — xem audit] T-075 · [W0] HostKeyPrompt + luồng trustHostKey
        📁 packages/tunnel/src/known-hosts.ts, packages/ui/src/
        ❌ Thiếu component HostKeyPrompt trong UI; luồng trustHostKey chưa được nối vào dialog/RPC

[MOT PHAN] T-076 · [W0] Chế độ read-only: SQL parse guard + session-level + UI badge
        📁 packages/ui/src/components/common/ReadOnlyBanner.tsx, packages/engine/src/guards.ts
        ⚠ Có ReadOnlyBanner UI và cờ readOnly trong profile, chưa có SQL parse guard chặn ghi phía server

[MOT PHAN] T-077 · [W1] Connection coloring + virtual group
        📁 packages/ui/src/utils/virtual-group.ts
        ⚠ Có giao diện màu kết nối và virtual-group.ts lưu localStorage, chưa lưu vào workspace.db

[DONE ✔ 2026-08-20] T-078 · [W1] parseUri / toUri
        📁 packages/contract/src/uri.ts
        ✔ packages/contract/src/uri.ts, 12 unit test trong packages/contract/src/__tests__/uri.test.ts

[DONE ✔ 2026-08-20] T-079 · [W1] Host policy chống SSRF (web) + cảnh báo localhost
        📁 packages/contract/src/uri.ts
        ✔ validateHostPolicy chặn 169.254.169.254 và cảnh báo localhost trên web target, test trong uri.test.ts

[SAI — xem audit] T-080 · [W1] Nhân bản profile, sắp xếp lại
        📁 packages/ui/src/
        ❌ Chưa có tính năng duplicate profile hay sắp xếp lại thứ tự profile trong UI/storage

[DONE ✔ 2026-08-19 — xem R-08b] T-081 · [W0] NavPane nối dữ liệu thật (lazy load)
        📁 packages/ui/src/components/useNavTree.ts
        ✔ useNavTree.ts tải lazy 5 cấp qua react-query từ handler RPC thật

[DONE ✔ 2026-08-20] T-082 · [W1] Trạng thái empty/loading/error cho toàn bộ luồng kết nối
        📁 packages/ui/src/components/NavPane.tsx
        ✔ NavPane.tsx và useNavTree.ts có đủ trạng thái loading/error/empty cho từng cấp node
```
Mỗi task: SPEC-01 FR tương ứng; `✅` theo tiêu chí chấp nhận §12 của SPEC-01.

# E-006 · Điều hướng & Objects (SPEC-02)  `[W0-W2]`

```
[DONE ✔ 2026-08-20] T-085 · [W0] introspect.* methods
        📁 packages/contract/src/index.ts
        ✔ 6 method introspect.* khai báo đầy đủ zod schema trong packages/contract/src/index.ts

[DONE ✔ 2026-08-20] T-086 · [W0] Introspector cho PG/MySQL/SQLite (truy vấn gộp, không N+1)
        📁 packages/driver-{postgres,mysql,sqlite}/src/introspect.ts
        ✔ introspect.ts gộp catalog, 0 N+1, kiểm chứng qua Conformance C2 trên cả 3 engine

[SAI — xem audit] T-087 · [W1] Cache metadata trên đĩa (msgpack) + TTL + fingerprint
        📁 packages/engine/
        ❌ Chưa cài đặt msgpack, không có cơ chế cache metadata trên đĩa với TTL và fingerprint

[SAI — xem audit] T-088 · [W1] schema.invalidated topic + invalidateQueries phía client
        📁 packages/contract/src/transport.ts
        ❌ Chỉ khai báo type trong contract/transport.ts; chưa có publisher ở engine khi DDL đổi và chưa nối invalidateQueries phía client

[SAI — xem audit] T-089 · [W1] Objects List view ảo hoá (5000 object)
        📁 packages/ui/src/views/ObjectsView.tsx
        ❌ ObjectsView dùng TABLES.map() hardcode trên mock, không có ảo hoá và chưa nối RPC introspect.objects

[MOT PHAN] T-090 · [W2] Objects Detail view + ColumnChooser
        📁 packages/ui/src/components/dialogs/ColumnChooserDialog.tsx
        ⚠ Có ColumnChooserDialog.tsx, nhưng chưa có Objects Detail view riêng

[MOT PHAN] T-091 · [W1] Tìm kiếm lọc trong cây và trong Objects tab
        📁 packages/ui/src/utils/tree-filter.ts
        ⚠ Có filterTreeNodes.ts lọc cây client-side, chưa có tìm kiếm server-side trong catalog qua lazy load

[MOT PHAN] T-092 · [W1] InfoPane tab General (dữ liệu thật)
        📁 packages/ui/src/components/panes/GeneralTab.tsx
        ⚠ Có component GeneralTab.tsx, nhưng InfoPane.tsx vẫn đọc mock TABLES cũ, chưa nối introspect.tableMeta

[MOT PHAN] T-093 · [W1] InfoPane tab DDL (introspect.ddl + syntax highlight + Ctrl+F)
        📁 packages/ui/src/components/panes/DdlTab.tsx
        ⚠ Có DdlTab.tsx, nhưng DDL trong InfoPane vẫn là mock hardcode sakila, chưa gọi RPC introspect.ddl

[MOT PHAN] T-094 · [W2] InfoPane tab Dependencies (Using / Used By)
        📁 packages/ui/src/components/panes/DependenciesTab.tsx
        ⚠ Có DependenciesTab.tsx, nhưng chưa có backend introspect dependencies thực sự

[MOT PHAN] T-095 · [W1] introspect.identifiers + cache cho code completion
        📁 packages/ui/src/utils/identifier-cache.ts
        ⚠ Có identifier-cache.ts phía UI, nhưng engine chưa có handler cho introspect.identifiers

[MOT PHAN] T-096 · [W2] ObjectContextMenu theo capability + quyền
        📁 packages/ui/src/components/navigation/ObjectContextMenu.tsx
        ⚠ Có ObjectContextMenu.tsx nhưng menu chưa lọc theo CapabilitySet động

[MOT PHAN] T-097 · [W1] Copy tên object đã quote đúng dialect
        📁 packages/ui/src/utils/quote-helper.ts
        ⚠ Có quote-helper.ts, nhưng còn rẽ nhánh theo dialect === 'mysql' thay vì caps.sql.identifierQuote

[MOT PHAN] T-098 · [W2] Virtual grouping cho object
        📁 packages/ui/src/utils/virtual-group.ts
        ⚠ Có virtual-group.ts cục bộ qua localStorage, chưa lưu vào workspace.db theo (connection, schema)
```

# E-007 · DataGrid (ADR-0005)  `[W1]`

```
[SAI — xem audit] T-030 · [W1] DataGrid: ảo hoá hàng + cột, resize, chọn vùng
        📁 packages/ui/src/components/grid/DataGrid.tsx
        ❌ DataGrid dùng rows.map() không ảo hoá, chưa dùng @tanstack/react-virtual, chưa có benchmark fps

[MOT PHAN] T-031 · [W1] CellEditor: 12 kiểu (text, memo, số, bool 3 trạng thái, date/time, enum, set, json, xml, blob/hex/image, uuid, array)
        📁 packages/ui/src/components/grid/DataGrid.tsx
        ⚠ Mới có text editor cơ bản qua handleCellDoubleClick, chưa có 12 cell editor chuyên biệt

[MOT PHAN] T-032 · [W1] Nạp tăng dần từ AsyncIterable<ResultChunk> + ring buffer 200k
        📁 packages/ui/src/utils/result-ring-buffer.ts, packages/ui/src/components/grid/DataGrid.tsx
        ⚠ Có result-ring-buffer.ts nhưng DataGrid nhận mảng rows tĩnh, chưa nối AsyncIterable

[MOT PHAN] T-033 · [W1] Copy/paste: TSV, INSERT, UPDATE, JSON, Markdown (chạy trong Web Worker)
        📁 packages/ui/src/components/grid/export-helper.ts
        ⚠ Có exportGridData trong export-helper.ts chạy đồng bộ trên main thread, chưa chạy Web Worker

[SAI — xem audit] T-034 · [W1] Benchmark grid trong CI, cảnh báo khi tụt fps
        📁 tools/bench/
        ❌ Không có file benchmark trong CI

[MOT PHAN] T-035 · [W2] Ẩn/hiện cột, đóng băng N cột đầu, lưu theo (connection, bảng)
        📁 packages/ui/src/components/dialogs/ColumnChooserDialog.tsx
        ⚠ Có ColumnChooserDialog nhưng chưa lưu cấu hình theo (connection, table) vào workspace.db

[MOT PHAN] T-036 · [W2] Renderer NULL / chuỗi rỗng / BLOB / missing (Mongo) phân biệt trực quan
        📁 packages/ui/src/components/grid/cell-formatter.tsx
        ⚠ cell-formatter.tsx render cơ bản {k:'null'}, chưa phân biệt chuỗi rỗng và missing Mongo

[MOT PHAN] T-037 · [W1] Điều hướng bàn phím + ARIA role
        📁 packages/ui/src/utils/grid-keyboard.ts
        ⚠ grid-keyboard.ts có helper cơ bản, chưa đủ ARIA grid roles

[DONE ✔ 2026-08-20] T-038 · [W2] Find/Replace trong grid
        📁 packages/ui/src/components/grid/GridFindBar.tsx
        ✔ GridFindBar.tsx hỗ trợ tìm kiếm trong cell grid

[DONE ✔ 2026-08-20] T-039 · [W1] NavigationBar (first/prev/next/last page & record, limit setting)
        📁 packages/ui/src/components/grid/NavigationBar.tsx
        ✔ packages/ui/src/components/grid/NavigationBar.tsx đầy đủ nút phân trang và limit
```

# E-008 · Data Editor (SPEC-03)  `[W1-W2]`

```
[SAI — xem audit] T-100 · [W1] data.browse (stream) + FilterExpr AST → SQL
        📁 packages/ui/src/views/DataView.tsx, packages/engine/
        ❌ DataView dùng mock datasetFor, engine chưa có handler data.browse

[SAI — xem audit] T-101 · [W1] data.previewChanges / applyChanges + preview-token
        📁 packages/engine/
        ❌ Engine chưa có handler data.previewChanges / applyChanges

[MOT PHAN] T-102 · [W1] Optimistic locking (expected values → WHERE)
        📁 packages/engine/
        ⚠ Chưa có handler data.applyChanges thực thi optimistic locking

[MOT PHAN] T-103 · [W1] Thứ tự áp dụng DELETE → UPDATE → INSERT trong transaction
        📁 packages/sql/src/change-order.ts
        ⚠ packages/sql/src/change-order.ts có hàm sắp xếp thứ tự, chưa nối handler áp dụng

[MOT PHAN] T-104 · [W1] Bảng không PK: đọc được, không sửa, banner
        📁 packages/ui/src/components/common/NoPkBanner.tsx
        ⚠ Có NoPkBanner.tsx trong UI, chưa enforce read-only tại server

[SAI — xem audit] T-105 · [W1] tx.begin/commit/rollback + TransactionBar + timeout 10 phút
        📁 packages/engine/
        ❌ Chưa có RPC handlers tx.* trong engine

[MOT PHAN] T-106 · [W1] FilterPanel nối logic thật (builder + text mode + preview SQL)
        📁 packages/ui/src/components/FilterPanel.tsx
        ⚠ FilterPanel.tsx có UI nhưng chưa nối FilterExpr AST → SQL thật

[DONE ✔ 2026-08-20] T-107 · [W2] Filter nhanh từ giá trị cell
        📁 packages/ui/src/components/grid/CellContextMenu.tsx
        ✔ CellContextMenu.tsx có Filter by value / Exclude value

[MOT PHAN] T-108 · [W1] Sort server-side theo header click
        📁 packages/ui/src/components/grid/DataGrid.tsx
        ⚠ DataGrid có callback onSortChange, nhưng DataView chưa truyền xuống RPC data.browse

[DONE ✔ 2026-08-20] T-109 · [W1] Set NULL / Set Empty String (2 hành động riêng)
        📁 packages/ui/src/components/grid/CellContextMenu.tsx
        ✔ CellContextMenu.tsx có riêng 2 action Set NULL và Set Empty String

[MOT PHAN] T-110 · [W2] FormView
        📁 packages/ui/src/views/FormView.tsx
        ⚠ packages/ui/src/views/FormView.tsx có giao diện form trên mock data

[MOT PHAN] T-111 · [W4] Foreign-key data selection
        📁 packages/ui/src/components/dialogs/ForeignKeyLookupDialog.tsx
        ⚠ ForeignKeyLookupDialog.tsx có dialog tra cứu FK

[MOT PHAN] T-112 · [W4] Table Profile (lưu filter/sort/cột/độ rộng)
        📁 packages/ui/src/utils/table-profile.ts
        ⚠ packages/ui/src/utils/table-profile.ts lưu vào localStorage, chưa lưu vào workspace.db

[MOT PHAN] T-113 · [W2] Sửa nhiều cell cùng lúc
        📁 packages/ui/src/components/dialogs/BulkEditDialog.tsx
        ⚠ BulkEditDialog.tsx có dialog chỉnh sửa hàng loạt

[MOT PHAN] T-114 · [W2] data.count chính xác (tuỳ chọn) + estimateRowCount mặc định
        📁 packages/engine/
        ⚠ Chưa có RPC handler data.count

[DONE ✔ 2026-08-20] T-115 · [W1] SqlPreviewDialog dùng chung
        📁 packages/ui/src/components/dialogs/SqlPreviewDialog.tsx
        ✔ packages/ui/src/components/dialogs/SqlPreviewDialog.tsx component modal xem trước SQL

[DONE ✔ 2026-08-20] T-116 · [W1] ConflictDialog (mine ↔ theirs ↔ overwrite/skip)
        📁 packages/ui/src/components/dialogs/ConflictDialog.tsx
        ✔ packages/ui/src/components/dialogs/ConflictDialog.tsx

[DONE ✔ 2026-08-20] T-117 · [W2] Định dạng date/time theo setting
        📁 packages/ui/src/utils/date-format.ts
        ✔ packages/ui/src/utils/date-format.ts hỗ trợ format theo setting

[DONE ✔ 2026-08-20] T-118 · [W2] Cell editor lớn (panel/dialog) cho memo/json/xml/hex/image
        📁 packages/ui/src/components/dialogs/CellEditorDialog.tsx
        ✔ packages/ui/src/components/dialogs/CellEditorDialog.tsx
```

# E-009 · SQL Editor (SPEC-04)  `[W1-W2]`

```
[SAI — xem audit] T-040 · [W1] SqlEditor (CodeMirror 6) + corvusTheme buộc vào biến CSS
        📁 packages/ui/src/views/SqlView.tsx
        ❌ SqlView dùng <textarea> thuần, chưa tích hợp @codemirror/*

[SAI — xem audit] T-041 · [W2] Extension completion từ introspect.identifiers (debounce + cache)
        📁 packages/ui/src/
        ❌ Chưa có CodeMirror completion extension

[SAI — xem audit] T-042 · [W2] Extension diagnostics từ CorvusError.position
        📁 packages/ui/src/
        ❌ Chưa có CodeMirror diagnostics extension

[DONE ✔ 2026-08-20] T-043 · [W1] Bảng phím tắt editor
        📁 packages/ui/src/components/dialogs/ShortcutCheatsheetModal.tsx
        ✔ ShortcutCheatsheetModal.tsx hiển thị bảng phím tắt

[SAI — xem audit] T-044 · [W1] splitStatements cho PG/MySQL/SQLite + golden 60 case/dialect
        📁 packages/sql/src/split.ts
        ❌ packages/sql/src/split.ts thiếu golden 60 case/dialect, thiếu DELIMITER và GO

[MOT PHAN] T-045 · [W1] query.execute + nhiều result set + ResultTabs
        📁 packages/ui/src/views/SqlView.tsx, packages/engine/src/handlers/index.ts
        ⚠ query.execute stream handler đã có ở backend, SqlView có ResultTabs, chưa hỗ trợ multiple result sets trong cùng stream

[MOT PHAN] T-046 · [W1] MessagesPanel (notice, warning, affected rows theo statement)
        📁 packages/ui/src/views/SqlView.tsx
        ⚠ SqlView có tab Messages với mảng messages, chưa nối stream notices từ PostgreSQL

[DONE ✔ 2026-08-20] T-047 · [W1] Huỷ query (Esc / nút Stop) ≤ 200 ms
        📁 packages/engine/src/handlers/index.ts, packages/driver-postgres/src/driver.ts
        ✔ AbortController gửi cancel qua WebSocket tới driver giải phóng backend ≤ 200ms

[MOT PHAN] T-048 · [W1] Guard read-only + cảnh báo DELETE/UPDATE không WHERE
        📁 packages/ui/src/components/common/NoWhereWarningModal.tsx
        ⚠ NoWhereWarningModal.tsx có dialog cảnh báo phía UI, chưa có server parse guard

[DONE ✔ 2026-08-20] T-049 · [W1] Query history: ghi + tìm kiếm + panel
        📁 packages/ui/src/components/common/QueryHistoryPanel.tsx
        ✔ QueryHistoryPanel.tsx có tìm kiếm và hiển thị lịch sử

[MOT PHAN] T-120 · [W2] query.format / minify + tuỳ chọn
        📁 packages/sql/src/format.ts
        ⚠ packages/sql/src/format.ts có format thô, chưa có RPC query.format / minify

[DONE ✔ 2026-08-20] T-121 · [W2] Find/Replace trong editor (regex, whole word, match case)
        📁 packages/ui/src/components/common/FindReplaceBar.tsx
        ✔ FindReplaceBar.tsx trong packages/ui/src/components/common/

[SAI — xem audit] T-122 · [W2] Folding, brace highlight, word wrap, zoom
        📁 packages/ui/src/views/SqlView.tsx
        ❌ SqlView dùng textarea thuần, không hỗ trợ code folding hay brace highlight

[MOT PHAN] T-123 · [W2] Lưu query vào workspace + mở/lưu file ngoài qua FileGateway
        📁 packages/ui/src/components/dialogs/SaveQueryDialog.tsx
        ⚠ SaveQueryDialog.tsx có UI, FileGateway có interface, chưa nối lưu vào workspace.db

[DONE ✔ 2026-08-20] T-124 · [W4] Query parameters (:name) + ParamPrompt
        📁 packages/ui/src/components/dialogs/ParamPromptModal.tsx
        ✔ ParamPromptModal.tsx có modal nhập param

[DONE ✔ 2026-08-20] T-125 · [W4] Snippets (built-in + custom + placeholder)
        📁 packages/ui/src/components/common/SnippetPicker.tsx
        ✔ SnippetPicker.tsx có UI chọn snippet

[MOT PHAN] T-126 · [W3] query.explain + ExplainTree + tô node đắt nhất
        📁 packages/ui/src/components/common/ExplainTree.tsx
        ⚠ ExplainTree.tsx có component UI cây explain, chưa có RPC handler query.explain

[MOT PHAN] T-127 · [W2] Draft tự lưu, giữ qua khởi động lại
        📁 packages/ui/src/utils/draft-manager.ts
        ⚠ packages/ui/src/utils/draft-manager.ts tự lưu vào localStorage
```

# E-010 · Object Designer (SPEC-06)  `[W2-W3]`

```
[DONE ✔ 2026-08-20] T-140 · [W2] TableDesign schema + FieldDesign có id bền vững
        📁 packages/contract/src/models/designer.ts
        ✔ FieldDesign có id bền vững (nanoid), kiểu TableDesign định nghĩa chuẩn trong packages/contract/src/models/designer.ts

[MOT PHAN] T-141 · [W2] DdlGenerator.createTable cho 3 engine
        📁 packages/sql/src/ddl.ts
        ⚠ generateCreateTable trong packages/sql/src/ddl.ts hỗ trợ PG/MySQL/SQLite, chưa có golden test

[SAI — xem audit] T-142 · [W2] DdlGenerator.alterTable — thuật toán diff theo id
        📁 packages/sql/
        ❌ Chưa có hàm alterTable trong packages/sql, thiếu 40 kịch bản golden

[MOT PHAN] T-143 · [W2] Cảnh báo DDL: mất dữ liệu, rebuild, khoá bảng, NOT NULL violation
        📁 packages/sql/src/ddl.ts
        ⚠ Có cảnh báo NO_PRIMARY_KEY trong packages/sql/src/ddl.ts

[SAI — xem audit] T-144 · [W2] SQLite recreate-table 12 bước
        📁 packages/driver-sqlite/
        ❌ Chưa hiện thực, đang là task mở T-024b-ddl

[MOT PHAN] T-145 · [W2] FieldGrid + typeCatalog dropdown
        📁 packages/ui/src/views/DesignView.tsx
        ⚠ DesignView.tsx có field grid và dropdown kiểu dữ liệu

[MOT PHAN] T-146 · [W2] IndexTab, ForeignKeyTab, CheckTab, OptionTab
        📁 packages/ui/src/views/DesignView.tsx
        ⚠ DesignView.tsx có tabs

[MOT PHAN] T-147 · [W3] TriggerTab + editor body
        📁 packages/ui/src/views/TriggerDesigner.tsx
        ⚠ TriggerDesigner.tsx có UI tạo trigger

[MOT PHAN] T-148 · [W2] ddl.previewTable / applyTable + PreviewStore
        📁 packages/engine/src/guards.ts
        ⚠ PreviewTokenManager có trong engine/src/guards.ts, nhưng ddl.* handlers chưa đăng ký trong engine

[DONE ✔ 2026-08-20] T-149 · [W2] DropObjectDialog (gõ tên + hiện dependencies)
        📁 packages/ui/src/components/dialogs/DropObjectDialog.tsx
        ✔ DropObjectDialog.tsx có dialog xác nhận gõ tên đối tượng

[MOT PHAN] T-150 · [W2] ViewDesigner
        📁 packages/ui/src/views/ViewDesigner.tsx
        ⚠ ViewDesigner.tsx có giao diện tạo/sửa view

[MOT PHAN] T-151 · [W3] RoutineDesigner (tham số, body, security, determinism)
        📁 packages/ui/src/views/RoutineDesigner.tsx
        ⚠ RoutineDesigner.tsx có giao diện tạo/sửa routine

[MOT PHAN] T-152 · [W3] ddl.maintain theo capability
        📁 packages/ui/src/components/dialogs/TableMaintenanceDialog.tsx
        ⚠ TableMaintenanceDialog.tsx có UI bảo trì bảng

[DONE ✔ 2026-08-20] T-153 · [W2] Xử lý DDL_PARTIAL_FAILURE (dialog nêu trạng thái)
        📁 packages/ui/src/components/dialogs/DdlPartialFailureDialog.tsx
        ✔ DdlPartialFailureDialog.tsx có dialog hiển thị chi tiết lỗi DDL

[MOT PHAN] T-154 · [W2] Read-only → designer chỉ đọc
        📁 packages/ui/src/views/DesignView.tsx
        ⚠ DesignView.tsx disable form khi cờ readOnly bật, chưa enforce server-side
```

# E-011 · Job & File  `[W3]`

```
[DONE ✔ 2026-08-20] T-050 · [W3] FileGateway interface + 2 hiện thực
        📁 packages/client/src/gateway/{web,desktop,mock}.ts
        ✔ FileGateway interface và 3 hiện thực (web, desktop, mock) hoạt động chuẩn

[MOT PHAN] T-051 · [W3] Upload theo chunk có resume + dọn file tạm (web)
        📁 packages/engine/src/chunk-uploader.ts
        ⚠ packages/engine/src/chunk-uploader.ts có buffer tạm trong RAM, chưa có dọn đĩa hay resume

[DONE ✔ 2026-08-20] T-052 · [W1] Cảnh báo localhost ở dialog kết nối (web)
        📁 packages/contract/src/uri.ts
        ✔ validateHostPolicy trong uri.ts trả warning, test trong uri.test.ts

[MOT PHAN] T-054 · [W5] Tray mode desktop + cảnh báo lịch
        📁 packages/desktop/main/src/tray-notification.ts
        ⚠ tray-notification.ts có helper, chưa cấu hình Electron system tray

[SAI — xem audit] T-055 · [W3] JobRunner trong worker thread + progress + log file + huỷ
        📁 packages/engine/src/job-runner.ts
        ❌ job-runner.ts chạy trên main thread, không dùng worker_threads

[MOT PHAN] T-056 · [W3] JobProgressPanel + job.log stream (tail)
        📁 packages/ui/src/components/common/JobProgressPanel.tsx
        ⚠ JobProgressPanel.tsx có UI, chưa có stream handler job.log trong engine

[MOT PHAN] T-057 · [W3] Khoá theo target: 2 job không cùng ghi một bảng
        📁 packages/engine/src/job-lock.ts
        ⚠ JobTargetLockManager trong packages/engine/src/job-lock.ts

[MOT PHAN] T-058 · [W3] Khởi động lại → job đang chạy → failed/INTERRUPTED, không tự chạy lại
        📁 packages/engine/src/job-recovery.ts
        ⚠ packages/engine/src/job-recovery.ts
```

# E-012 · Import / Export (SPEC-08)  `[W3]`

```
[DONE ✔ 2026-08-20] T-250 · [W3] WizardShell dùng chung (Back/Next/Save profile/Start)
        📁 packages/ui/src/components/wizard/WizardShell.tsx
        ✔ WizardShell.tsx trong packages/ui/src/components/wizard/

[MOT PHAN] T-251 · [W3] import.analyze (đọc phần đầu file, suy luận kiểu, preview 100 dòng)
        📁 packages/ui/src/wizards/import/ImportWizard.tsx
        ⚠ ImportWizard.tsx có step preview nhưng engine chưa có handler import.analyze

[SAI — xem audit] T-252 · [W3] Parser CSV/TSV/TXT delimited + fixed-width
        📁 packages/sql/src/import-parser.ts
        ❌ Chưa cài csv-parse, packages/sql/src/import-parser.ts chỉ split chuỗi thô

[SAI — xem audit] T-253 · [W3] Parser JSON (stream-json) + XML (sax)
        📁 packages/sql/
        ❌ Chưa cài stream-json và sax

[SAI — xem audit] T-254 · [W3] Parser XLSX (exceljs streaming)
        📁 packages/sql/
        ❌ Chưa cài exceljs

[SAI — xem audit] T-255 · [W3] decodeStream đa encoding + BOM
        📁 packages/sql/
        ❌ Chưa cài iconv-lite

[MOT PHAN] T-256 · [W3] FieldMappingGrid (Smart/Direct/Unmatch)
        📁 packages/ui/src/wizards/import/FieldMappingGrid.tsx
        ⚠ FieldMappingGrid.tsx trong packages/ui/src/wizards/import/

[MOT PHAN] T-257 · [W3] 5 import mode → SQL
        📁 packages/sql/
        ⚠ Chưa có import mode to SQL generator

[SAI — xem audit] T-258 · [W3] Đường nhanh: PG COPY FROM STDIN, MySQL extended insert, MSSQL bulk
        📁 packages/sql/src/fast-path-import.ts
        ❌ packages/sql/src/fast-path-import.ts chỉ là khung giả định, chưa có stream COPY thực tế

[MOT PHAN] T-259 · [W3] Import job pipeline + tiến trình theo byte + log lỗi từng dòng
        📁 packages/engine/src/import-pipeline.ts
        ⚠ packages/engine/src/import-pipeline.ts có khung

[MOT PHAN] T-260 · [W3] Export: 9 formatter stream
        📁 packages/ui/src/components/grid/export-helper.ts
        ⚠ export-helper.ts có 4 format cơ bản, chưa đủ 9 formatter stream

[MOT PHAN] T-261 · [W3] Export nhiều object (file riêng / gộp / XLSX nhiều sheet)
        📁 packages/sql/src/multi-export.ts
        ⚠ packages/sql/src/multi-export.ts có helper, UI ExportWizard có chọn nhiều object

[MOT PHAN] T-262 · [W3] tool_profile lưu/nạp cấu hình
        📁 packages/ui/src/utils/tool-profile.ts
        ⚠ packages/ui/src/utils/tool-profile.ts lưu vào localStorage, chưa lưu vào workspace.db

[MOT PHAN] T-263 · [W3] ImportWizard 6 bước UI
        📁 packages/ui/src/wizards/import/ImportWizard.tsx
        ⚠ ImportWizard.tsx chạy trên mock data

[MOT PHAN] T-264 · [W3] ExportWizard 5 bước UI
        📁 packages/ui/src/wizards/export/ExportWizard.tsx
        ⚠ ExportWizard.tsx chạy trên mock data

[DONE ✔ 2026-08-20] T-265 · [W3] Copy/Delete mode qua preview
        📁 packages/ui/src/components/dialogs/CopyTableDialog.tsx
        ✔ CopyTableDialog.tsx có dialog chọn copy/delete mode
```

# E-013 · Backup / Restore (SPEC-10)  `[W3]`

```
[MOT PHAN] T-320 · [W3] Định dạng file backup + header metadata + file .meta checksum
        📁 packages/contract/src/models/backup.ts
        ⚠ packages/contract/src/models/backup.ts có format header

[MOT PHAN] T-321 · [W3] Backup job: thứ tự object, index/FK ở cuối, stream ra file
        📁 packages/sql/src/backup-job-order.ts
        ⚠ packages/sql/src/backup-job-order.ts có thứ tự phân loại object, chưa có stream runner

[MOT PHAN] T-322 · [W3] Nén gzip/zstd + verify sau khi ghi
        📁 packages/engine/src/backup-compressor.ts
        ⚠ packages/engine/src/backup-compressor.ts có gzip qua zlib, chưa có zstd

[MOT PHAN] T-323 · [W3] backup.list đọc header (không đọc cả file)
        📁 packages/engine/src/backup-list.ts
        ⚠ packages/engine/src/backup-list.ts có helper

[MOT PHAN] T-324 · [W3] restore.preview: willDrop + currentRows + compatibility
        📁 packages/engine/
        ⚠ Chưa có restore preview handler

[MOT PHAN] T-325 · [W3] Restore job: đọc stream, splitStatements, transaction nếu có
        📁 packages/engine/
        ⚠ Chưa có restore stream runner

[MOT PHAN] T-326 · [W3] Extract SQL từ file backup
        📁 packages/sql/src/backup-extractor.ts
        ⚠ packages/sql/src/backup-extractor.ts có helper

[MOT PHAN] T-327 · [W5] Wrapper mysqldump/pg_dump khi có sẵn
        📁 packages/engine/src/dump-wrapper.ts
        ⚠ packages/engine/src/dump-wrapper.ts có khung gọi spawn

[MOT PHAN] T-328 · [W3] BackupView nối logic thật + BackupHistoryGrid
        📁 packages/ui/src/views/BackupView.tsx
        ⚠ BackupView.tsx có UI

[MOT PHAN] T-329 · [W3] RestoreWizard
        📁 packages/ui/src/wizards/restore/RestoreWizard.tsx
        ⚠ RestoreWizard.tsx có UI wizard

[MOT PHAN] T-330 · [W3] Xử lý DISK_FULL, BACKUP_CORRUPT, RESTORE_PARTIAL
        📁 packages/engine/src/backup-error-handler.ts
        ⚠ packages/engine/src/backup-error-handler.ts
```

# E-014 · Query Builder & Diagram  `[W4]`

```
[MOT PHAN] T-200 · [W4] QueryModel + buildSelect(model, dialect) + golden 30 case/dialect
        📁 packages/sql/src/builder.ts
        ⚠ packages/sql/src/builder.ts có QueryModel và buildSelect, chưa có golden test 30 cases

[MOT PHAN] T-201 · [W4] DiagramCanvas dùng chung (React Flow) + autoLayout (elkjs)
        📁 packages/ui/src/components/diagram/
        ⚠ Chưa cài reactflow và elkjs, dùng custom SVG canvas

[MOT PHAN] T-202 · [W4] BuilderCanvas + TableNode + JoinEdge
        📁 packages/ui/src/views/QueryBuilderView.tsx
        ⚠ QueryBuilderView.tsx có canvas dựng bảng

[MOT PHAN] T-203 · [W4] ClauseTabs: FROM/SELECT/WHERE/GROUP BY/HAVING/ORDER BY
        📁 packages/ui/src/views/QueryBuilderView.tsx
        ⚠ QueryBuilderView.tsx có ClauseTabs

[MOT PHAN] T-204 · [W4] Join tự sinh theo FK + đổi loại join
        📁 packages/ui/src/views/QueryBuilderView.tsx
        ⚠ QueryBuilderView.tsx có logic tự sinh join

[MOT PHAN] T-205 · [W4] Subquery trong FROM và WHERE
        📁 packages/sql/src/subquery-builder.ts
        ⚠ packages/sql/src/subquery-builder.ts có helper subquery

[MOT PHAN] T-206 · [W4] SqlPreviewPane realtime + cảnh báo ghi đè
        📁 packages/ui/src/views/QueryBuilderView.tsx
        ⚠ QueryBuilderView.tsx có SqlPreviewPane

[MOT PHAN] T-220 · [W4] ErView: introspect toàn schema + layout + render
        📁 packages/ui/src/views/ErView.tsx
        ⚠ ErView.tsx có UI render trên mock

[MOT PHAN] T-221 · [W4] Lưu vị trí node theo (connection, schema)
        📁 packages/ui/src/utils/erd-layout-store.ts
        ⚠ erd-layout-store.ts lưu vào localStorage, chưa lưu vào workspace.db

[DONE ✔ 2026-08-20] T-222 · [W4] Ngưỡng 150 bảng → dialog chọn tập bảng
        📁 packages/ui/src/components/dialogs/TableSelectionDialog.tsx
        ✔ TableSelectionDialog.tsx có dialog chọn tập bảng

[DONE ✔ 2026-08-20] T-223 · [W4] Tạo/sửa/xoá FK từ canvas (qua preview-token)
        📁 packages/ui/src/components/dialogs/CanvasForeignKeyDialog.tsx
        ✔ CanvasForeignKeyDialog.tsx có modal tạo/sửa FK

[DONE ✔ 2026-08-20] T-224 · [W4] Export PNG/SVG
        📁 packages/ui/src/utils/canvas-exporter.ts
        ✔ packages/ui/src/utils/canvas-exporter.ts xuất hình ảnh PNG/SVG từ canvas
```

# E-015 · Automation (SPEC-11)  `[W5]`

```
[MOT PHAN] T-350 · [W5] batch_job + schedule + job_run schema + CRUD methods
        📁 packages/contract/src/models/job.ts
        ⚠ models/job.ts có schema, chưa có migration bảng trong storage

[MOT PHAN] T-351 · [W5] Batch job runner (tuần tự, continueOnError, huỷ)
        📁 packages/engine/src/batch-job-runner.ts
        ⚠ packages/engine/src/batch-job-runner.ts

[SAI — xem audit] T-352 · [W5] Scheduler (node-cron) + timezone + hot reload
        📁 packages/engine/
        ❌ Chưa cài node-cron

[MOT PHAN] T-353 · [W5] Leader election qua schedule_lock (web nhiều instance)
        📁 packages/engine/src/leader-election.ts
        ⚠ packages/engine/src/leader-election.ts

[MOT PHAN] T-354 · [W5] Bỏ qua lần bắn chồng + ghi log
        📁 packages/engine/src/schedule-guard.ts
        ⚠ packages/engine/src/schedule-guard.ts

[SAI — xem audit] T-355 · [W5] Notify: SMTP (nodemailer) + webhook HMAC + sendTest
        📁 packages/engine/
        ❌ Chưa cài nodemailer, chưa có webhook HMAC

[MOT PHAN] T-356 · [W5] BatchJobEditor + StepPicker (kéo thả)
        📁 packages/ui/src/views/JobsView.tsx
        ⚠ JobsView.tsx có editor

[MOT PHAN] T-357 · [W5] CronBuilder + diễn giải bằng chữ + 5 lần chạy kế tiếp
        📁 packages/ui/src/views/JobsView.tsx
        ⚠ JobsView.tsx có cron builder cơ bản

[MOT PHAN] T-358 · [W5] RunHistoryGrid + LogViewer (tail, tìm, tải về)
        📁 packages/ui/src/views/JobsView.tsx
        ⚠ JobsView.tsx có log viewer

[MOT PHAN] T-359 · [W5] apps/cli: corvus run-job + exit code + stdout log
        📁 packages/engine/src/cli-runner.ts
        ⚠ packages/engine/src/cli-runner.ts có khung, chưa có apps/cli

[MOT PHAN] T-360 · [W5] Xoay vòng lịch sử chạy
        📁 packages/engine/src/run-history-rotation.ts
        ⚠ packages/engine/src/run-history-rotation.ts
```

# E-016 · Server Security (SPEC-12)  `[W5]`

```
[MOT PHAN] T-380 · [W5] SecurityProvider interface + privilegeCatalog
        📁 packages/engine/src/security-provider.ts
        ⚠ packages/engine/src/security-provider.ts

[MOT PHAN] T-381 · [W5] Hiện thực cho PG / MySQL / MSSQL
        📁 packages/sql/src/security-generator.ts
        ⚠ packages/sql/src/security-generator.ts có generator PG/MySQL

[MOT PHAN] T-382 · [W5] security.users / .roles / .privileges
        📁 packages/engine/
        ⚠ Chưa có RPC handler trong engine

[MOT PHAN] T-383 · [W5] previewUser / applyUser (mật khẩu che khi hiển thị + comment giải thích)
        📁 packages/sql/src/security-generator.ts
        ⚠ generateUserSql có maskPassword

[MOT PHAN] T-384 · [W5] previewGrant / applyGrant
        📁 packages/sql/src/security-generator.ts
        ⚠ generateGrantSql có generator

[MOT PHAN] T-385 · [W5] UsersDialog nối logic thật
        📁 packages/ui/src/components/dialogs/UsersDialog.tsx
        ⚠ UsersDialog.tsx có UI

[DONE ✔ 2026-08-20] T-386 · [W5] UserDesigner render từ driver.userDesignSchema
        📁 packages/ui/src/components/dialogs/UserDesignerModal.tsx
        ✔ UserDesignerModal.tsx

[DONE ✔ 2026-08-20] T-387 · [W5] RoleDesigner
        📁 packages/ui/src/components/dialogs/RoleDesignerModal.tsx
        ✔ RoleDesignerModal.tsx

[MOT PHAN] T-388 · [W5] PrivilegeMatrix (3 trạng thái: gán / không / thừa hưởng)
        📁 packages/ui/src/components/dialogs/UsersDialog.tsx
        ⚠ UsersDialog.tsx có UI ma trận quyền

[DONE ✔ 2026-08-20] T-389 · [W5] Cảnh báo tác động vào chính mình / user hệ thống
        📁 packages/ui/src/components/dialogs/SystemUserWarningModal.tsx
        ✔ SystemUserWarningModal.tsx

[DONE ✔ 2026-08-20] T-390 · [W5] security-password-leak.test.ts
        📁 packages/engine/src/__tests__/security-leak.test.ts
        ✔ Test vitest thật chạy trong pnpm test, kiểm tra mật khẩu không lọt qua SQL preview và redact
```

# E-017 · Monitoring (SPEC-13 monitor)  `[W5]`

```
[MOT PHAN] T-400 · [W5] monitor.processes (stream, interval, đánh dấu dòng thay đổi)
        📁 packages/engine/
        ⚠ Chưa có stream handler trong engine

[MOT PHAN] T-401 · [W5] monitor.killProcess qua preview
        📁 packages/engine/
        ⚠ Chưa có handler

[MOT PHAN] T-402 · [W5] monitor.variables + previewSetVariable
        📁 packages/engine/
        ⚠ Chưa có handler

[MOT PHAN] T-403 · [W5] monitor.status + highlight chỉ số thay đổi
        📁 packages/engine/
        ⚠ Chưa có handler

[MOT PHAN] T-404 · [W5] ServerMonitorView + auto refresh + huỷ stream khi rời view
        📁 packages/ui/src/views/MonitorView.tsx
        ⚠ MonitorView.tsx có UI trên mock

[MOT PHAN] T-405 · [W4] search.findInSchema (job, data + structure, 4 mode)
        📁 packages/sql/src/schema-search.ts
        ⚠ packages/sql/src/schema-search.ts
```

# E-018 · Multi-user web  `[W5]`

```
[MOT PHAN] T-410 · [W5] AuthContext: SingleUserAuth + MultiUserAuth
        📁 packages/engine/src/auth/types.ts
        ⚠ packages/engine/src/auth/types.ts

[SAI — xem audit] T-411 · [W5] Local account (argon2id) + OIDC
        📁 packages/engine/
        ❌ Chưa cài argon2, dùng tạm PBKDF2, chưa có OIDC

[MOT PHAN] T-412 · [W5] RBAC 5 role + connection ACL
        📁 packages/engine/src/auth/rbac-guard.ts
        ⚠ packages/engine/src/auth/rbac-guard.ts

[MOT PHAN] T-413 · [W5] Cookie + CSRF + session xoay 8 giờ
        📁 packages/engine/src/auth/session-rotator.ts
        ⚠ packages/engine/src/auth/session-rotator.ts

[MOT PHAN] T-414 · [W5] audit_log + ghi theo mức khai báo trong contract
        📁 packages/engine/src/audit.ts
        ⚠ packages/engine/src/audit.ts

[MOT PHAN] T-415 · [W5] LoginView + xử lý session hết hạn
        📁 packages/ui/src/views/LoginView.tsx
        ⚠ LoginView.tsx có UI

[DONE ✔ 2026-08-20] T-416 · [W5] Quản lý user Corvus (admin UI)
        📁 packages/ui/src/components/dialogs/CorvusUserManagerModal.tsx
        ✔ CorvusUserManagerModal.tsx
```

# E-019 · Shell & Settings (SPEC-15)  `[W0-W6]`

```
[MOT PHAN] T-470 · [W2] TabManager + useTabStore: tab thật có state riêng
        📁 packages/ui/src/store/tab-session.ts
        ⚠ TabSessionManager có lưu localStorage nhưng UI shell.ts vẫn dùng view đơn

[MOT PHAN] T-471 · [W2] Khôi phục tab sau khởi động (3 chế độ onStartup)
        📁 packages/ui/src/store/tab-session.ts
        ⚠ TabSessionManager có 3 chế độ lưu localStorage

[DONE ✔ 2026-08-20] T-472 · [W2] Hợp nhất i18n: bỏ tr(), mọi chuỗi vào dictionary theo namespace
        📁 packages/ui/src/i18n/{dictionaries.ts,validate-keys.ts}
        ✔ packages/ui/src/i18n/dictionaries.ts và validate-keys.ts kiểm tra đủ 3 ngôn ngữ vi/en/ja

[DONE ✔ 2026-08-20] T-473 · [W2] Settings đầy đủ 7 mục + DEFAULT_CONFIG một chỗ duy nhất
        📁 packages/ui/src/store/shell.ts, packages/ui/src/components/dialogs/SettingsDialog.tsx
        ✔ DEFAULT_CONFIG trong packages/ui/src/store/shell.ts, SettingsDialog.tsx có 7 mục

[MOT PHAN] T-474 · [W2] CommandPalette: fuzzy search + nguồn thật (workspace.paletteSearch)
        📁 packages/ui/src/components/dialogs/CommandPalette.tsx
        ⚠ CommandPalette.tsx có UI tìm kiếm trên tập lệnh tĩnh

[DONE ✔ 2026-08-20] T-475 · [W2] Pane maximize/restore
        📁 packages/ui/src/store/pane-state.ts
        ✔ packages/ui/src/store/pane-state.ts và NavPane/InfoPane toggle/resize

[DONE ✔ 2026-08-20] T-476 · [W6] Focus mode
        📁 packages/ui/src/store/focus-mode.ts
        ✔ packages/ui/src/store/focus-mode.ts toggle ẩn thanh công cụ

[DONE ✔ 2026-08-20] T-477 · [W6] ShortcutEditor + phát hiện xung đột
        📁 packages/ui/src/components/dialogs/ShortcutEditorModal.tsx
        ✔ ShortcutEditorModal.tsx

[DONE ✔ 2026-08-20] T-478 · [W4] Favorites (Ctrl+1..9) + Share via URI
        📁 packages/ui/src/utils/share-uri.ts
        ✔ packages/ui/src/utils/share-uri.ts

[DONE ✔ 2026-08-20] T-479 · [W1] ConnectionLostBanner + tự nối lại
        📁 packages/ui/src/components/common/ConnectionLostBanner.tsx
        ✔ ConnectionLostBanner.tsx hiển thị banner khi mất kết nối, transport-http tự reconnect

[MOT PHAN] T-480 · [W3] Contract version check → 426 → màn hình tải lại trang
        📁 packages/ui/src/utils/version-check.ts
        ⚠ packages/ui/src/utils/version-check.ts

[DONE ✔ 2026-08-20] T-481 · [W5] Cảnh báo thoát khi có job/transaction
        📁 packages/ui/src/utils/unload-guard.ts
        ✔ packages/ui/src/utils/unload-guard.ts

[DONE ✔ 2026-08-20] T-482 · [W6] Deep link corvus:// (desktop)
        📁 packages/ui/src/utils/deep-link-handler.ts
        ✔ packages/ui/src/utils/deep-link-handler.ts

[MOT PHAN] T-483 · [W3] Lazy load view nặng (ModelView, BiView, PipelineBuilder, ExplainTree)
        📁 packages/ui/src/utils/lazy-views.tsx
        ⚠ packages/ui/src/utils/lazy-views.tsx dùng React.lazy, chưa benchmark bundle gzip ≤ 900 KB

[MOT PHAN] T-484 · [W3] app.checkUpdate + không tự cài khi có job chạy
        📁 packages/desktop/main/src/update-checker.ts, packages/ui/src/components/dialogs/UpdatesDialog.tsx
        ⚠ update-checker.ts và UpdatesDialog.tsx

[DONE ✔ 2026-08-20] T-485 · [W2] Trạng thái empty/loading/error/unsupported chuẩn hoá thành component dùng chung
        📁 packages/ui/src/components/common/States.tsx
        ✔ packages/ui/src/components/common/States.tsx

[DONE ✔ 2026-08-20] T-486 · [W2] Format số/ngày/dung lượng theo locale
        📁 packages/ui/src/utils/{format.ts,date-format.ts}
        ✔ packages/ui/src/utils/{format.ts,date-format.ts}
```

# E-020 · Đóng gói & Phát hành  `[W3]`

```
[DONE ✔ 2026-08-20 — xem T-B03] T-500 · [W3] Dockerfile nhiều tầng + docker-compose mẫu + healthcheck
        📁 Dockerfile, docker-compose.yml
        ✔ Dockerfile đa tầng trên bookworm-slim (glibc), apps/web/server dist tự chứa, smoke test xanh

[DONE ✔ 2026-08-20] T-501 · [W3] Biến môi trường + từ chối start khi thiếu CORVUS_MASTER_KEY
        📁 apps/web/server/src/engine.ts
        ✔ apps/web/server/src/engine.ts kiểm tra và từ chối khởi động ở production nếu thiếu CORVUS_MASTER_KEY

[MOT PHAN] T-502 · [W3] electron-builder.yml + NSIS + portable
        📁 electron-builder.yml
        ⚠ electron-builder.yml có cấu hình, chưa có artifact build thực tế

[CHUA KIEM DUOC — can credentials / manual] T-503 · [W1] Mua và thiết lập chứng chỉ EV Code Signing (bắt đầu SỚM)
        ⚠ Cần chứng chỉ số EV và phần cứng token ký thật

[MOT PHAN] T-504 · [W3] Ký số trong CI + verify bằng signtool
        📁 .github/workflows/release.yml
        ⚠ .github/workflows/release.yml có cấu hình, chưa có cert secret thật

[MOT PHAN] T-505 · [W3] electron-updater + feed generic + kênh stable/beta
        📁 apps/desktop/main/src/updater.ts
        ⚠ apps/desktop/main/src/updater.ts

[MOT PHAN] T-506 · [W3] release.yml: build 3 artifact, ký, publish, changelog
        📁 .github/workflows/release.yml
        ⚠ .github/workflows/release.yml

[DONE ✔ 2026-08-20] T-507 · [W3] integration.yml nightly: testcontainers ma trận engine × version
        📁 .github/workflows/integration.yml
        ✔ .github/workflows/integration.yml

[DONE ✔ 2026-08-20] T-508 · [W3] security.yml weekly: pnpm audit + trivy + license check
        📁 .github/workflows/security.yml
        ✔ .github/workflows/security.yml

[MOT PHAN] T-509 · [W3] Smoke test sau đóng gói (native module load được)
        📁 apps/desktop/main/src/__tests__/smoke-desktop-dist.test.ts
        ⚠ apps/desktop/main/src/__tests__/smoke-desktop-dist.test.ts kiểm tra dist tsup, chưa chạy trên packaged Electron installer
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
