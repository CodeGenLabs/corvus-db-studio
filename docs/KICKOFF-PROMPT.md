# Kickoff Prompt — dán cho AI mới

Ba biến thể. Chọn đúng cái cần dùng, thay phần `«…»` rồi dán vào phiên AI mới.

---

## A · Prompt chuẩn (dùng cho mọi task)

````text
Bạn tham gia phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

BỐI CẢNH
Corvus DB Studio là công cụ quản trị cơ sở dữ liệu đa nền tảng (như Navicat / DBeaver /
DataGrip), phát hành đồng thời dưới dạng web app và Windows desktop app từ MỘT codebase.
Hỗ trợ PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, Oracle, MongoDB, Redis.

Trạng thái repo hiện tại:
- UI shell ĐÃ HOÀN CHỈNH và đã kiểm chứng chạy được: React 18 + TypeScript + Vite,
  8 view, 6 dialog, 3 ngôn ngữ (vi/en/ja), light/dark, resize pane, command palette.
- Toàn bộ dữ liệu hiện tại là MOCK TĨNH trong src/data/.
- Chưa có kết nối database thật, chưa có backend, chưa đóng gói desktop.
- Repo đang là app Vite phẳng; kế hoạch chuyển sang monorepo là task T-001…T-006.

Toàn bộ thiết kế hệ thống và kế hoạch triển khai nằm trong thư mục docs/ (49 file).
Đó là NGUỒN SỰ THẬT DUY NHẤT. Đừng suy đoán khi tài liệu đã nói rõ.

BƯỚC 1 — ĐỌC (bắt buộc, làm trước khi viết bất kỳ dòng code nào)
Đọc theo đúng thứ tự này:
  1. docs/05-rules/AGENTS.md            ← luật làm việc, quy trình, 10 điều tuyệt đối cấm
  2. docs/05-rules/coding-rules.md      ← quy tắc code (16 nhóm)
  3. docs/02-architecture/overview.md   ← kiến trúc tổng thể
  4. docs/04-plan/backlog.md            ← tìm dòng task được giao bên dưới
  5. SPEC và ADR được nêu trong dòng task đó — đọc TOÀN BỘ file, không chỉ phần liên quan
  6. docs/05-rules/ui-rules.md          ← chỉ khi task chạm UI
  7. docs/02-architecture/driver-spi.md + capability-matrix.md ← chỉ khi task chạm driver
  8. docs/02-architecture/security.md   ← chỉ khi task chạm secret / SQL sinh tự động

Sau khi đọc, hãy TÓM TẮT LẠI CHO TÔI trong 5–10 dòng: bạn hiểu task này làm gì, chạm
những file nào, và ràng buộc nào quan trọng nhất. Rồi dừng lại chờ tôi xác nhận.

BƯỚC 2 — TASK ĐƯỢC GIAO
«T-nnn»

Nếu tôi không nêu mã task: mở docs/04-plan/backlog.md, mục "Thứ tự thực thi khuyến nghị
cho W-0", và bắt đầu từ task đầu tiên chưa làm trên đường tới hạn (critical path).

BƯỚC 3 — LÀM
- Trước khi tạo component/hàm/kiểu mới, TÌM XEM ĐÃ CÓ CHƯA (rg / grep). Repo này theo
  nguyên tắc một khái niệm một hiện thực: DataGrid dùng ở 9 chỗ, SqlPreviewDialog ở 6 chỗ,
  WizardShell ở 8 wizard. Tạo bản thứ hai là lỗi, không phải tiện lợi.
- Viết test CÙNG PR. Không có "sẽ thêm sau".
- Mọi chuỗi hiển thị phải qua i18n, đủ cả vi/en/ja.

BƯỚC 4 — XÁC MINH (không được bỏ)
Chạy thật và dán output cho tôi:
  npm run build          (hoặc pnpm verify sau khi T-001 xong)
  npm run typecheck
Nếu chạm UI: chạy app và xem bằng mắt, không chỉ dựa vào test.
Nếu chạm driver/service: chạy integration test trên ít nhất 2 engine.

BƯỚC 5 — BÁO CÁO
Nói rõ 4 điều:
  1. Đã làm gì (theo FR nào của SPEC)
  2. Đã kiểm chứng bằng lệnh nào, kết quả ra sao (dán output thật)
  3. CÁI GÌ CHƯA LÀM và tại sao
  4. Cái gì bạn không chắc chắn
Không được nói "đã hoàn thành" khi còn thiếu bất kỳ mục nào trong
docs/04-plan/definition-of-done.md §1.

LUẬT CỨNG — vi phạm là phải làm lại
  1. packages/ui, packages/client, packages/contract KHÔNG được import node:*, electron,
     pg, mysql2, hay bất kỳ driver nào. Muốn dữ liệu thì gọi RPC.
  2. KHÔNG rẽ nhánh theo driverId (if driverId === 'mysql'). Rẽ nhánh theo capabilities.
  3. KHÔNG có if (isElectron) / window.electron trong component. Khác biệt web ↔ desktop
     được giải quyết bằng interface Transport và FileGateway.
  4. Mọi thao tác GHI vào database phải đi qua preview-token: preview* → hiện SQL cho
     người dùng → apply*(previewToken). Không có ngoại lệ.
  5. SQL do hệ thống sinh KHÔNG được ghép chuỗi. Dùng sql`` template hoặc quoteIdentifier.
  6. Secret (mật khẩu DB, SSH key, API key) không bao giờ vào log, error, audit, telemetry,
     hay payload AI.
  7. Driver không được client.query() rồi trả cả mảng. Luôn cursor + AsyncIterable.
  8. KHÔNG tự quyết định kiến trúc. Cần đổi ranh giới package, thêm transport, đổi schema
     lưu trữ, thêm dependency native → viết ADR nháp rồi HỎI TÔI.

KHÔNG ĐƯỢC LÀM VỚI CODE ĐÃ CÓ
UI shell hiện tại đã được chấp thuận và đã kiểm chứng chạy được. Hãy DI CHUYỂN và NỐI DỮ
LIỆU THẬT, đừng viết lại. Không đổi layout, không đổi màu, không đổi cỡ chữ vì "muốn gọn
hơn". Thay đổi thị giác cần tôi yêu cầu tường minh.
Dữ liệu mock trong src/data/ KHÔNG bị xoá — nó chuyển thành fixture của transport-mock,
dùng cho Storybook và unit test UI.

KHI NÀO DỪNG VÀ HỎI
- SPEC thiếu thông tin để làm đúng, hoặc SPEC mâu thuẫn với ADR
- Cần thêm dependency mới (nhất là native module)
- Cần bỏ qua preview-token cho một thao tác ghi
- Bạn cho rằng task này sẽ gây lỗi mất dữ liệu
Cách hỏi: nêu vấn đề cụ thể + 2–3 phương án kèm hệ quả + khuyến nghị của bạn.
Đừng hỏi kiểu "tôi nên làm gì?".

BỐI CẢNH NGHIỆP VỤ CẦN NHỚ
Đây là công cụ người ta dùng để sửa cơ sở dữ liệu PRODUCTION. Một DROP COLUMN sai có thể
xoá dữ liệu 5 năm của một doanh nghiệp. Một UPDATE không WHERE có thể phá 16 triệu dòng.
Vì vậy repo này thà chậm và đúng hơn nhanh và gần đúng.
Khi phải chọn: an toàn dữ liệu > tính năng nhiều; rõ ràng > ngắn gọn; có test > xong sớm;
người dùng xác nhận > tự động tiện lợi; nói rõ đã xảy ra gì > ẩn lỗi cho đẹp.

Trả lời tôi bằng tiếng Việt.

Bắt đầu bằng BƯỚC 1.
````

---

## B · Prompt ngắn (khi AI đã làm việc trong repo này rồi)

````text
Tiếp tục Corvus DB Studio tại D:\git-dev\corvus-db-studio.

Task: «T-nnn»

Đọc trước: docs/05-rules/AGENTS.md · docs/05-rules/coding-rules.md · dòng task trong
docs/04-plan/backlog.md · SPEC và ADR được nêu trong dòng task đó.

Nhắc lại 5 luật cứng: ui không import node/electron/driver · không rẽ nhánh theo driverId
(dùng capabilities) · mọi thao tác ghi qua preview-token · SQL sinh tự động dùng sql`` template
· không tự quyết định kiến trúc, cần thì viết ADR nháp và hỏi tôi.

Làm xong: chạy `npm run build` và `npm run typecheck`, dán output. Báo cáo đủ 4 mục theo
docs/05-rules/AGENTS.md §1 bước 5. Trả lời bằng tiếng Việt.
````

---

## C · Prompt cho AI chỉ đọc / đánh giá (không sửa code)

````text
Bạn review kiến trúc và kế hoạch của Corvus DB Studio tại D:\git-dev\corvus-db-studio.
KHÔNG sửa file nào. Chỉ đọc và đưa nhận xét.

Bối cảnh: công cụ quản trị database đa nền tảng (như Navicat), một codebase phát hành thành
cả web app và Windows desktop app. UI shell đã chạy được với dữ liệu mock; backend chưa có.
Toàn bộ thiết kế trong docs/ (49 file).

Đọc: docs/README.md → docs/02-architecture/overview.md → docs/02-architecture/adr/ (10 ADR)
→ docs/04-plan/roadmap.md → docs/04-plan/estimation.md

Rồi trả lời:
  1. Có quyết định kiến trúc nào bạn cho là sai, và bạn đề xuất gì thay thế?
  2. Có rủi ro nào chưa được nêu trong estimation.md §7?
  3. Ước lượng 200 person-week tới GA có hợp lý không? Chỗ nào bạn cho là lệch nhiều nhất?
  4. Có tính năng nào bị xếp tier sai (làm quá sớm hoặc quá muộn)?
  5. Ba việc cụ thể nên làm khác đi, xếp theo mức ảnh hưởng.

Nói thẳng chỗ bạn không đồng ý. Đừng khen cho lịch sự. Trả lời bằng tiếng Việt.
````

---

## Ghi chú khi dùng

| Tình huống | Dùng biến thể |
|---|---|
| Phiên AI hoàn toàn mới, giao task đầu tiên | **A** |
| Đã làm vài task trong repo, giao task tiếp | **B** |
| Muốn ý kiến phản biện về thiết kế | **C** |
| AI có công cụ đọc file yếu (không tự đọc được repo) | **A**, nhưng dán kèm nội dung `docs/05-rules/AGENTS.md` và SPEC liên quan |

### Prompt đã soạn sẵn cho task cụ thể

| Task | File |
|---|---|
| T-B05 · WebSocket streaming | [prompts/T-B05-websocket-streaming.md](prompts/T-B05-websocket-streaming.md) |

Prompt theo task tốt hơn biến thể B ở một điểm: nó liệt kê **những gì ĐÃ CÓ** để agent không
viết lại, và **những cái bẫy đã biết** rút từ việc rà soát code thật.

**Đừng bỏ "BƯỚC 1 … rồi dừng lại chờ tôi xác nhận" trong biến thể A.** Đó là chốt kiểm soát
duy nhất phát hiện AI hiểu sai task *trước khi* nó viết code — rẻ hơn nhiều so với review sau.
