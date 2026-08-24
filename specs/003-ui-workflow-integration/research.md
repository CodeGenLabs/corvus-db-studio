# Phase 0 — Research: 003-ui-workflow-integration

**Date**: 2026-08-24 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Mười hạng mục, tất cả đã giải quyết. R9 và R10 giải quyết hai mục
Outstanding/Deferred mà `/speckit.clarify` đã chuyển sang giai đoạn kế hoạch.

---

## R1 — Công cụ cho tầng kiểm thử rộng *(ĐÃ PHÊ DUYỆT 2026-08-24)*

**Câu hỏi**: dựng UI có DOM thật để click được, cho cả 7 engine, bằng gì?

**Hiện trạng đo được**: `vitest.config.ts` đặt `environment: 'node'`. Ba tệp test UI hiện có dùng
`renderToStaticMarkup` từ `react-dom/server` — trả về **chuỗi HTML tĩnh**. Không có `document`,
không có sự kiện, `useEffect` không chạy, react-query không fetch. Không có `jsdom`, `happy-dom`,
`@testing-library/*` ở bất kỳ `package.json` nào trong workspace.

Đây chính là lý do cơ chế C-13 (mọi nút luôn bấm được) và C-19 (không bề mặt nào phản hồi nhấp phải)
tồn tại mà `pnpm verify` vẫn xanh: **không có test nào có khả năng bấm**.

**Decision**: `jsdom` + `@testing-library/react` + `@testing-library/user-event`, tất cả ở
`devDependencies` của root.

**Rationale**:
- `@testing-library/react` là chuẩn thực tế cho React 18 và có API `user-event` mô phỏng nhấp phải
  (`pointer` với `button: 'right'`) cùng bàn phím (`Shift+F10`) — đúng hai thứ FR-047/FR-047B cần.
- Chọn `jsdom` thay `happy-dom` vì **tương thích** quan trọng hơn tốc độ ở tầng này: nút cổ chai của
  tầng rộng là vòng đi-về tới database thật (7 container), không phải tốc độ DOM. Đổi 2–3× tốc độ DOM
  lấy rủi ro API DOM thiếu là đánh đổi sai ở đây.
- Giữ ở `devDependencies` nên không ảnh hưởng đóng gói cả ba target — đúng mối lo mà AGENTS.md §3
  nêu khi buộc hỏi về dependency.

**Alternatives considered**:
| Phương án | Vì sao loại |
|---|---|
| Chỉ dùng Playwright cho cả hai tầng | App thật × 7 engine × mọi luồng vượt xa ngân sách 15 phút của testing-strategy.md tầng 4. Mỗi lần đỏ phải dò qua cả ngăn xếp thay vì khu trú ở UI |
| Test `availability.ts` bằng hàm thuần, không render | Kiểm được logic gating nhưng **không** kiểm được nút có thật sự nhận `disabled` — tức bỏ đúng lớp lỗi C-13. Vẫn nên có, nhưng là bổ sung chứ không thay thế |
| `happy-dom` thay `jsdom` | Nhanh hơn nhưng thiếu một số API DOM; rủi ro không đáng đổi khi nút cổ chai là I/O database |
| Tự viết harness DOM tối thiểu | Nhiều việc hơn, ít tin cậy hơn, và tạo thêm một thứ phải bảo trì |

**Trạng thái**: người phụ trách đã duyệt cả ba (2026-08-24), đặt ở `devDependencies` của root. Điều
kiện kèm theo: không đổi `environment: 'node'` toàn cục của `vitest.config.ts` — chỉ bật `jsdom` theo
glob cho tệp test UI, để 71 test hiện có giữ nguyên môi trường chạy.

---

## R2 — Công cụ cho tầng kiểm thử sâu

**Decision**: Playwright (`@playwright/test`), với 4 project: `web-chromium`, `web-firefox`,
`web-webkit`, `desktop` (qua `_electron.launch`).

**Rationale**: **không phải quyết định mới.**
[testing-strategy.md §5](../../docs/04-plan/testing-strategy.md) đã quy định tên công cụ, hình dạng
`projects`, thư mục `e2e/playwright.config.ts`, danh sách 18 spec bắt buộc trước GA, và luật selector
`data-testid` (không dùng text vì i18n, không dùng class vì styling đổi). `package.json` đã có script
`test:e2e` trỏ tới `playwright test`. Việc còn thiếu là **cài và hiện thực**, không phải chọn.

Playwright cũng là công cụ duy nhất trong nhóm phủ được **cả** web và Electron bằng một cấu hình —
điều kiện của ADR-0009 (web/desktop parity).

**Alternatives considered**: WebdriverIO (có hỗ trợ Electron tốt) bị loại vì đi ngược quyết định đã
ghi trong testing-strategy.md, và Cấm 8 cấm tự đổi quyết định kiến trúc.

**Ghi chú lệch tài liệu**: AGENTS.md §1 bước 4 gọi `pnpm test:e2e:web`, nhưng `package.json` chỉ có
`test:e2e`. Cần thống nhất khi hiện thực (đề xuất thêm `test:e2e:web` và `test:e2e:desktop` để khớp tài liệu).

---

## R3 — Nơi ở của sổ đăng ký lệnh

**Decision**: `packages/ui/src/commands/` — code UI thuần, không thêm package.

**Rationale**: sổ đăng ký chỉ chứa nhãn (khoá i18n), vị từ trên `CapabilitySet`, tập bề mặt, và hàm
gọi RPC qua `useClient()`. Không có gì cần `node:*`, driver, hay engine → không chạm depcruise
`no-node-in-ui`/`no-engine-in-ui`. Không phải ranh giới package mới → không kích hoạt Cấm 8.

**Alternatives considered**:
| Phương án | Vì sao loại |
|---|---|
| Package mới `@corvus/commands` | Kích hoạt Cấm 8 mà không có lợi ích: chỉ `ui` dùng nó |
| Đặt trong `packages/contract` | Vi phạm depcruise `contract-is-leaf`, và điều kiện khả dụng là mối quan tâm của UI chứ của hợp đồng |
| Không có sổ đăng ký, giữ `onClick` tại chỗ | Chính là nguyên nhân C-10/C-11/C-13; và làm FR-010/FR-025/FR-046 không thực hiện được |

---

## R4 — Nơi ở của ngữ cảnh hoạt động

**Decision**: mở rộng `packages/ui/src/store/shell.ts` (Zustand, đã có), thêm `packages/ui/src/context/`
cho hình dạng và các hook đọc. Ba trường `selTable`/`selNode`/`selField` bị **thay thế**, không giữ song song.

**Rationale**: ADR-0007 đã chốt Zustand làm cơ chế state; thêm store mới hay thư viện khác là quyết
định kiến trúc (Cấm 8). Giữ ba trường cũ song song với ngữ cảnh mới sẽ tạo hai nguồn sự thật — đúng
loại lỗi mà C-04 đang gây ra.

**Điểm cần cẩn trọng**: ngữ cảnh phải gắn **theo tab** (FR-004), nên nó không phải một giá trị đơn ở
gốc store mà là thuộc tính của tab đang hoạt động. `shell.ts` đã có `tabs: Tab[]` + `activeTabId` nên
chỗ tự nhiên là mở rộng `Tab`.

---

## R5 — Cách nguồn `capabilities` đến được mọi nơi trong UI

**Decision**: hook `useCapabilities(connectionId)` đọc **cùng khoá react-query** mà `useNavTree` đang
dùng: `['connection', id, 'open']`. Không thêm lần gọi RPC nào.

**Rationale**: `useNavTree.ts:70-77` đã fetch và cache `CapabilitySet` với `staleTime: 5 * 60_000`.
Dùng lại đúng khoá đó cho toàn UI vừa đạt FR-012 (một nguồn năng lực) vừa không thêm tải lên server.
Đây là lý do C-05 tồn tại: dữ liệu đã có sẵn trong cache, chỉ không ai ngoài cây điều hướng đọc nó.

**Điểm cần sửa kèm**: `useNavTree` đặt `retry: 0` cho `connection.open`. FR-005 buộc có đường thử lại
→ chuyển sang cho phép `refetch()` chủ động từ nút "Thử lại", giữ `retry: 0` cho lần tự động (không
tự thử lại ngầm, vì mở kết nối có thể khoá tài khoản khi sai mật khẩu nhiều lần).

---

## R6 — Nguồn thông tin engine/phiên bản cho chrome

**Decision**: dùng `connection.status` — đã có handler, chưa được UI gọi (nằm trong 46 phương thức C-02).

**Rationale**: FR-002 buộc bỏ chuỗi cứng `MySQL 8.0.36 · utf8mb4` (C-06) và `sakila @ Local Dev` (C-07).
Thông tin thật phải đến từ server. `connection.status` là phương thức đã thiết kế cho đúng việc này;
không cần phương thức RPC mới → giữ được `contracts/no-rpc-change.md`.

Nhãn hiển thị của engine dùng lại `DRIVER_LABELS` đã có ở `useNavTree.ts:41-50`. **Đây là ánh xạ
hiển thị, không phải rẽ nhánh hành vi** — nên không vi phạm Cấm 2; cần comment giải thích tại chỗ
theo coding-rules ("bắt buộc comment ở chỗ trông như lỗi nhưng là đúng").

---

## R7 — Cách thực thi cổng kiểm kê FR-025

**Decision**: `tools/check-ui-wiring.ts` theo đúng khuôn **ratchet** của `tools/check-contract.ts`,
thêm vào `pnpm verify`. Ba hằng số nợ, chỉ được phép **giảm**:

| Hằng số | Giá trị khởi điểm (đo 2026-08-24) | Nghĩa |
|---|---|---|
| `UI_WIRING_DEBT` | **46** | Số phương thức RPC chưa có đường vào từ UI (76 − 30) |
| `SURFACE_DEBT` | **11** | Số bề mặt context menu chưa phản hồi nhấp phải (S-01…S-11) |
| `HARDCODED_CHROME_DEBT` | đo lúc hiện thực | Số chuỗi cứng mô tả kết nối/database/engine còn lại trong mã sản phẩm |

**Rationale**: `check-contract.ts` đã dùng chính mẫu này cho `HANDLER_DEBT` (hiện `= 0`, đã trả hết nợ
handler). Dùng lại mẫu đã có nghĩa là **không phải mẫu mới** → không kích hoạt Cấm 8, và người sau đọc
sẽ nhận ra ngay. Ratchet là cách duy nhất khiến cổng vừa chặn được hồi quy giữa đường vừa không đỏ
liên tục trong 46 bước.

**Alternatives considered**: cổng nhị phân bật ngay (đỏ liên tục → bị bỏ qua); bật ở cuối (không chặn
được hồi quy giữa đường); không có cổng (đúng lý do C-01 tồn tại mà không ai phát hiện trong nhiều tháng).

---

## R8 — Chọn 2 engine cho tầng kiểm thử sâu

**Decision**: **PostgreSQL** và **MySQL**.

**Rationale**: FR-017B buộc hai engine **khác đặc tính phân cấp**. Theo
[capability-matrix.md](../../docs/02-architecture/capability-matrix.md) §1:

| | `hasCatalogs` | `hasSchemas` | Vì sao chọn |
|---|:-:|:-:|---|
| PostgreSQL | ✅ | ✅ | Phân cấp **ba tầng** (database → schema → object) — đường đi dài nhất, phủ nhiều nhánh cây nhất |
| MySQL | ❌ | ❌ | `database ≡ schema`, UI hiện **một tầng** duy nhất — đúng cạnh biên mà edge case của spec nêu |

Hai engine này cũng khởi động nhanh nhất trong stack (giây, không phút như Oracle/MSSQL) — quan trọng
với ngân sách 15 phút của tầng 4. Chúng còn phủ khác biệt cú pháp có thật: `parameterStyle`
`dollar $1` ↔ `question ?`, `identifierQuote` `"` ↔ `` ` ``, và `RETURNING` ✅ ↔ ❌.

**Alternatives considered**: PostgreSQL + MongoDB phủ khác biệt lớn hơn (RDBMS ↔ document) nhưng bỏ mất
cạnh biên "một tầng của MySQL", vốn là nơi cây điều hướng dễ hiện schema rỗng. MongoDB vẫn được phủ ở
tầng rộng (cả 7 engine).

---

## R9 — Mục tiêu độ trễ *(giải quyết mục Outstanding của clarify)*

`/speckit.clarify` để lại "Non-Functional: Performance — Outstanding": spec chỉ có SC-004 (mở kết nối
< 30 s). Các số dưới đây suy ra từ ngân sách đã có trong
[testing-strategy.md](../../docs/04-plan/testing-strategy.md) §1 và §8, không phải số bịa.

**Decision**:

| Thao tác | Mục tiêu | Cơ sở |
|---|---|---|
| Mở context menu sau khi nhấp phải | ≤ 100 ms | Ngưỡng cảm nhận "tức thì"; menu chỉ đọc state đã có trong bộ nhớ nên không có lý do chậm hơn |
| Cập nhật trạng thái khả dụng của lệnh khi ngữ cảnh đổi (FR-015) | ≤ 100 ms, không nháy | Đánh giá vị từ trên `CapabilitySet` đã cache |
| Mở bảng 100k dòng — first paint | ≤ 1,5 s | Bộ seed mặc định là 100k (docker/dev-db); `data.browse` đã phân trang |
| Chạy truy vấn đơn giản → hiện dòng đầu | ≤ 500 ms sau khi server trả | Giới hạn là I/O, không phải UI |
| Tầng kiểm thử rộng, toàn bộ 7 engine | ≤ 10 phút | Nằm dưới ngân sách 15 phút của tầng 4 để hai tầng cộng lại vẫn vừa CI |
| Tầng kiểm thử sâu, 2 engine × L-1…L-6 | ≤ 15 phút | Ngân sách tầng 4 của testing-strategy.md §1 |

**Rationale**: các số này **kiểm được** nên đưa vào được acceptance test; nếu để trống thì "nhanh" trở
thành tính từ không đo được — đúng thứ mà mục "Ambiguous adjectives" của bảng phân loại cảnh báo.

**Ghi chú**: bảng này thuộc kế hoạch, không thêm SC mới vào spec — spec đã đóng ở 16 SC.

---

## R10 — Tín hiệu quan sát *(giải quyết mục Deferred của clarify)*

**Decision**: dùng lại `packages/engine/src/audit.ts` + `redact.ts` đã có; UI **không** thêm cơ chế
telemetry nào. Các sự kiện SR-004 yêu cầu ghi nhật ký được ánh xạ vào trường `audit` **đã khai báo
trong hợp đồng RPC** của từng phương thức (`check-contract.ts` đã bắt buộc mọi method có `permission`
và `audit`, và đang xanh).

| Sự kiện SR-004 | Phương thức mang `audit` | Ghi chú |
|---|---|---|
| Mở kết nối | `connection.open` | Thất bại cũng phải ghi, sau `redact()` |
| Thay đổi quyền | `security.applyGrant` | |
| Xoá đối tượng | `ddl.dropObject` | Lô: ghi từng đối tượng, không ghi một dòng cho cả lô |
| Xoá/sửa dữ liệu | `data.applyChanges` | |
| Chạy tác vụ ghi | `job.start`, `schedule.runNow` | |

**Rationale**: cơ chế đã tồn tại và đã có cổng máy giữ. Thêm tầng quan sát mới ở UI sẽ là quyết định
kiến trúc (Cấm 8) mà không giải quyết vấn đề nào của feature này.

**Điều CHƯA quyết và cố ý để lại**: định dạng xuất nhật ký cho vận hành (tệp, mức, luân chuyển) không
thuộc phạm vi feature này — nó là mối quan tâm của đóng gói/phát hành, không phải của tầng UI.

---

## Tổng kết: mọi NEEDS CLARIFICATION đã giải quyết

| Mục | Trạng thái |
|---|---|
| D-04 (công cụ điều khiển UI) | ✅ Giải quyết — R1 (tầng rộng) + R2 (tầng sâu) |
| Chọn 2 engine cho tầng sâu | ✅ Giải quyết — R8 |
| Performance targets (Outstanding) | ✅ Giải quyết — R9 |
| Observability signals (Deferred) | ✅ Giải quyết — R10 |
| Cổng dependency (Cấm 8) | ✅ Giải quyết — phê duyệt 2026-08-24, xem R1 |
