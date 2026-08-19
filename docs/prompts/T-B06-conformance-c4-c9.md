# Prompt: T-B06 — conformance C4 / C6 / C7 / C8 / C9

Bộ conformance hiện phủ C1 Connect · C2 Introspect · C3 Execute · C5 Transaction.
Task này thêm 5 nhóm còn lại theo driver-spi.md §8.

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn tiếp tục phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị database (như Navicat), phát hành đồng thời thành web
app và Windows desktop app từ MỘT codebase. Toàn bộ thiết kế nằm trong docs/ — nguồn sự thật
duy nhất.

Trạng thái hiện tại (đã kiểm bằng lệnh):
- `pnpm verify` XANH. 132 unit test + 73 integration test.
- Engine kết nối THẬT: PostgreSQL (34 test), SQLite (44 test, không cần Docker).
- Conformance suite ĐÃ trung lập engine (T-C00): khác biệt engine nằm trong
  `ConformanceDialect`, runner chỉ giữ phần chung.
- Nhóm đang phủ: C1 · C2 · C3 · C5. THIẾU: C4 Types · C6 Cancel · C7 DDL · C8 Errors · C9 Resource.

Đọc docs/04-plan/audit-2026-08-18.md để hiểu vì sao repo từng có 230 task đánh [DONE] sai sự
thật. Bộ conformance chính là cổng chặn việc đó tái diễn — nó là tài sản, không phải phụ kiện.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc)
════════════════════════════════════════════════════════════════════════
1. docs/05-rules/AGENTS.md
2. docs/05-rules/coding-rules.md
3. docs/02-architecture/driver-spi.md §6 §7 §8   ← định nghĩa 9 nhóm, ĐỌC KỸ §8
4. docs/02-architecture/streaming-and-jobs.md §A ← bất biến IV-1..IV-5, dùng cho C9
5. docs/04-plan/driver-roadmap.md §2.1 và §6     ← vì sao dialect tồn tại; DoD của một driver
6. Dòng task T-B06 trong docs/04-plan/backlog.md
7. packages/driver-core/src/conformance/{runner,dialect,fixture,types}.ts — TOÀN BỘ

Sau khi đọc, TÓM TẮT 5–10 dòng: mỗi nhóm C4/C6/C7/C8/C9 kiểm cái gì, và nhóm nào cần thêm
trường mới vào `ConformanceDialect`. Rồi DỪNG chờ tôi xác nhận.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — HIỆN TRẠNG CHÍNH XÁC (đừng viết lại thứ đã có)
════════════════════════════════════════════════════════════════════════
ĐÃ CÓ, dùng lại nguyên:

  runner.ts    hàm `group(id, title, body)` đã xử lý việc SKIP có ghi lý do:
               `describe.skip('conformance C6 · cancel · sqlite [BỎ QUA: <lý do>]')`.
               Bạn chỉ cần gọi group('C4', ...) và khai `skip` trong dialect.
  runner.ts    `withConnection()` mở–chạy–đóng, không rò session giữa các test.
  runner.ts    `scope` — engine không có schema thì KHÔNG truyền khoá `schema` chút nào.
  dialect.ts   ConformanceDialect + POSTGRES_CONFORMANCE + SQLITE_CONFORMANCE
               (đã có: setupSql, qualify, hasSchemas, badProfiles, seriesSql, echoParamSql,
                syntaxErrorSql, viewDdlContains, probe, skip)
  fixture.ts   POSTGRES_SETUP_SQL + SQLITE_SETUP_SQL, đã chứa sẵn các ca khó:
               tên có dấu cách ("order details"), unicode ("sản lượng"), từ khoá SQL
               ("select"), NULL vs chuỗi rỗng, bigint 9223372036854775807
  packages/driver-postgres/src/postgres.integration.test.ts   mẫu chạy với testcontainers
  packages/driver-sqlite/src/sqlite.conformance.test.ts        mẫu chạy KHÔNG cần Docker

THIẾU — đây chính là T-B06: năm nhóm test, và các trường dialect mà chúng cần.

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — PHẠM VI TỪNG NHÓM
════════════════════════════════════════════════════════════════════════
C4 · TYPES — round-trip mọi kiểu native
  Ghi giá trị vào rồi đọc ra, so sánh. Ít nhất: số nguyên biên (±2^63-1), decimal nhiều chữ
  số, float, text unicode + emoji, chuỗi rỗng, NULL, boolean, ngày/giờ có và không có múi giờ,
  binary có byte 0x00, JSON, UUID, array (chỉ engine nào có).
  Điều quan trọng: kỳ vọng nằm TRONG DIALECT, không hard-code trong runner. SQLite thật sự
  không có boolean, không có decimal chính xác, không có timestamp — bắt nó trả `{k:'bool'}`
  cho mọi trường hợp là bắt driver nói dối. Mở rộng `ProbeExpectation` thay vì thêm nhánh if.

C6 · CANCEL — huỷ ≤ 200 ms, không rò tài nguyên
  Chạy một query dài (dialect cấp `longRunningSql`), huỷ giữa chừng, kiểm:
    - lỗi ra là QUERY_CANCELLED, không phải lỗi thô
    - thời gian từ lúc abort tới lúc iterator dừng ≤ 200 ms
    - kết nối trả về pool: `ping()` ngay sau đó chạy được
    - phía server không còn statement chạy (PostgreSQL: pg_stat_activity; MySQL: SHOW PROCESSLIST)
  SQLite khai `cancelStatement: false` và ĐÃ có `skip.C6` kèm lý do — giữ nguyên, đừng cố
  làm nó pass.

C7 · DDL — golden file
  Sinh DDL cho các object trong fixture, so với file mẫu trong repo. Mục tiêu KHÔNG phải khớp
  từng khoảng trắng mà là: DDL sinh ra CHẠY LẠI ĐƯỢC. Kịch bản tối thiểu: bảng có PK tự tăng,
  FK nhiều cột với ON DELETE, unique index, index thường, view, tên cần quote, cột có default.
  Kiểm bằng cách CHẠY LẠI DDL vào một schema/tệp khác rồi introspect lại và so metadata —
  mạnh hơn so chuỗi rất nhiều, và không vỡ khi format đổi.
  driver-spi §8 nói 40 kịch bản; nếu bạn cho rằng con số đó không đạt được trong task này,
  nói rõ làm được bao nhiêu và thiếu cái gì. Đừng đánh xong với 5 kịch bản.

C8 · ERRORS — ≥ 20 mã
  Gây lỗi THẬT trên server rồi kiểm mã CorvusError. Ít nhất: sai cú pháp, bảng không tồn tại,
  cột không tồn tại, trùng khoá, vi phạm FK, vi phạm NOT NULL, vi phạm CHECK, chia cho 0,
  sai kiểu, timeout, huỷ, chỉ đọc, không đủ quyền, deadlock (nếu engine có), tên quá dài.
  Bảng ánh xạ CÓ SẴN trong errors.ts của từng driver; nhóm này kiểm bảng đó khớp hành vi thật
  — có bảng không có nghĩa là bảng đúng.

C9 · RESOURCE — RAM phẳng
  SELECT 10 triệu dòng, đo `process.memoryUsage().heapUsed` theo chunk. Bất biến IV-1 (≤ 3
  chunk trong RAM engine) và IV-2 (≤ 400 MB cho 10 triệu dòng). Cũng kiểm: người tiêu thụ
  `break` giữa chừng → cursor đóng, kết nối về pool (engine đã có test này ở
  packages/engine/src/__tests__/query-stream.integration.test.ts — đọc trước).

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — NĂM CÁI BẪY ĐÃ BIẾT
════════════════════════════════════════════════════════════════════════
BẪY 1 — Assertion PASS SAI. Đây là bẫy nguy hiểm nhất của cả task này.
  Trong phiên driver-postgres, một assertion `expect(row[0]).toEqual({k:'null'})` đã PASS
  trong khi driver hoàn toàn hỏng — vì `undefined` cũng cho ra `{k:'null'}`. Test xanh, bug
  vẫn còn. Với MỖI assertion bạn viết, tự hỏi: "nếu driver trả rỗng/undefined/mảng trống thì
  test này có còn xanh không?" Nếu có, assertion đó vô giá trị. Luôn khẳng định GIÁ TRỊ DƯƠNG
  (có bao nhiêu dòng, giá trị đúng bằng gì), không chỉ khẳng định "không lỗi".

BẪY 2 — Skip im lặng.
  Nhóm nào engine không hỗ trợ thì PHẢI khai `skip: { C6: '<lý do cụ thể>' }`. Runner đã in
  lý do vào tên describe. Dùng `if (...) return` bên trong `it()` là skip im lặng — nó làm
  test xanh mà không ai biết nó không chạy. Đó chính là cơ chế đã tạo ra 230 dấu [DONE] sai.

BẪY 3 — C9 chạy chậm và làm CI đắt.
  10 triệu dòng mất vài phút. Đặt nhóm C9 vào file `*.integration.test.ts` (đã bị loại khỏi
  `pnpm test`), và cân nhắc cho phép dialect hạ số dòng cho lần chạy nhanh — nhưng nếu hạ thì
  PHẢI `log()` ra con số thực đã chạy. Cắt ngầm rồi báo "RAM phẳng" là báo cáo sai.

BẪY 4 — C7 so chuỗi sẽ vỡ liên tục.
  Golden file so từng ký tự sẽ đỏ mỗi lần ai đó đổi thứ tự cột hay khoảng trắng, rồi người ta
  sẽ cập nhật golden file cho hết đỏ mà không đọc — lúc đó nó không còn chặn gì. Ưu tiên
  "chạy lại DDL rồi so metadata".

BẪY 5 — ĐỪNG sửa hợp đồng của runner để test dễ pass hơn.
  runner.ts vừa được tổng quát hoá ở T-C00 và cả PostgreSQL lẫn SQLite đang phụ thuộc nó.
  Thêm trường mới vào `ConformanceDialect` là được (optional, có mặc định). Đổi ý nghĩa
  trường cũ, hoặc nới một assertion đang có, thì DỪNG và hỏi tôi.

════════════════════════════════════════════════════════════════════════
BƯỚC 5 — TIÊU CHÍ XONG
════════════════════════════════════════════════════════════════════════
[ ] C4 · C6 · C7 · C8 · C9 chạy được cho PostgreSQL
[ ] Cả 5 nhóm cũng chạy cho SQLite, nhóm nào không áp dụng thì skip KÈM LÝ DO
[ ] C1·C2·C3·C5 cũ vẫn xanh y nguyên: PostgreSQL 34 test, SQLite 44 test
[ ] C8 phủ ≥ 20 mã lỗi thật cho PostgreSQL, mỗi mã một assertion
[ ] C9 chứng minh RAM phẳng với số dòng ĐƯỢC IN RA trong output
[ ] C7: DDL sinh ra chạy lại được và introspect ra metadata tương đương
[ ] Với mỗi assertion, không có trường hợp "driver trả rỗng mà test vẫn xanh"
[ ] `pnpm verify` exit 0 và `pnpm test:it` exit 0

════════════════════════════════════════════════════════════════════════
BƯỚC 6 — XÁC MINH (chạy thật, DÁN OUTPUT)
════════════════════════════════════════════════════════════════════════
  pnpm verify > verify.log 2>&1; echo $?      # phải in 0
  pnpm test:it > it.log 2>&1; echo $?         # phải in 0
  npx vitest run packages/driver-sqlite        # nhanh, không cần Docker

CẢNH BÁO: `pnpm verify | tail -50` báo exit 0 dù verify FAIL (shell lấy exit code của
`tail`). Lỗi này đã xảy ra thật trong phiên trước — hãy ghi ra log rồi `echo $?`.

Dán kèm DANH SÁCH nhóm bị skip và lý do, để tôi thấy độ phủ thật.

════════════════════════════════════════════════════════════════════════
LUẬT CỨNG
════════════════════════════════════════════════════════════════════════
1. KHÔNG rẽ nhánh theo driverId trong runner. Khác biệt engine → thêm trường vào dialect.
2. Test viết CÙNG PR, không có "sẽ thêm sau".
3. Dữ liệu giả CHỈ tồn tại trong packages/transport-mock.
4. Secret không bao giờ vào log/error.
5. KHÔNG tự quyết định kiến trúc; đổi hợp đồng runner → ADR nháp rồi HỎI TÔI.
6. KHÔNG nới assertion đang có để nhóm mới pass.

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
  1. Đã làm gì, theo tiêu chí nào ở Bước 5
  2. Đã kiểm chứng bằng lệnh nào — DÁN OUTPUT THẬT
  3. CÁI GÌ CHƯA LÀM và tại sao (C7 40 kịch bản: làm được bao nhiêu?)
  4. Cái gì bạn không chắc chắn
  5. Bộ test mới có BẮT ĐƯỢC BUG nào trong 2 driver hiện có không? Nếu có, mô tả từng cái.
     Nếu không bắt được gì, hãy nói thẳng — và tự đánh giá xem đó là vì driver tốt hay vì
     assertion của bạn quá lỏng.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Nên làm SAU T-024 (MySQL).** Ba engine thì C4/C7/C8 viết một lần dùng ba chỗ, và khác biệt
giữa ba engine mới đủ để lộ ra chỗ nào trong `ConformanceDialect` còn thiếu.

**Mục 5 của phần báo cáo là mục quan trọng nhất.** Một bộ conformance mới mà không bắt được bug
nào ở hai driver có sẵn thì đáng nghi — ở phiên PostgreSQL nó bắt 3 bug, ở phiên SQLite nó bắt
một giới hạn thật của engine. Câu hỏi "vì driver tốt hay vì assertion lỏng" buộc AI phải tự
kiểm, và câu trả lời của nó cho bạn biết nhiều hơn số test.
