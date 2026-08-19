# Prompt: rà soát code của hai phiên T-B05 và T-C00/T-024b

Dùng khi bạn muốn tôi (hoặc một phiên Claude khác) **rà soát lại chính phần code vừa viết**.

Prompt này cố ý viết theo hướng **đối kháng**: phiên rà soát không được tin lời phiên viết code,
kể cả khi đó là chính nó ở phiên trước. Lý do cụ thể: trong repo này đã có ba lần một kết luận
tự tin của AI hoá ra sai — một test PASS trong khi driver hỏng hoàn toàn, một kết luận "không
tồn tại" về `PreviewTokenManager` vốn có thật, và một đề xuất kiến trúc (tsup cho library) phải
tự rút lại.

Dán nguyên khối dưới đây vào phiên mới.

````text
Bạn rà soát code trong Corvus DB Studio tại D:\git-dev\corvus-db-studio.

Bạn KHÔNG sửa code trong lượt đầu. Đọc, chạy, kết luận. Sửa chỉ khi tôi xác nhận.

════════════════════════════════════════════════════════════════════════
PHẠM VI RÀ SOÁT
════════════════════════════════════════════════════════════════════════
Hai đợt thay đổi, do các phiên AI trước thực hiện:

ĐỢT 1 — commit 796a581 "streaming query execution with backpressure handling" (T-B05)
  apps/web/server/src/index.ts                      + ws, xử lý HTTP upgrade tại /ws
  packages/transport-http/src/server.ts             viết lại handleWebSocket
  packages/transport-http/src/client.ts
  packages/engine/src/router.ts                     StreamCallOptions, bỏ validate từng chunk
  packages/engine/src/handlers/index.ts             stream handler query.execute
  packages/driver-postgres/src/driver.ts            AbortSignal → pg_cancel_backend
  packages/contract/src/methods/query.ts            thêm stats.truncated
  tools/bench/chunk-validate.bench.ts               (mới)
  3 file test mới

ĐỢT 2 — chưa commit, đang ở working tree (T-C00 + T-024b)
  packages/driver-core/src/conformance/dialect.ts   (mới) ConformanceDialect
  packages/driver-core/src/conformance/runner.ts    viết lại để trung lập engine
  packages/driver-core/src/conformance/fixture.ts   + SQLITE_SETUP_SQL
  packages/driver-sqlite/src/driver.ts              driver SQLite thật
  packages/driver-sqlite/src/introspect.ts          (mới)
  packages/driver-sqlite/src/value.ts               (mới)
  packages/driver-sqlite/src/errors.ts              (mới)
  packages/driver-sqlite/src/capabilities.ts        sửa 3 cờ khai khống
  apps/web/server/src/engine.ts                     đăng ký sqliteDriver
  docs/04-plan/driver-roadmap.md                    (mới) kế hoạch 7 engine
  docs/02-architecture/capability-matrix.md          sửa cột SQLite
  2 file test mới

Dùng `git diff HEAD` cho đợt 2 và `git show 796a581` cho đợt 1.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC TIÊU CHUẨN TRƯỚC, ĐỌC CODE SAU
════════════════════════════════════════════════════════════════════════
Đọc theo thứ tự này. Nếu đọc code trước, bạn sẽ vô thức lấy code làm chuẩn.

1. docs/05-rules/coding-rules.md
2. docs/05-rules/review-checklist.md
3. docs/02-architecture/driver-spi.md §2 §5 §6 §7
4. docs/02-architecture/rpc-contract.md §5.1
5. docs/02-architecture/streaming-and-jobs.md §A          ← bất biến IV-1..IV-5
6. docs/02-architecture/security.md §2 §5 §7
7. docs/02-architecture/adr/ADR-0003, ADR-0008, ADR-0010
8. docs/04-plan/definition-of-done.md §1
9. docs/04-plan/audit-2026-08-18.md                        ← các sai sót đã từng xảy ra

Sau đó mới đọc diff.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — TỰ CHẠY LẠI MỌI TUYÊN BỐ, ĐỪNG TIN CON SỐ TRONG TÀI LIỆU
════════════════════════════════════════════════════════════════════════
Phiên trước tuyên bố: `pnpm verify` exit 0 · 132 unit test · 73 integration test ·
8/76 handler · SQLite conformance 44 test không cần Docker.

Chạy lại từng cái. LƯU Ý: `pnpm verify | tail -50` in exit 0 dù verify FAIL, vì shell lấy exit
code của `tail`. Đây là lỗi đã xảy ra THẬT trong phiên trước và nó đã che một lượt lint đỏ.
Luôn dùng:
    pnpm verify > verify.log 2>&1; echo $?
    pnpm test:it > it.log 2>&1; echo $?         # cần Docker
    npx vitest run packages/driver-sqlite       # nhanh, không cần Docker

Nếu số test bạn đếm được KHÁC con số trên, đó là phát hiện — báo ngay.

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — CÂU HỎI PHẢI TRẢ LỜI, THEO MỨC ĐỘ QUAN TRỌNG
════════════════════════════════════════════════════════════════════════

── A · TEST XANH GIẢ (ưu tiên cao nhất) ────────────────────────────────
Đây là dạng lỗi đã thực sự lọt qua trong repo này: một assertion
`expect(row[0]).toEqual({k:'null'})` PASS trong khi driver hỏng hoàn toàn, vì `undefined`
cũng cho ra `{k:'null'}`.

Với TỪNG file test mới (5 file), duyệt từng `it()` và trả lời: **nếu code bị rà soát trả về
rỗng / undefined / mảng trống / không làm gì cả, test này còn xanh không?** Liệt kê mọi
assertion mà câu trả lời là "còn xanh".

Cách kiểm mạnh nhất, hãy làm thật với ít nhất 5 chỗ đáng nghi: **cố ý làm hỏng code** (đổi
một dòng cho sai), chạy test, xem có ĐỎ không, rồi hoàn nguyên. Test không đỏ khi code hỏng
là test không có giá trị. Dán kết quả.

Chú ý riêng: `packages/driver-sqlite/src/sqlite.conformance.test.ts` có test
"không đổi journal_mode" dùng `expect(JSON.stringify(mode).toLowerCase()).toContain('delete')`.
Kiểm xem nó có thật sự chứng minh được điều nó nói, hay chỉ tình cờ xanh.

── B · BẤT BIẾN STREAMING (IV-1..IV-5) ─────────────────────────────────
1. `EngineRouter.handleStream` đã BỎ validate từng chunk. ADR-0008 có cho phép ngoại lệ này
   không, và số đo trong `tools/bench/chunk-validate.bench.ts` có thật sự đo đúng cái nó nói?
   Chạy lại bench.
2. Backpressure trong `handleWebSocket`: cửa sổ 8 chunk, mỗi ack mở 4 slot, chờ bằng promise
   được `wake()` đánh thức. TÌM ĐƯỜNG DEADLOCK: có tổ hợp nào làm `state.wake` bị ghi đè hoặc
   không bao giờ được gọi? Cụ thể — hai khung `ack` tới liên tiếp trong lúc vòng lặp đang chờ;
   `cancel` tới đúng lúc `wake` vừa được gán; socket đóng giữa hai `yield`.
3. IV-3: huỷ → cursor đóng + CANCEL tới database ≤ 200 ms. Test có đo THỜI GIAN thật hay chỉ
   khẳng định "không lỗi"?
4. IV-4: WS đứt giữa chừng KHÔNG được tự chạy lại. Client có backoff reconnect — nó có thể
   khiến một stream `query.execute` chạy lại lần hai không? Nếu câu lệnh đó là INSERT thì đó
   là ghi hai lần.
5. SQLite: `execute()` là async generator bọc iterator ĐỒNG BỘ. Trong một chunk, vòng
   `while (rows.length < remaining)` chạy đồng bộ và CHẶN event loop. Với chunkSize 1000 thì
   sao? Với 100 000? Điều này ảnh hưởng gì tới backpressure của WebSocket?

── C · AN TOÀN & RÒ RỈ ─────────────────────────────────────────────────
1. `toWireError()` trong transport-http/server.ts lọc tay để `cause` không ra dây. Có đường
   nào khác làm secret lọt ra: `detail`, `message` của lỗi driver, `i18nKey`?
2. `sqliteErrorToCorvus` không đính `cause`. Nhưng `detail: rawCode` và `message` từ SQLite
   CÓ THỂ chứa đường dẫn tệp database. Đường dẫn tệp có phải secret trong ngữ cảnh này không —
   đọc security.md §2 rồi kết luận, đừng đoán.
3. Đường lỗi HTTP `/rpc` trong apps/web/server/src/index.ts (~dòng 60) trả `{error: message}`.
   Nó có làm mất mã lỗi không, và có làm lọt thông tin gì không?
4. Kiểm Origin ở nhánh WebSocket upgrade: `origin !== undefined && !origins.includes(origin)`.
   Một client không phải trình duyệt (không gửi Origin) được cho qua. Đó là quyết định đúng
   hay là lỗ? Lập luận theo security.md TM-4.
5. `packages/driver-sqlite/src/introspect.ts` tự nhận "không có một chỗ ghép chuỗi SQL nào".
   Kiểm lại bằng mắt, đừng tin comment.

── D · TRUNG THỰC CỦA CAPABILITY ───────────────────────────────────────
Phiên trước đã sửa 3 cờ khai khống của SQLite (`cancelStatement`, `multipleStatements`,
`profiling`) từ true → false. Rà soát PHẦN CÒN LẠI của `SQLITE_CAPABILITIES`: mỗi cờ đang khai
`true` có đúng không? Đặc biệt:
  - `tx.savepoints`, `tx.ddlTransactional`, `tx.isolationLevels: 2`
  - `tools.logicalBackup`, `tools.physicalBackup`, `tools.serverVariables`, `tools.dataGeneration`
  - `objects.trigger`, `objects.index`
  - `sql.caseSensitivity: 'insensitive'` — SQLite phân biệt hoa thường với dữ liệu unicode và
    với LIKE tuỳ cấu hình; khai 'insensitive' có đúng không?
  - `exec.streamingCursor: true` — với API đồng bộ, "streaming cursor" nghĩa là gì?
Với mỗi cờ bạn cho là sai, nói rõ hậu quả cho người dùng (UI hiện nút gì mà không chạy được).

── E · TỔNG QUÁT HOÁ CONFORMANCE CÓ THẬT SỰ TRUNG LẬP? ─────────────────
`ConformanceDialect` được thêm để runner không còn giả định PostgreSQL. Kiểm:
1. Còn giả định nào của PostgreSQL sót lại trong runner.ts không? (grep 'pg_',
   'information_schema', tên schema cứng, cú pháp riêng)
2. Runner có test nào sẽ KHÔNG THỂ pass cho một engine không có bảng (Redis) hoặc không có SQL
   (MongoDB)? Nếu có, `ConformanceDialect` hiện tại có đủ chỗ để diễn tả điều đó, hay sẽ phải
   sửa runner lần nữa? Đây là câu hỏi thiết kế, trả lời cụ thể.
3. PostgreSQL đi từ 32 → 34 test sau khi tổng quát hoá. Xác nhận đây là do TÁCH NHỎ test cũ
   (cùng độ phủ) chứ không phải có test mới bị mất và test khác thêm vào. Đối chiếu tên test
   trước/sau bằng `git show 796a581:packages/driver-core/src/conformance/runner.ts`.

── F · SPI VÀ RANH GIỚI TẦNG ───────────────────────────────────────────
1. `apps/web/server` giờ phụ thuộc `@corvus/driver-sqlite`. depcruise có luật cho việc này
   chưa, hay nó lọt qua vì chưa có luật?
2. `driver-core/src/index.ts` cố ý KHÔNG export `./conformance` (vì runner import vitest và sẽ
   kéo vitest vào production). Ràng buộc đó còn được giữ sau đợt 2 không? Kiểm bằng cách xem
   `apps/web/server/dist` — hoặc nếu chưa build được thì lần theo import.
3. `dialect.ts` import từ `@corvus/contract` (CellValue, DriverId) — đúng hướng phụ thuộc chứ?
4. Có `if (driverId === ...)` nào mới được thêm ở ngoài package driver không?

── G · ĐIỀU TÔI CHỜ BẠN TỰ TÌM ─────────────────────────────────────────
Sáu mục trên là những chỗ tôi đã nghĩ tới. Phần giá trị nhất của lượt rà soát này là chỗ tôi
CHƯA nghĩ tới. Hãy tìm và báo, kể cả khi nó không thuộc mục nào ở trên.

════════════════════════════════════════════════════════════════════════
BA CÁI BẪY CỦA CHÍNH VIỆC RÀ SOÁT
════════════════════════════════════════════════════════════════════════
BẪY 1 — Tin comment thay vì tin code.
  Code trong hai đợt này có comment dày và tự tin, giải thích "vì sao" khá thuyết phục. Comment
  KHÔNG phải bằng chứng. Một comment nói "đã đo được ≤ 200 ms" chỉ có giá trị khi có test đo.

BẪY 2 — Khen vì code trông cẩn thận.
  Trông cẩn thận và đúng là hai việc khác nhau. Đừng viết "code chất lượng tốt" ở đầu báo cáo
  rồi liệt kê vấn đề ở dưới — bắt đầu bằng vấn đề.

BẪY 3 — Bịa vấn đề để chứng tỏ đang làm việc.
  Ngược lại của bẫy 2 và cũng gây hại: mỗi phát hiện phải kèm đường dẫn + số dòng + kịch bản
  cụ thể dẫn tới hậu quả. Không có kịch bản thì đó là ý kiến, hãy gọi nó là ý kiến.
  Trong repo này đã có tiền lệ: một bản audit trước kết luận `PreviewTokenManager` không tồn
  tại — nó có thật, và kết luận sai đó tốn công của người đọc.

════════════════════════════════════════════════════════════════════════
ĐẦU RA
════════════════════════════════════════════════════════════════════════
1. **Lỗi phải sửa trước khi commit** — mỗi lỗi: file:dòng, kịch bản gây lỗi cụ thể (đầu vào →
   hậu quả), mức độ. Xếp nặng nhất lên đầu.
2. **Test xanh giả** — danh sách assertion không chứng minh được gì, kèm kết quả thí nghiệm
   "làm hỏng code xem test có đỏ không".
3. **Cờ capability khai sai** — kèm hậu quả cho người dùng.
4. **Nợ thiết kế** — chỗ sẽ phải sửa lại khi thêm engine thứ tư. Nêu rõ engine nào sẽ vỡ.
5. **Điều bạn KHÔNG kiểm được trong phiên này** và cần gì để kiểm.
6. Output thật của mọi lệnh bạn chạy.

Nếu bạn không tìm được lỗi nào phải sửa trước khi commit, HÃY NÓI THẲNG như vậy — và nói bạn
đã làm gì để cố tìm. "Không có phát hiện" sau một lượt rà soát nghiêm túc là một kết luận hợp
lệ; "không có phát hiện" vì rà soát nông thì không.

BỐI CẢNH: đây là công cụ người ta dùng để sửa database PRODUCTION. Một backpressure sai làm
server phồng RAM rồi chết giữa lúc khách đang chạy migration. Một capability khai khống làm
nút Stop không có tác dụng khi khách cần dừng một query đang khoá bảng.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Nên chạy prompt này TRƯỚC khi commit đợt 2.** Đợt 1 đã commit rồi nên phần rà soát nó là để
biết, còn đợt 2 còn ở working tree nên sửa được không tốn commit sửa lỗi.

**Mục A là mục quan trọng nhất và cũng tốn công nhất.** Yêu cầu "cố ý làm hỏng code, xem test có
đỏ không" là thí nghiệm duy nhất chứng minh được một bộ test có giá trị. Nếu báo cáo về mà mục A
chỉ có nhận xét chung chung không kèm thí nghiệm, hãy yêu cầu làm lại đúng mục đó.

**Mục G tồn tại vì sáu mục trước là giới hạn nhận thức của người viết prompt.** Nếu toàn bộ phát
hiện đều nằm gọn trong A–F, đó là dấu hiệu lượt rà soát chỉ đi theo lối đã vạch.

**Đừng bỏ câu cuối** ("không tìm được lỗi nào thì nói thẳng"). Không có nó, một AI bị áp lực
phải tìm ra vấn đề sẽ bịa — và bẫy 3 nói rõ điều đó gây hại đúng bằng bẫy 2.
