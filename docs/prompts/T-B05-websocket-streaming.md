# Prompt: T-B05 — WebSocket streaming

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn tiếp tục phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị cơ sở dữ liệu (như Navicat), phát hành đồng thời
thành web app và Windows desktop app từ MỘT codebase. Monorepo pnpm + Turborepo,
19 package/app. Toàn bộ thiết kế nằm trong docs/ — đó là nguồn sự thật duy nhất.

Trạng thái hiện tại (đã kiểm chứng bằng lệnh, không phải phỏng đoán):
- `pnpm verify` XANH. 104 test: 54 unit + 32 conformance + 12 handler + 6 web HTTP.
- Chỉ PostgreSQL kết nối được thật. MySQL/SQLite ném UNSUPPORTED_FEATURE có chủ đích.
  MSSQL/Oracle/MongoDB/Redis chưa có package.
- 7/76 method RPC có handler, TẤT CẢ đều là unary. **0 stream handler.**
- UI đã hiện được cây database/schema/bảng THẬT từ PostgreSQL qua HTTP RPC.

Đọc docs/04-plan/audit-2026-08-18.md để hiểu vì sao repo từng có 230 task đánh [DONE]
sai sự thật, và vì sao mọi tuyên bố "xong" bây giờ phải kèm output lệnh.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc, trước khi viết dòng code nào)
════════════════════════════════════════════════════════════════════════
1. docs/05-rules/AGENTS.md              luật làm việc, 10 điều tuyệt đối cấm
2. docs/05-rules/coding-rules.md        quy tắc code
3. docs/02-architecture/rpc-contract.md §5.1  ← giao thức khung WebSocket, ĐỌC KỸ
4. docs/02-architecture/streaming-and-jobs.md §A  ← backpressure, 5 bất biến IV-1..IV-5
5. docs/02-architecture/adr/ADR-0002-transport-agnostic-rpc.md
6. docs/02-architecture/adr/ADR-0008-zod-contract.md  ← đặc biệt mục "Tiêu cực"
7. Dòng task T-B05 trong docs/04-plan/backlog.md

Sau khi đọc, TÓM TẮT cho tôi trong 5–10 dòng: bạn hiểu phải làm gì, chạm file nào,
ràng buộc nào quan trọng nhất. Rồi DỪNG chờ tôi xác nhận.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — HIỆN TRẠNG CHÍNH XÁC (đừng viết lại thứ đã có)
════════════════════════════════════════════════════════════════════════
ĐÃ CÓ, chạy được, KHÔNG cần viết lại:

  packages/transport-http/src/frames.ts     11 loại khung: open/chunk/ack/end/error/
                                            cancel/sub/unsub/event/ping/pong
  packages/transport-http/src/server.ts     HttpRpcServer.handleWebSocket(conn, ctx)
                                            — đã có backpressure (dừng khi >8 chunk chưa
                                            ack, mỗi ack giải phóng 4), cancel, ping/pong,
                                            publishTopic, dọn dẹp khi close
  packages/transport-http/src/client.ts     Client WS: tự nối lại backoff mũ (tối đa 10s),
                                            gửi ack mỗi 4 chunk (dòng ~186)
  packages/engine/src/router.ts             EngineRouter.handleStream() — validate params,
                                            kiểm permission, dispatch tới streamHandlers
  packages/driver-postgres/src/driver.ts    PostgresConnection.execute() trả
                                            AsyncIterable<ResultChunk> qua pg-cursor,
                                            có maxRows/chunkSize/AbortSignal

THIẾU — đây chính là T-B05:

  (a) Thư viện `ws` chưa cài, và apps/web/server/src/index.ts chỉ có `node:http`,
      KHÔNG bao giờ xử lý 'upgrade' và KHÔNG bao giờ gọi rpcServer.handleWebSocket().
      → Hệ quả: trình duyệt thử nối ws://…/ws liên tục thất bại (thấy trong console).

  (b) 0 stream handler được đăng ký. Method kiểu stream trong contract:
        query.execute · data.browse · job.log · monitor.processes · ai.chat
      Không có handler thì handleStream ném UNSUPPORTED_FEATURE.

  (c) Không có test nào cho đường streaming.

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — PHẠM VI T-B05
════════════════════════════════════════════════════════════════════════
LÀM:
  1. Cài `ws` + `@types/ws` vào apps/web/server. Xử lý HTTP upgrade tại /ws,
     bọc WebSocket của `ws` thành interface WsConnection rồi gọi handleWebSocket().
  2. Đăng ký stream handler cho `query.execute` — nối thẳng vào
     PostgresConnection.execute(). Đây là method chứng minh cả đường ống.
  3. Hạ HANDLER_DEBT trong tools/check-contract.ts cho đúng số handler mới.
  4. Test integration: PostgreSQL container thật + WebSocket thật.

KHÔNG LÀM trong task này (để task sau):
  - data.browse (cần dịch FilterExpr AST → SQL, là việc riêng của SPEC-03)
  - job.log, monitor.processes, ai.chat
  - Nối UI SqlView vào query.execute (đó là W-1, cần CodeMirror trước)

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — BỐN CÁI BẪY ĐÃ BIẾT (đọc kỹ, đừng vấp lại)
════════════════════════════════════════════════════════════════════════
BẪY 1 — Validate từng chunk giết hiệu năng.
  router.handleStream hiện GỌI streamDef.chunk.safeParse(chunk) cho MỌI chunk.
  ADR-0008 nói rõ ngoại lệ: KHÔNG validate từng ResultChunk (1000 dòng × 20 cột mỗi
  chunk). Hãy ĐO trước (bench 1 triệu dòng có/không validate), rồi quyết định. Nếu bỏ,
  phải ghi comment giải thích + cập nhật ADR-0008 nếu lý do khác với ADR.

BẪY 2 — `unsub` hiện là stub rỗng.
  server.ts nhận khung 'unsub' nhưng KHÔNG xoá subscriber → rò bộ nhớ khi client
  subscribe/unsubscribe nhiều lần. Sửa luôn, có test.

BẪY 3 — Backpressure hiện dùng polling `setTimeout(20)`.
  Chạy được nhưng thô. `ws` có socket.bufferedAmount — cân nhắc dùng. Nếu giữ polling,
  phải có test chứng minh không deadlock khi client ngừng ack (ví dụ client chết giữa
  chừng): stream phải kết thúc khi socket đóng, KHÔNG treo mãi.

BẪY 4 — Huỷ phải dọn sạch tài nguyên.
  streaming-and-jobs.md IV-3: huỷ → cursor đóng, lệnh CANCEL gửi tới PostgreSQL,
  kết nối trả về pool, trong ≤ 200 ms. IV-4: WS đứt giữa chừng thì đánh dấu
  'interrupted' và TUYỆT ĐỐI KHÔNG tự chạy lại (chạy lại một INSERT là ghi hai lần).

════════════════════════════════════════════════════════════════════════
BƯỚC 5 — TIÊU CHÍ XONG (mỗi dòng phải có test chứng minh)
════════════════════════════════════════════════════════════════════════
[ ] Trình duyệt nối được ws://localhost:5173/ws, console KHÔNG còn lỗi WebSocket
[ ] query.execute qua WS trả đúng dữ liệu từ PostgreSQL thật
[ ] Chia chunk đúng chunkSize; seq liên tục 0,1,2…; chunk cuối done=true
[ ] maxRows cắt kết quả và stats.truncated = true
[ ] Backpressure: client ngừng ack → server dừng đọc cursor, KHÔNG phồng RAM
[ ] Huỷ (khung cancel) → cursor đóng + CANCEL tới server ≤ 200 ms, không rò session
[ ] Client chết giữa stream → server dọn sạch, không treo
[ ] unsub xoá subscriber thật (test đăng ký rồi huỷ, publishTopic không gửi nữa)
[ ] Lỗi SQL trong stream → khung 'error' có mã CorvusError, không phải Error thô
[ ] Stream 1 triệu dòng: RAM engine ổn định (đo bằng process.memoryUsage)
[ ] HANDLER_DEBT đã hạ đúng số

════════════════════════════════════════════════════════════════════════
BƯỚC 6 — XÁC MINH (chạy thật, DÁN OUTPUT cho tôi)
════════════════════════════════════════════════════════════════════════
  pnpm verify                                          # phải exit 0
  pnpm --filter @corvus/app-web-server test:integration
  pnpm --filter @corvus/driver-postgres test:integration
  pnpm --filter @corvus/engine test:integration

Và kiểm bằng mắt: chạy `pnpm dev:web` (cần một PostgreSQL đang chạy + profile trong
workspace), mở http://localhost:5173, xem console có còn lỗi WebSocket không.

Cần PostgreSQL để thử tay:
  docker run -d --name corvus-dev -e POSTGRES_PASSWORD=corvus -e POSTGRES_USER=corvus \
    -e POSTGRES_DB=corvus -p 55432:5432 postgres:16-alpine

════════════════════════════════════════════════════════════════════════
LUẬT CỨNG (vi phạm là làm lại)
════════════════════════════════════════════════════════════════════════
1. packages/ui, packages/client, packages/contract KHÔNG import node:*, electron,
   pg, mysql2, ws. Muốn dữ liệu thì gọi RPC.
2. KHÔNG rẽ nhánh theo driverId. Rẽ nhánh theo capabilities.
3. KHÔNG có if (isElectron) trong component.
4. Mọi thao tác GHI vào database phải qua preview-token (preview* → apply*).
5. SQL do hệ thống sinh KHÔNG ghép chuỗi — dùng sql`` template / quoteIdentifier /
   sqlKeyword của @corvus/sql.
6. Dữ liệu giả CHỈ được tồn tại trong packages/transport-mock. Driver chưa làm thì
   ném UNSUPPORTED_FEATURE, không trả dữ liệu mẫu.
7. Secret không bao giờ vào log/error/audit/telemetry.
8. Driver KHÔNG buffer cả result set — luôn cursor + AsyncIterable.
9. KHÔNG tự quyết định kiến trúc. Cần đổi giao thức khung, thêm transport, đổi schema
   lưu trữ, thêm dependency ngoài `ws` → viết ADR nháp rồi HỎI TÔI.
10. Test viết CÙNG PR. Không có "sẽ thêm sau".

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
Nói rõ 4 mục:
  1. Đã làm gì (theo tiêu chí nào ở Bước 5)
  2. Đã kiểm chứng bằng lệnh nào — DÁN OUTPUT THẬT
  3. CÁI GÌ CHƯA LÀM và tại sao
  4. Cái gì bạn không chắc chắn

Đừng nói "đã hoàn thành" khi còn thiếu mục nào trong docs/04-plan/definition-of-done.md §1.

BỐI CẢNH NGHIỆP VỤ: đây là công cụ người ta dùng để sửa database PRODUCTION. Khi phải
chọn: an toàn dữ liệu > tính năng nhiều; rõ ràng > ngắn gọn; có test > xong sớm;
nói rõ đã xảy ra gì > ẩn lỗi cho đẹp.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Vì sao prompt này liệt kê kỹ "ĐÃ CÓ"**: `handleWebSocket()` với đầy đủ framing và
backpressure đã tồn tại trong `packages/transport-http/src/server.ts`. Nếu không nói rõ,
agent rất dễ viết lại từ đầu — vừa lãng phí vừa tạo bản thứ hai của cùng một khái niệm.

**Bốn cái bẫy** đều là quan sát thật khi rà soát code, không phải phòng xa chung chung.
Bẫy 1 (validate từng chunk) là mâu thuẫn có thật giữa code và ADR-0008 — agent cần *đo*
rồi quyết định, không phải làm theo cảm tính.

**Chốt kiểm soát ở Bước 1** (tóm tắt rồi dừng) là chỗ rẻ nhất để bắt việc hiểu sai task.
Đừng bỏ.

**Nếu muốn chia nhỏ hơn nữa**: tách thành T-B05a (chỉ nối `ws` + upgrade, chưa có handler,
tiêu chí = console hết lỗi WebSocket) và T-B05b (stream handler `query.execute`). Cách này
cho hai điểm kiểm chứng độc lập thay vì một.
