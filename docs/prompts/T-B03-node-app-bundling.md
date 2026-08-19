# Prompt: T-B03 — bundling thật cho 3 app Node

Ba app Node hiện **không thể đóng gói**: chúng chỉ có `typecheck`, không có `build`, và
`main` trỏ vào `./src/index.ts`. Đây là điều kiện chặn của toàn bộ việc phát hành.

Dán nguyên khối dưới đây vào phiên AI mới.

````text
Bạn tiếp tục phát triển Corvus DB Studio tại D:\git-dev\corvus-db-studio.

════════════════════════════════════════════════════════════════════════
BỐI CẢNH
════════════════════════════════════════════════════════════════════════
Corvus DB Studio là công cụ quản trị database (như Navicat), phát hành đồng thời thành web
app và **Windows desktop app** từ MỘT codebase. Monorepo pnpm + Turborepo, 19 package/app.
Toàn bộ thiết kế nằm trong docs/ — nguồn sự thật duy nhất.

Trạng thái hiện tại (đã kiểm bằng lệnh):
- `pnpm verify` XANH (lint + depcruise + typecheck + 132 test + check-contract + build).
- 2 app FRONTEND đã build được thật: app-web-client và app-desktop-renderer (Vite, ~435 kB).
- 3 app NODE thì KHÔNG:
    apps/web/server        scripts: typecheck, dev (tsx watch), test:integration
    apps/desktop/main      scripts: typecheck, dev (electron .)
    apps/desktop/preload   scripts: typecheck
  Cả ba có `"main": "./src/index.ts"` — chạy được bằng tsx trong dev, KHÔNG chạy được bằng
  `node` sau khi phát hành.
- Repo dùng "internal package" theo NGUỒN: exports của mọi package trỏ `./src/index.ts`,
  không trỏ `dist/`. Đây là quyết định có chủ ý, đừng đảo nó.

Đọc docs/04-plan/audit-2026-08-18.md: repo này từng có task `build` giả (`tsc --noEmit`) ở
14 library và 3 app Node, làm `turbo run build` xanh mà không sinh ra gì. Task đó đã bị xoá.
Đừng dựng lại nó dưới hình thức khác.

════════════════════════════════════════════════════════════════════════
BƯỚC 1 — ĐỌC (bắt buộc)
════════════════════════════════════════════════════════════════════════
1. docs/05-rules/AGENTS.md
2. docs/05-rules/coding-rules.md
3. docs/02-architecture/packaging-release.md   ← TOÀN BỘ, đặc biệt §2 §3 §5
4. docs/02-architecture/monorepo.md            ← vì sao exports trỏ ./src
5. docs/02-architecture/adr/ADR-0001-electron-over-tauri.md
6. docs/02-architecture/adr/ADR-0009-web-desktop-parity.md
7. Dòng task T-B03 (và T-500, T-007) trong docs/04-plan/backlog.md
8. turbo.json + package.json ở root + package.json của 3 app Node

Sau khi đọc, TÓM TẮT 5–10 dòng: bạn chọn công cụ bundle nào cho từng app và VÌ SAO, module
format nào (ESM/CJS) cho từng app, và bạn xử lý `better-sqlite3` (native) thế nào. Rồi DỪNG
chờ tôi xác nhận. Đây là quyết định tôi muốn xem trước khi bạn viết code.

════════════════════════════════════════════════════════════════════════
BƯỚC 2 — HIỆN TRẠNG CHÍNH XÁC
════════════════════════════════════════════════════════════════════════
ĐÃ CÓ:
  scripts/rebuild-native.mjs          @electron/rebuild cho better-sqlite3 (T-007)
  .github/workflows/ci.yml            6 bước, đang xanh
  turbo.json                          pipeline; `build` đã hoạt động cho 2 app frontend
  apps/web/server/src/index.ts        đã có guard entry point qua pathToFileURL và
                                      shutdown() gắn SIGINT/SIGTERM — đường vào production
                                      đã đúng, chỉ thiếu bản build

RÀNG BUỘC ĐÃ BIẾT, đừng phát hiện lại:
  - `better-sqlite3` là native (.node). Bundler KHÔNG nhét được vào một file JS. Nó phải nằm
    ngoài bundle và đi kèm dưới dạng file, đúng ABI của runtime (Node cho server, Electron
    cho desktop — HAI ABI KHÁC NHAU).
  - `ws` là JS thuần, bundle được.
  - `pg` dùng require động cho pg-native; nếu bundler cố resolve sẽ vỡ. Xử lý bằng external.
  - preload của Electron có ràng buộc riêng: sandbox → thường phải là CJS, và KHÔNG được
    import module Node tuỳ ý. Đọc ADR-0009 trước khi quyết.

════════════════════════════════════════════════════════════════════════
BƯỚC 3 — PHẠM VI
════════════════════════════════════════════════════════════════════════
LÀM:
  1. Thêm `build` THẬT cho 3 app Node, sinh ra `dist/` chạy được:
       node apps/web/server/dist/index.js          → server lắng nghe, /rpc và /ws hoạt động
       electron chạy được apps/desktop/main/dist   → cửa sổ mở, renderer nạp được
  2. `main` của mỗi app trỏ vào dist sau khi build; `dev` vẫn chạy bằng tsx như hiện tại.
     Hai đường phải cùng hành vi — đó là ý nghĩa của ADR-0009.
  3. Khai external đúng cho native module + copy file .node vào dist theo đúng ABI.
  4. Nối vào `turbo run build` với `outputs` khai đúng để cache hoạt động.
  5. Dockerfile cho apps/web/server dùng được bản dist (không cài tsx trong image
     production, không copy cả node_modules của workspace).
  6. Smoke test TỰ ĐỘNG, chạy trong CI:
       - khởi động `node dist/index.js`, gọi POST /rpc, mở ws://.../ws, rồi shutdown sạch
       - `require('better-sqlite3')` thành công trong bản đã đóng gói

KHÔNG LÀM trong task này:
  - Ký số / notarize (T-503, T-504)
  - Auto-update (T-505)
  - Đóng gói installer .exe cuối cùng (T-500) — task này chỉ lo tới `dist/` chạy được
  - Đổi exports của library sang `dist/` (SẼ tạo hai nguồn sự thật; xem BẪY 1)

════════════════════════════════════════════════════════════════════════
BƯỚC 4 — BỐN CÁI BẪY ĐÃ BIẾT
════════════════════════════════════════════════════════════════════════
BẪY 1 — ĐỪNG đổi 14 library sang build ra `dist/`.
  Trong một phiên trước, chính tôi (AI) đã đề xuất chuyển sang tsup cho library rồi PHẢI TỰ
  RÚT LẠI: exports của repo này trỏ `./src/index.ts` có chủ ý, nên thêm `dist/` tạo ra hai
  nguồn sự thật và đúng lúc đó `check-contract` sẽ đọc bản cũ. Bundler của APP tự nội suy
  code library từ nguồn — đó là cách đúng ở đây. Nếu bạn tin cần đổi, DỪNG và hỏi tôi.

BẪY 2 — "build xanh" không có nghĩa là "chạy được".
  Repo này đã từng có `build: tsc --noEmit` ở 3 app Node: turbo báo xanh, không sinh file nào,
  và không ai phát hiện trong nhiều task. Tiêu chí duy nhất được tính là CHẠY THẬT bản dist
  rồi gọi vào nó. Đừng dùng typecheck làm build.

BẪY 3 — Hai ABI native khác nhau.
  `better-sqlite3` build cho Node KHÔNG nạp được trong Electron và ngược lại. `scripts/
  rebuild-native.mjs` đã có cho phía Electron. Nếu bạn copy một file .node duy nhất cho cả
  hai app, một trong hai sẽ vỡ lúc chạy — và vỡ ở máy người dùng, không phải trong CI.

BẪY 4 — Shutdown phải còn sạch sau khi bundle.
  apps/web/server đã đóng WebSocket TRƯỚC `server.close()` (nếu không, shutdown treo vĩnh
  viễn khi còn một tab mở). Bundler đôi khi làm hỏng việc gắn SIGINT/SIGTERM hoặc guard
  entry point qua `import.meta.url`. Smoke test phải kiểm cả việc TẮT, không chỉ việc BẬT.

════════════════════════════════════════════════════════════════════════
BƯỚC 5 — TIÊU CHÍ XONG
════════════════════════════════════════════════════════════════════════
[ ] `pnpm build` sinh dist cho CẢ 5 app (2 frontend đã có + 3 Node mới)
[ ] `node apps/web/server/dist/index.js` khởi động, KHÔNG cần tsx, KHÔNG cần devDependency
[ ] POST /rpc trả kết quả thật; ws://…/ws bắt tay được — kiểm bằng smoke test tự động
[ ] SIGTERM làm server tắt sạch trong ≤ 5 s, không treo (test tự động)
[ ] `require('better-sqlite3')` chạy trong bản dist của server VÀ trong Electron đã đóng gói
[ ] Electron chạy được từ dist: cửa sổ mở, renderer nạp, IPC transport hoạt động
[ ] `pnpm verify` exit 0
[ ] `pnpm test:it` exit 0
[ ] Dockerfile build được và container chạy được (dán output `docker run` + một lệnh curl)
[ ] turbo cache hoạt động: chạy `pnpm build` lần hai in ra FULL TURBO
[ ] KHÔNG có app nào dùng `tsc --noEmit` làm script `build`

════════════════════════════════════════════════════════════════════════
BƯỚC 6 — XÁC MINH (chạy thật, DÁN OUTPUT)
════════════════════════════════════════════════════════════════════════
  pnpm verify > verify.log 2>&1; echo $?
  pnpm build > build.log 2>&1; echo $?
  ls -la apps/web/server/dist apps/desktop/main/dist apps/desktop/preload/dist
  node apps/web/server/dist/index.js            # rồi curl vào nó, rồi Ctrl+C
  pnpm test:it > it.log 2>&1; echo $?

CẢNH BÁO: `pnpm verify | tail -50` báo exit 0 dù verify FAIL (shell lấy exit code của
`tail`). Lỗi này đã xảy ra thật — ghi ra log rồi `echo $?`.

════════════════════════════════════════════════════════════════════════
LUẬT CỨNG
════════════════════════════════════════════════════════════════════════
1. packages/ui, packages/client, packages/contract KHÔNG import node:*, electron, driver.
2. KHÔNG có if (isElectron) trong component — khác biệt web ↔ desktop giải quyết bằng
   interface Transport và FileGateway.
3. Web và desktop phải khác nhau ĐÚNG dòng bootstrap (ADR-0009). Nếu bundling buộc bạn phân
   nhánh thêm, DỪNG và báo.
4. Secret không bao giờ vào log/error. Bản production PHẢI từ chối khởi động khi thiếu
   CORVUS_MASTER_KEY — hành vi này đã có trong engine.ts, đừng làm mất khi bundle.
5. KHÔNG tự quyết định kiến trúc. Thêm bundler mới là thêm dependency build có ảnh hưởng
   toàn repo → viết ADR nháp (kèm lý do chọn công cụ) rồi HỎI TÔI trước khi cài.
6. Test viết CÙNG PR.

════════════════════════════════════════════════════════════════════════
BÁO CÁO
════════════════════════════════════════════════════════════════════════
  1. Đã làm gì, theo tiêu chí nào ở Bước 5
  2. Đã kiểm chứng bằng lệnh nào — DÁN OUTPUT THẬT, gồm cả lần chạy `node dist/index.js`
  3. CÁI GÌ CHƯA LÀM và tại sao
  4. Cái gì bạn không chắc chắn — đặc biệt: bạn có kiểm được ABI Electron trên máy này không,
     hay chỉ suy luận?
  5. Danh sách module bạn khai `external` và lý do từng cái

BỐI CẢNH NGHIỆP VỤ: bản đóng gói sai ABI native không vỡ trong CI — nó vỡ trên máy khách
hàng, sau khi họ đã cài. Thà nói "chưa kiểm được phần Electron trên máy này" còn hơn báo xong.

Trả lời bằng tiếng Việt. Bắt đầu bằng BƯỚC 1.
````

---

## Ghi chú cho người giao việc

**Bước 1 ở prompt này bắt AI trình bày lựa chọn công cụ trước khi code** — khác các prompt
khác. Lý do: bundler cho app Node trong monorepo nguồn-hoá là quyết định có ảnh hưởng dài, và
sai thì phải làm lại từ đầu chứ không sửa dần được.

**Bẫy 1 là bẫy tôi từng tự vấp.** Đề xuất "đổi library sang tsup" nghe rất hợp lý và tôi đã
phải tự rút lại sau khi thấy nó tạo hai nguồn sự thật. Nếu AI mới đề xuất lại, đó không phải
dấu hiệu nó sai — nhưng hãy yêu cầu ADR trước, đừng để nó tự làm.

**Mục 4 của báo cáo** (kiểm được hay chỉ suy luận) là chỗ đáng đọc nhất: phần Electron/ABI rất
dễ bị báo "xong" trên cơ sở suy luận.
