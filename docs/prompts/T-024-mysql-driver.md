# Prompt: T-024 — driver MySQL / MariaDB

Engine kết nối thật **thứ ba**. Đường đi đã dọn sẵn: conformance suite trung lập engine từ
T-C00, và SQLite đã chứng minh SPI không bị PostgreSQL hoá.

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn tiếp tục phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị database (như Navicat), phát hành đồng thời thành web
app và Windows desktop app từ MỘT codebase. Monorepo pnpm + Turborepo, 19 package/app.
Toàn bộ thiết kế nằm trong docs/ — đó là nguồn sự thật duy nhất.

Trạng thái hiện tại (đã kiểm bằng lệnh):
- `pnpm verify` XANH. 132 unit test + 73 integration test.
- Engine kết nối THẬT: PostgreSQL (conformance C1·C2·C3·C5, 34 test),
  SQLite (44 test, chạy không cần Docker).
- driver-mysql hiện là KHUNG: `connect()` ném UNSUPPORTED_FEATURE có chủ ý (coding-rules
  §3.8 cấm trả dữ liệu giả). Bản trước từng hard-code ['sakila','world',...] làm UI trông
  như đang kết nối thật — đó là lỗi bị bắt trong audit 2026-08-18.

Đọc docs/04-plan/audit-2026-08-18.md để hiểu vì sao mọi tuyên bố "xong" phải kèm output lệnh.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc, trước khi viết dòng code nào)
════════════════════════════════════════════════════════════════════════
1. docs/05-rules/AGENTS.md                          luật làm việc, 10 điều tuyệt đối cấm
2. docs/05-rules/coding-rules.md                    quy tắc code
3. docs/02-architecture/driver-spi.md               ← TOÀN BỘ, đặc biệt §2 §5 §6 §7 §9
4. docs/02-architecture/capability-matrix.md        ← §8 capability phát hiện lúc chạy
5. docs/02-architecture/adr/ADR-0003-driver-spi.md
6. docs/04-plan/driver-roadmap.md §3 (mục T-024)    ← bẫy riêng của MySQL, ĐỌC KỸ
7. docs/02-architecture/security.md §7              ← nếu bạn sinh SQL trong introspect
8. Dòng task T-024 trong docs/04-plan/backlog.md

VÀ ĐỌC HAI DRIVER ĐÃ XONG — đây là khuôn mẫu, không phải tài liệu tham khảo tuỳ chọn:
  packages/driver-postgres/src/{driver,introspect,value,errors,capabilities}.ts
  packages/driver-sqlite/src/{driver,introspect,value,errors,capabilities}.ts

Sau khi đọc, TÓM TẮT cho tôi 5–10 dòng: bạn hiểu phải làm gì, chạm file nào, và ba khác biệt
lớn nhất giữa MySQL và hai engine đã có mà bạn phải xử lý. Rồi DỪNG chờ tôi xác nhận.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — HIỆN TRẠNG CHÍNH XÁC (đừng viết lại thứ đã có)
════════════════════════════════════════════════════════════════════════
ĐÃ CÓ, dùng lại nguyên, KHÔNG viết bản thứ hai:

  packages/driver-core/src/types.ts            DatabaseDriver, DriverConnection, Introspector
  packages/driver-core/src/registry.ts         registerDriver / getDriver
  packages/driver-core/src/not-implemented.ts  cho phần chưa làm ném lỗi đúng
  packages/driver-core/src/conformance/
    runner.ts     C1·C2·C3·C5 — ĐÃ trung lập engine từ T-C00, KHÔNG sửa file này
    dialect.ts    POSTGRES_CONFORMANCE + SQLITE_CONFORMANCE — bạn THÊM MYSQL_CONFORMANCE
    fixture.ts    POSTGRES_SETUP_SQL + SQLITE_SETUP_SQL — bạn THÊM MYSQL_SETUP_SQL
  packages/sql/src/dialect.ts                  quoteIdentifier/quoteLiteral/formatParameter/
                                               sqlKeyword — nhánh 'mysql' đã có
  packages/ui/src/data/icons.ts                DB_ICON đã có mục 'MySQL'
  @testcontainers/... đã là devDependency ở root; xem
  packages/driver-postgres/src/postgres.integration.test.ts làm mẫu

THIẾU — đây chính là T-024:
  packages/driver-mysql/src/{driver,introspect,value,errors,capabilities}.ts  (thật)
  packages/driver-core/src/conformance/dialect.ts  → MYSQL_CONFORMANCE
  packages/driver-core/src/conformance/fixture.ts  → MYSQL_SETUP_SQL
  packages/driver-mysql/src/mysql.integration.test.ts
  Đăng ký vào apps/web/server/src/engine.ts

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — PHẠM VI
════════════════════════════════════════════════════════════════════════
LÀM:
  1. Cài `mysql2` vào packages/driver-mysql. Pool + connect + ping + close.
  2. Đọc lúc connect và DÙNG để thu hẹp capabilities:
       @@version              phiên bản
       @@version_comment      phân biệt MariaDB ≠ MySQL — hai engine, hai tập tính năng
       @@lower_case_table_names  0/1/2 → quyết định caps.sql.caseSensitivity
       @@sql_mode             có ANSI_QUOTES thì dấu " là quote ĐỊNH DANH, không phải chuỗi
       @@max_allowed_packet   để biết trần một câu lệnh
     Mốc capability: CTE + window function cần MySQL ≥ 8.0 / MariaDB ≥ 10.2;
     RETURNING CHỈ có ở MariaDB ≥ 10.5; CHECK constraint thật từ MySQL 8.0.16.
  3. Introspector: truy vấn GỘP vào information_schema.TABLES / COLUMNS / STATISTICS /
     KEY_COLUMN_USAGE / REFERENTIAL_CONSTRAINTS. Không N+1.
  4. execute(): stream, KHÔNG buffer cả result set. Cursor + AsyncIterable, hỗ trợ
     chunkSize / maxRows / AbortSignal — giống hệt hợp đồng của 2 driver đã có.
  5. cancel(): KILL QUERY <threadId> phát từ MỘT KẾT NỐI KHÁC.
  6. errors.ts: ánh xạ ≥ 20 mã errno, có test cho từng mã.
  7. value.ts: chuẩn hoá về CellValue. BIGINT/DECIMAL luôn là string.
  8. MYSQL_CONFORMANCE + MYSQL_SETUP_SQL, chạy runConformanceSuite qua testcontainers.
  9. Đăng ký vào apps/web/server/src/engine.ts (2 dòng, xem mẫu sqlite ở đó).
 10. Thêm cột/sửa chú thích cho MySQL trong docs/02-architecture/capability-matrix.md nếu
     số đo thực tế khác bảng.

KHÔNG LÀM trong task này:
  - MariaDB như một driverId riêng (DriverId có 'mariadb' nhưng dùng chung driver này;
    khác biệt biểu diễn bằng capabilities, KHÔNG bằng nhánh code)
  - DdlGenerator + golden file (thuộc T-B06 nhóm C7)
  - Stored procedure / event / trigger designer

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — SÁU CÁI BẪY ĐÃ BIẾT (đọc kỹ, đừng vấp lại)
════════════════════════════════════════════════════════════════════════
BẪY 1 — `connection.execute()` của mysql2 KHÔNG stream được.
  Phải dùng `connection.query(sql).stream()`. `execute()` là prepared statement và nó gom
  cả result set. Chọn sai là phá NFR-03 (SELECT * trên bảng 16 triệu dòng phải RAM phẳng)
  mà test nhỏ vẫn xanh — lỗi chỉ lộ ra ở production.

BẪY 2 — Giá trị mất chính xác âm thầm nếu không cấu hình connection.
  Bắt buộc: supportBigNumbers: true, bigNumberStrings: true (BIGINT/DECIMAL ra string),
  dateStrings: true (KHÔNG để driver tự dịch múi giờ — dịch là mất dữ liệu gốc và không
  phục hồi được). typeCast riêng cho BIT(1) → boolean và BLOB → Buffer.
  Bài học từ hai driver trước: PostgreSQL từng biến 9223372036854775807 thành
  9223372036854776000; SQLite thì cần safeIntegers. Cả hai đều chỉ bị bắt bởi conformance.

BẪY 3 — MySQL KHÔNG có tầng schema. Database *là* schema.
  `listSchemas()` phải trả MẢNG RỖNG. Trả lại danh sách database "cho có" sẽ làm cây điều
  hướng hiện lặp hai tầng giống nhau. Conformance đã có test đúng cho việc này: đặt
  `hasSchemas: false` trong MYSQL_CONFORMANCE và runner sẽ kiểm `toEqual([])`.
  Xem cách SQLite làm: packages/driver-sqlite/src/introspect.ts listSchemas().

BẪY 4 — `@@sql_mode` có ANSI_QUOTES thì quy tắc quote ĐỔI.
  quoteIdentifier(x, 'mysql') đang dùng backtick — đúng cho mặc định. Nếu server bật
  ANSI_QUOTES, backtick vẫn chạy nên bạn sẽ KHÔNG thấy lỗi; nhưng SQL bạn sinh ra cho người
  dùng copy sẽ không chạy được trên client khác. Ghi capability trung thực và nói rõ trong
  báo cáo bạn xử lý thế nào.

BẪY 5 — `information_schema` chậm trên server có hàng nghìn bảng.
  Lọc bằng `WHERE TABLE_SCHEMA = ?`, KHÔNG lấy hết rồi filter ở Node. Conformance có mốc
  "listObjects ≤ 800 ms" và nó là mốc thật, không phải trang trí.

BẪY 6 — KHÔNG bật `multipleStatements` khi connect.
  capability-matrix chú thích ¹² nói rõ: mặc định TẮT vì rủi ro SQL injection. Chỉ mở cho
  session của SQL Editor về sau, không bao giờ cho `data.*`. Đừng bật để cho tiện dựng fixture
  — hãy tách câu lệnh như hai driver kia đã làm.

════════════════════════════════════════════════════════════════════════
BƯỚC 5 — TIÊU CHÍ XONG (mỗi dòng phải có test chứng minh)
════════════════════════════════════════════════════════════════════════
[ ] runConformanceSuite(mysqlDriver, {profile, dialect: MYSQL_CONFORMANCE}) XANH
[ ] Nhóm nào bị skip thì in KÈM LÝ DO (runner đã làm sẵn — chỉ cần khai `skip` đúng)
[ ] PostgreSQL và SQLite vẫn xanh y nguyên: 34 + 44 test, KHÔNG sửa runner.ts
[ ] capabilities thu hẹp theo server thật: có test chứng minh chạy trên MySQL 8 và MariaDB
    cho ra caps KHÁC nhau (dựng 2 container, hoặc 1 container + test đơn vị cho hàm narrow)
[ ] listSchemas() trả [] ; listDatabases() trả danh sách không rỗng
[ ] BIGINT 9223372036854775807 và DECIMAL(30,10) giữ ĐỦ chữ số (dạng string)
[ ] NULL phân biệt được với chuỗi rỗng
[ ] Tên bảng/cột có dấu cách, unicode, và từ khoá SQL đọc được (fixture đã có sẵn kiểu này)
[ ] Stream 1 triệu dòng: RAM phẳng, đo bằng process.memoryUsage()
[ ] Huỷ: KILL QUERY làm backend nhả ra ≤ 200 ms, không rò connection trong pool
[ ] Ánh xạ ≥ 20 mã errno, mỗi mã một assertion
[ ] Secret không xuất hiện trong log/error của driver (test rò rỉ — xem
    packages/driver-sqlite/src/value.test.ts mục "không đính lỗi gốc vào cause")
[ ] Mở/đóng 30 lần không rò kết nối (conformance C1 đã có test này)
[ ] KHÔNG khai khống capability nào: mỗi cờ khai `false` phải có lý do ghi trong comment
[ ] Đăng ký vào apps/web/server → connection.test với MySQL thật trả ok:true

════════════════════════════════════════════════════════════════════════
BƯỚC 6 — XÁC MINH (chạy thật, DÁN OUTPUT)
════════════════════════════════════════════════════════════════════════
  pnpm verify                                       # phải exit 0
  pnpm --filter @corvus/driver-mysql test:integration
  pnpm test:it                                      # cả 3 engine, phải exit 0

Container để thử tay:
  docker run -d --name corvus-mysql -e MYSQL_ROOT_PASSWORD=corvus \
    -e MYSQL_DATABASE=corvus -p 33066:3306 mysql:8

CẢNH BÁO VỀ EXIT CODE: `pnpm verify | tail -50` sẽ báo exit 0 dù verify FAIL, vì shell lấy
exit code của `tail`. Hãy chạy `pnpm verify > verify.log 2>&1; echo $?` rồi mới xem log.
Đây là lỗi đã xảy ra thật trong phiên trước.

════════════════════════════════════════════════════════════════════════
LUẬT CỨNG (vi phạm là làm lại)
════════════════════════════════════════════════════════════════════════
1. packages/ui, packages/client, packages/contract KHÔNG import node:*, electron, pg,
   mysql2, better-sqlite3, ws. Muốn dữ liệu thì gọi RPC.
2. KHÔNG rẽ nhánh theo driverId — kể cả 'mysql' vs 'mariadb'. Dùng capabilities.
3. KHÔNG có if (isElectron) trong component.
4. Mọi thao tác GHI vào database phải qua preview-token (preview* → apply*).
5. SQL sinh tự động KHÔNG ghép chuỗi — dùng sql`` / quoteIdentifier / sqlKeyword.
   packages/driver-mysql/src/driver.ts ĐANG nằm trong danh sách nợ T-B01 của
   eslint.config.js. Code MỚI bạn viết phải sạch; nếu bạn viết lại cả file thì XOÁ dòng đó
   khỏi danh sách nợ.
6. Dữ liệu giả CHỈ tồn tại trong packages/transport-mock. Driver chưa làm phần nào thì ném
   UNSUPPORTED_FEATURE, KHÔNG trả dữ liệu mẫu.
7. Secret không bao giờ vào log/error/audit/telemetry.
8. Driver KHÔNG buffer cả result set — luôn cursor + AsyncIterable.
9. Capability khai TRUNG THỰC — thà thiếu còn hơn khai khống (driver-spi §2). Trong phiên
   trước, driver-sqlite khai khống 3 cờ và phải sửa cả code lẫn capability-matrix.md.
10. KHÔNG tự quyết định kiến trúc. Đổi ranh giới package, đổi runner.ts của conformance,
    thêm dependency ngoài `mysql2` → viết ADR nháp rồi HỎI TÔI.
11. Test viết CÙNG PR. Không có "sẽ thêm sau".

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
  1. Đã làm gì (theo tiêu chí nào ở Bước 5)
  2. Đã kiểm chứng bằng lệnh nào — DÁN OUTPUT THẬT, gồm số test của cả 3 engine
  3. CÁI GÌ CHƯA LÀM và tại sao
  4. Cái gì bạn không chắc chắn
  5. Cờ capability nào bạn khai `false` và vì sao — liệt kê hết

Nếu conformance bắt được bug trong driver của bạn, BÁO CÁO NÓ. Ở phiên PostgreSQL, conformance
tìm ra 3 bug thật (trong đó một assertion từng PASS SAI vì undefined cũng cho ra {k:'null'});
ở phiên SQLite nó tìm ra một giới hạn thật của engine. Đó là dấu hiệu bộ test đang làm việc,
không phải dấu hiệu bạn làm kém.

BỐI CẢNH NGHIỆP VỤ: đây là công cụ người ta dùng để sửa database PRODUCTION. Khi phải chọn:
an toàn dữ liệu > tính năng nhiều; rõ ràng > ngắn gọn; có test > xong sớm; nói rõ đã xảy ra
gì > ẩn lỗi cho đẹp.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Nên làm T-B02 trước** ([T-B01-B02-sql-safety.md](T-B01-B02-sql-safety.md)): `uri.ts` còn 2
nhánh `driverId`, thêm engine trước khi sửa thì dễ thành 3.

**Bẫy 1 là bẫy tốn tiền nhất.** `execute()` vs `query().stream()` của mysql2 trông giống nhau,
test nhỏ xanh cả hai, và sai chỉ lộ ra khi khách mở một bảng lớn. Nếu báo cáo về mà không nói
rõ đã dùng `query().stream()`, hãy hỏi lại.

**Tiêu chí "MySQL 8 và MariaDB cho caps khác nhau"** là tiêu chí đáng giữ dù nó tốn thêm một
container: đó là chỗ duy nhất chứng minh việc đọc `@@version_comment` có tác dụng thật, chứ
không phải một lệnh gọi cho có.
