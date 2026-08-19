# Prompt: T-B02 + T-B01 — trả nợ an toàn SQL

Hai task gộp một PR-chuỗi vì cùng kết thúc bằng một việc: **xoá block override trong
`eslint.config.js`**. Làm T-B02 trước (nhỏ, chặn engine mới), rồi T-B01.

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn tiếp tục phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị database (như Navicat), phát hành đồng thời thành web
app và Windows desktop app từ MỘT codebase. Monorepo pnpm + Turborepo, 19 package/app.
Toàn bộ thiết kế nằm trong docs/ — đó là nguồn sự thật duy nhất.

Trạng thái hiện tại (đã kiểm bằng lệnh, không phải phỏng đoán):
- `pnpm verify` XANH. 132 unit test + 73 integration test.
- Engine kết nối THẬT: PostgreSQL, SQLite. MySQL/SQLite-DDL chưa xong; MSSQL/Oracle/
  MongoDB/Redis chưa có package.
- 8/76 method RPC có handler. WebSocket streaming chạy thật.

Đọc docs/04-plan/audit-2026-08-18.md để hiểu vì sao repo từng có 230 task đánh [DONE] sai
sự thật, và vì sao mọi tuyên bố "xong" bây giờ phải kèm output lệnh.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc, trước khi viết dòng code nào)
════════════════════════════════════════════════════════════════════════
1. docs/05-rules/AGENTS.md                     luật làm việc, 10 điều tuyệt đối cấm
2. docs/05-rules/coding-rules.md               quy tắc code
3. docs/02-architecture/security.md §7         ← SQL sinh tự động, ĐỌC KỸ
4. docs/02-architecture/adr/ADR-0003-driver-spi.md  ← vì sao cấm rẽ nhánh theo driverId
5. Dòng task T-B01 và T-B02 trong docs/04-plan/backlog.md
6. packages/sql/src/dialect.ts                 ← các hàm an toàn ĐÃ CÓ
7. tools/eslint-rules/no-raw-sql-concat.js     ← rule đang chặn, hiểu nó nhận diện gì

Sau khi đọc, TÓM TẮT cho tôi 5–10 dòng: bạn hiểu phải làm gì, chạm file nào, và bạn dự định
xử lý `packages/sql/src/ddl.ts` (file sinh DDL cho người dùng ĐỌC) khác `security-generator.ts`
(file sinh SQL để CHẠY) như thế nào. Rồi DỪNG chờ tôi xác nhận.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — HIỆN TRẠNG CHÍNH XÁC (đừng viết lại thứ đã có)
════════════════════════════════════════════════════════════════════════
ĐÃ CÓ trong packages/sql/src/dialect.ts, dùng lại, KHÔNG viết hàm mới:

  quoteIdentifier(name, dialect)    5 dialect, đã escape quote lồng nhau
  quoteLiteral(value, dialect)      nhân đôi nháy đơn; MySQL nhân đôi cả backslash
  formatParameter(index, dialect)   $1 / ? / @p1 / :1
  sqlKeyword(value, allowed, back)  allowlist cho chỗ không quote và không bind được
                                    (ON DELETE CASCADE, USING btree, UNIQUE)
  PG_INDEX_METHODS, FK_ACTIONS      allowlist sẵn dùng

ĐÃ CÓ ví dụ làm ĐÚNG, đọc trước khi sửa file khác — hai chỗ này đã qua rule sạch:
  packages/driver-postgres/src/introspect.ts   dùng quotedTable/quotedCols + sqlKeyword
  packages/driver-sqlite/src/introspect.ts     KHÔNG có một chỗ ghép chuỗi nào: dùng HÀM BẢNG
                                               pragma_table_info(?) thay cho PRAGMA
                                               table_info("tên") để bind được tham số

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — T-B02 · uri.ts bỏ rẽ nhánh theo driverId  (làm TRƯỚC)
════════════════════════════════════════════════════════════════════════
packages/contract/src/uri.ts có 2 chỗ `if (driverId === 'sqlite')` (dòng ~33 và ~61), vì
SQLite dùng đường dẫn tệp chứ không dùng host/port/user.

Làm: chuyển sang BẢNG TRA khai báo, ví dụ
    const URI_SHAPE: Record<DriverId, { scheme: string; usesFilePath: boolean }>
rồi parse/serialize theo `usesFilePath` chứ theo tên engine.

RÀNG BUỘC QUAN TRỌNG: `@corvus/contract` là tầng THẤP NHẤT — nó KHÔNG được import
`@corvus/driver-core` (depcruise sẽ chặn, và đúng là nên chặn). Vì vậy bảng tra phải nằm
TRONG contract dưới dạng dữ liệu tĩnh. Như thế vẫn đạt tinh thần ADR-0003: khác biệt engine
biểu diễn bằng dữ liệu, không bằng nhánh code.

Xong T-B02 thì XOÁ block override T-B02 trong eslint.config.js (dòng ~104–110).

Vì sao làm trước: sắp thêm MySQL, MSSQL, Oracle, MongoDB, Redis. Sửa 2 chỗ bây giờ rẻ hơn
sửa 6 chỗ sau.

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — T-B01 · 66 chỗ ghép chuỗi SQL trong 13 file
════════════════════════════════════════════════════════════════════════
Danh sách chính xác nằm trong block "NỢ KỸ THUẬT có kiểm soát: T-B01" của eslint.config.js
(dòng ~79–102). Chạy `npx eslint . 2>&1 | grep no-raw-sql-concat` để có số dòng cụ thể.

Thứ tự ưu tiên theo mức nguy hiểm THẬT, không theo số lượng cảnh báo:
  1. packages/sql/src/schema-search.ts       nhúng tên bảng vào literal — người dùng gõ vào
  2. packages/sql/src/security-generator.ts  tên user/role vào literal — sinh SQL để CHẠY
  3. packages/sql/src/subquery-builder.ts    identifier thô
  4. packages/engine/src/security-provider.ts tự escape bằng .replace() → thay bằng
                                              quoteIdentifier()
  5. Còn lại: builder.ts, change-order.ts, ddl.ts, fast-path-import.ts, import-parser.ts,
     multi-export.ts, và nhánh driver.ts của 3 driver

PHÂN BIỆT HAI LOẠI — quyết định cách sửa:
  (a) SQL để CHẠY trên database của khách hàng → BẮT BUỘC bind parameter. Không có ngoại lệ.
  (b) SQL để người dùng ĐỌC / copy / export ra .sql (DDL preview, "Copy as INSERT") → không
      bind được vì đây là văn bản. Dùng quoteIdentifier() + quoteLiteral() và ghi comment
      nói rõ đây là loại (b).
Đừng dùng quoteLiteral() cho loại (a) chỉ để rule im lặng — đó là làm rule hài lòng chứ
không phải làm hệ thống an toàn.

Mỗi file sửa xong thì XOÁ dòng đó khỏi danh sách override. Khi danh sách rỗng, xoá cả block.

════════════════════════════════════════════════════════════════════════
BƯỚC 5 — BỐN CÁI BẪY ĐÃ BIẾT
════════════════════════════════════════════════════════════════════════
BẪY 1 — Rule này ĐÃ TỪNG báo sai 33 chỗ và đã được hiệu chỉnh hai lần.
  Nó cố ý coi mọi `Literal` là an toàn (hằng biên dịch không thể là input ngoài), và nhận
  các tên biến bắt đầu bằng quoted/escaped/safe/ident là đã xử lý. Nếu bạn gặp một cảnh báo
  mà bạn tin là SAI, ĐỪNG nới rule — báo cho tôi kèm dòng code cụ thể. Nới rule là mở lại
  cánh cửa mà nó đang giữ.

BẪY 2 — `ddl.ts` sinh DDL, nên NHIỀU cảnh báo ở đó là loại (b).
  Đừng "sửa" bằng cách bind parameter (không chạy được), và cũng đừng thêm eslint-disable
  hàng loạt. Dùng quoteIdentifier/quoteLiteral thật + comment.

BẪY 3 — `sqlKeyword()` trả về fallback chứ KHÔNG ném.
  Có chủ ý: mục đích là sinh DDL cho người dùng ĐỌC, một access-method lạ không nên làm cả
  tab DDL trắng. Đừng đổi thành ném.

BẪY 4 — Có test âm cho rule, đừng làm hỏng nó.
  Trước khi tuyên bố xong, thêm MỘT vi phạm có chủ ý vào một file đã sạch, chạy eslint,
  chứng minh nó bị chặn ở mức 'error', rồi bỏ ra. Dán output cả hai lần.

════════════════════════════════════════════════════════════════════════
BƯỚC 6 — TIÊU CHÍ XONG
════════════════════════════════════════════════════════════════════════
[ ] eslint.config.js KHÔNG còn block override cho no-raw-sql-concat
[ ] eslint.config.js KHÔNG còn block override cho no-driver-id-branching
[ ] `npx eslint .` : 0 error, 0 cảnh báo corvus/no-raw-sql-concat, 0 corvus/no-driver-id-branching
[ ] `pnpm verify` exit 0
[ ] `pnpm test:it` exit 0 (cần Docker) — 73 integration test vẫn xanh
[ ] Test mới cho uri.ts: round-trip parse→serialize cho CẢ 8 driverId, gồm sqlite (đường dẫn
    tệp có dấu cách và ký tự unicode) và một engine có host/port
[ ] Test mới cho từng hàm đã sửa ở security-generator.ts và schema-search.ts: đầu vào chứa
    `"; DROP TABLE x; --` KHÔNG sinh ra SQL thực thi được lệnh đó
[ ] Test âm của rule: chứng minh vi phạm mới vẫn bị chặn (dán output)

════════════════════════════════════════════════════════════════════════
BƯỚC 7 — VIỆC KÈM THEO (nhỏ, cùng vùng file)
════════════════════════════════════════════════════════════════════════
apps/web/server/src/index.ts (~dòng 60): nhánh lỗi HTTP /rpc trả `{error: message}` và MẤT
mã CorvusError, trong khi đường WebSocket đã có `toWireError()` giữ đủ code + i18nKey. Dùng
lại `toWireError` cho cả hai đường. UI đang không phân biệt được TABLE_NOT_FOUND với
CONNECTION_FAILED trên đường HTTP.
Thêm test: gọi POST /rpc/introspect.tableMeta với bảng không tồn tại → body có `code`.

════════════════════════════════════════════════════════════════════════
LUẬT CỨNG (vi phạm là làm lại)
════════════════════════════════════════════════════════════════════════
1. packages/ui, packages/client, packages/contract KHÔNG import node:*, electron, pg,
   mysql2, better-sqlite3, ws. Muốn dữ liệu thì gọi RPC.
2. KHÔNG rẽ nhánh theo driverId. Rẽ nhánh theo capabilities hoặc bảng tra dữ liệu.
3. KHÔNG có if (isElectron) trong component.
4. Mọi thao tác GHI vào database phải qua preview-token (preview* → apply*).
5. SQL sinh tự động KHÔNG ghép chuỗi — đó chính là task này.
6. Dữ liệu giả CHỈ tồn tại trong packages/transport-mock.
7. Secret không bao giờ vào log/error/audit/telemetry.
8. Driver KHÔNG buffer cả result set — luôn cursor + AsyncIterable.
9. KHÔNG tự quyết định kiến trúc. Cần đổi ranh giới package, thêm dependency, đổi schema
   lưu trữ → viết ADR nháp rồi HỎI TÔI.
10. Test viết CÙNG PR. Không có "sẽ thêm sau".

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
  1. Đã làm gì (theo tiêu chí nào ở Bước 6)
  2. Đã kiểm chứng bằng lệnh nào — DÁN OUTPUT THẬT
  3. CÁI GÌ CHƯA LÀM và tại sao — nếu còn file nào trong danh sách override, nói rõ file nào
     và vì sao chưa sửa được
  4. Cái gì bạn không chắc chắn

Nếu bạn gặp một chỗ mà cách sửa an toàn làm ĐỔI HÀNH VI (ví dụ tên bảng trước đây được
nhận không quote, sau khi quote thì tìm không ra), DỪNG và báo — đừng tự chọn.

BỐI CẢNH NGHIỆP VỤ: đây là công cụ người ta dùng để sửa database PRODUCTION. Task này là
task an toàn dữ liệu, không phải task dọn lint. Khi phải chọn: an toàn > gọn; rõ ràng >
ngắn; có test > xong sớm.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Vì sao gộp hai task**: cả hai kết thúc bằng việc xoá override trong cùng một file
`eslint.config.js`. Giao riêng thì người thứ hai phải giải quyết xung đột merge ở đúng chỗ đó.

**Vì sao T-B02 phải trước MySQL**: `uri.ts` hiện có 2 nhánh `driverId`. Thêm MySQL, MSSQL,
Oracle, MongoDB, Redis mà chưa sửa thì mỗi engine có xu hướng thêm một nhánh nữa.

**Chỗ dễ bị làm sai nhất** là bẫy 2. Một AI muốn `pnpm lint` xanh sẽ bọc `quoteLiteral()`
quanh mọi thứ, kể cả SQL để chạy. Kết quả: rule im lặng, hệ thống vẫn hở. Nếu báo cáo về mà
không phân biệt được loại (a)/(b), yêu cầu làm lại.
