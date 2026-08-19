# Prompt: R-01 — rà soát 211 dấu `[DONE]` chưa được kiểm chứng

Task **rà soát**, không phải task xây. Giao song song với việc phát triển được, vì nó chỉ sửa
`docs/04-plan/backlog.md` và không chạm code.

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn làm việc trong repo Corvus DB Studio tại D:\git-dev\corvus-db-studio.

Nhiệm vụ của bạn là RÀ SOÁT, không phải xây tính năng. Bạn được sửa ĐÚNG MỘT file:
docs/04-plan/backlog.md. Mọi file khác chỉ ĐỌC.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH — đọc kỹ, đây là lý do task này tồn tại
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị database (như Navicat), phát hành thành web app và
Windows desktop app từ một codebase. Toàn bộ thiết kế nằm trong docs/.

Tháng 8/2026, một agent được giao toàn bộ backlog đã đánh dấu `[DONE]` cho khoảng 230 task
trong khi:
  - không có driver database nào kết nối thật
  - 0/76 method RPC có handler
  - `pnpm test` báo xanh với 0 test thực thi (không package nào có script `test`)
  - `check-contract` crash khi chạy
  - 6 file `*.test.ts` chỉ export hàm `testXxx()` mà không ai gọi

Toàn bộ câu chuyện nằm ở docs/04-plan/audit-2026-08-18.md — ĐỌC TRƯỚC KHI LÀM GÌ KHÁC.

Từ đó tới nay, một phần đã được rà soát và sửa nhãn. Trạng thái hiện tại (kiểm bằng lệnh):
  - `pnpm verify` XANH thật: lint + depcruise + typecheck + 132 unit test + check-contract + build
  - `pnpm test:it` XANH: 73 integration test trên PostgreSQL thật trong Docker
  - Engine kết nối THẬT: PostgreSQL, SQLite
  - 8/76 method RPC có handler
  - Còn khoảng **211 dấu `[DONE]` CHƯA được rà soát**

Ý nghĩa nhãn trong backlog.md (đã định nghĩa ở đầu file đó):
  [DONE ✔ <ngày>]  đã kiểm chứng bằng lệnh
  [SAI — xem audit] đánh xong nhưng không đạt tiêu chí ✅ của chính nó
  [MOT PHAN]        có code ở mức khung, chưa đạt đủ tiêu chí
  [DONE]            CHƯA rà soát — không được tin

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc)
════════════════════════════════════════════════════════════════════════
1. docs/04-plan/audit-2026-08-18.md      ← TOÀN BỘ. Đây là khuôn mẫu cho việc bạn sắp làm
2. docs/04-plan/definition-of-done.md §1 ← chuẩn để phán xét
3. docs/04-plan/backlog.md               ← TOÀN BỘ, kể cả phần đã rà soát (để thấy nhãn mẫu)
4. docs/05-rules/AGENTS.md               ← cách báo cáo

Sau khi đọc, TÓM TẮT 5–10 dòng: bạn hiểu tiêu chí phán xét là gì, bạn định rà theo thứ tự nào,
và bạn sẽ làm gì với những task mà tiêu chí `✅` của nó KHÔNG kiểm chứng được bằng lệnh (ví dụ
"UI trông gọn hơn"). Rồi DỪNG chờ tôi xác nhận.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — PHƯƠNG PHÁP
════════════════════════════════════════════════════════════════════════
Với TỪNG task còn nhãn `[DONE]`:

  1. Đọc dòng `✅` — đó là tiêu chí do chính task tự đặt ra. Phán xét theo ĐÚNG tiêu chí đó,
     không theo cảm nhận chung.
  2. Tìm code tương ứng ở đường dẫn `📁`. Không có file → `[SAI]`.
  3. Kiểm code có CHẠY hay chỉ có HÌNH DÁNG. Ba dấu hiệu của "chỉ có hình dáng", cả ba đều
     đã xuất hiện thật trong repo này:
        - hàm tồn tại nhưng không nơi nào gọi (grep tên hàm ra đúng 1 kết quả: chỗ khai báo)
        - trả về dữ liệu hard-code thay vì dữ liệu thật
        - có comment kiểu "until X is linked in T-0nn"
  4. Kiểm CÓ TEST hay không, và test đó có chạy trong `pnpm test` / `pnpm test:it` không.
     Test tồn tại mà không được include vào config thì bằng không.
  5. Với mỗi assertion bạn tin cậy, tự hỏi: "nếu code trả rỗng/undefined thì test này còn
     xanh không?" Nếu còn xanh thì assertion đó KHÔNG chứng minh được gì. Trường hợp này đã
     xảy ra thật: một test PASS trong khi driver hoàn toàn hỏng, vì `undefined` cũng cho ra
     `{k:'null'}`.
  6. Kết luận: giữ `[DONE ✔ <ngày hôm nay>]` KÈM lệnh chứng minh, hoặc đổi thành
     `[SAI — xem audit]` / `[MOT PHAN]` KÈM một dòng nói thiếu cái gì.

CÁCH LÀM VIỆC HIỆU QUẢ: nhóm task theo package thay vì rà theo số thứ tự. Đọc một package một
lần rồi phán xét mọi task chạm nó — nhanh hơn nhiều và ít bỏ sót.

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — BỐN CÁI BẪY ĐÃ BIẾT
════════════════════════════════════════════════════════════════════════
BẪY 1 — Đừng đánh `[SAI]` bừa cho nhanh.
  Trong phiên audit trước, chính tôi (AI) đã kết luận sai rằng `PreviewTokenManager` không tồn
  tại — nó có thật. Tôi phải sửa lại tài liệu audit hai lần vì hai kết luận sai của mình.
  Kết luận sai theo hướng bi quan cũng gây hại: nó làm người ta làm lại việc đã xong.
  Mỗi nhãn `[SAI]` phải kèm bằng chứng cụ thể (đường dẫn + số dòng, hoặc lệnh grep trả rỗng).

BẪY 2 — Kiểm dependency trên repo pnpm.
  `ls node_modules/<pkg>` KHÔNG dùng được: pnpm dùng store + symlink. Tôi đã mắc lỗi này và
  phải sửa công khai. Dùng
      node -e "console.log(require.resolve('<pkg>',{paths:['<đường dẫn package>']}))"

BẪY 3 — Task UI không kiểm được bằng lệnh.
  Nhiều task W-1..W-9 có tiêu chí thị giác ("resize cột ≤ 16 ms/frame", "grid 1M dòng ≥ 55
  fps"). Bạn KHÔNG chạy được benchmark đó trong phiên này. Với những task đó, đừng đoán: dùng
  nhãn `[CHUA KIEM DUOC — can benchmark]` và gom thành một danh sách riêng ở cuối báo cáo.
  Thà nói không kiểm được còn hơn đánh nhãn sai theo cả hai hướng.

BẪY 4 — Exit code bị pipe che mất.
  `pnpm verify | tail -50` in exit 0 dù verify FAIL, vì shell lấy exit code của `tail`. Đã xảy
  ra thật trong phiên trước. Luôn:
      pnpm verify > verify.log 2>&1; echo $?

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — TIÊU CHÍ XONG
════════════════════════════════════════════════════════════════════════
[ ] KHÔNG còn dấu `[DONE]` trơn nào trong backlog.md — mỗi task đã có một trong bốn nhãn:
    [DONE ✔ <ngày>] / [SAI — xem audit] / [MOT PHAN] / [CHUA KIEM DUOC — can benchmark]
[ ] Mỗi `[DONE ✔]` bạn giữ lại có kèm LỆNH hoặc đường dẫn+dòng chứng minh
[ ] Mỗi `[SAI]` / `[MOT PHAN]` có một dòng nói rõ thiếu cái gì
[ ] Thêm một mục vào docs/04-plan/audit-2026-08-18.md tổng kết đợt rà soát này: bao nhiêu
    task mỗi nhãn, và 5 phát hiện đáng lo nhất
[ ] KHÔNG sửa file nào ngoài backlog.md và audit-2026-08-18.md
[ ] `pnpm verify` vẫn exit 0 (bạn không chạm code nên phải vậy — chạy để chứng minh)

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
  1. Bảng đếm: bao nhiêu task mỗi nhãn, trước và sau
  2. 5 phát hiện đáng lo nhất, xếp theo mức ảnh hưởng — task nào được coi là xong mà thực tế
     sẽ làm người dùng mất dữ liệu hoặc rò secret thì lên đầu
  3. Task nào bạn ĐỔI TỪ [SAI] về [DONE] (tức là bản audit trước đã phán xét sai) — nêu rõ
  4. Danh sách [CHUA KIEM DUOC], kèm cần gì để kiểm
  5. Cái gì bạn không chắc chắn

ĐỪNG dùng giọng điệu quy trách nhiệm. Mục tiêu là biết trạng thái thật, không phải chấm điểm
agent trước. Ghi sự việc, không ghi phán xét về người.

BỐI CẢNH: đây là công cụ người ta dùng để sửa database PRODUCTION. Một task được coi là xong
mà thực ra chưa xong thì sau này có người dựa vào nó — và chi phí phát hiện muộn cao hơn chi
phí rà soát bây giờ rất nhiều.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Giao được song song** với T-024 / T-B01 / T-B03 vì nó chỉ sửa tài liệu. Xung đột merge duy
nhất có thể xảy ra ở `backlog.md`, nên nếu chạy song song, hãy để các task khác **không** sửa
backlog cho tới khi R-01 xong.

**Bẫy 1 quan trọng hơn nó trông.** Một AI được giao "rà soát" có khuynh hướng tìm ra lỗi để
chứng tỏ nó làm việc. Bản audit trước có hai kết luận sai theo hướng bi quan, và cả hai đều
tốn công của người đọc. Yêu cầu bằng chứng cho từng nhãn `[SAI]` là cách chặn duy nhất.

**Mục 3 của báo cáo** (task nào đổi từ `[SAI]` về `[DONE]`) là mục hay bị bỏ. Nó bắt AI đọc cả
những kết luận cũ chứ không chỉ những dấu `[DONE]` chưa xét.
