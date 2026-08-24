# Implementation Plan: Kết nối toàn bộ workflow UI với DB thật & bộ kiểm thử UI chống hồi quy

**Branch**: `003-ui-workflow-integration` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-ui-workflow-integration/spec.md`

## Summary

Backend đã hoàn chỉnh (76/76 phương thức RPC có handler — `HANDLER_DEBT = 0` trong `tools/check-contract.ts`), nhưng tầng UI mới gọi 30. Nguyên nhân gốc không phải thiếu tính năng mà là **thiếu ba thứ hạ tầng ở tầng UI**:

1. **Không có ngữ cảnh hoạt động dùng chung** — `shell.ts` chỉ có ba chuỗi rời rạc `selTable`/`selNode`/`selField`, không lưu kết nối/engine/capabilities đang hoạt động. Không nút nào biết "đang mở gì".
2. **Không có nơi khai báo lệnh** — mỗi nút tự viết `onClick` tại chỗ, nên không thể gating theo năng lực, không thể tái dùng trên context menu, và không thể kiểm kê được.
3. **Không có cách kiểm thử UI** — test hiện tại dùng `renderToStaticMarkup` (render ra chuỗi, không có DOM) nên không thể click gì; `pnpm test:e2e` gọi `playwright test` mà Playwright chưa được cài.

Cách tiếp cận: dựng ba hạ tầng đó trước (ngữ cảnh hoạt động → sổ đăng ký lệnh → hai tầng kiểm thử UI), rồi đưa từng nhóm lệnh qua sổ đăng ký để 46 phương thức còn treo có đường vào, đồng thời cả 11 bề mặt context menu nhận lệnh từ cùng một nguồn. Cổng chống hồi quy dùng **ratchet pattern** đã có tiền lệ trong repo: `tools/check-ui-wiring.ts` với `UI_WIRING_DEBT` chỉ được phép giảm, đúng khuôn `HANDLER_DEBT` của `check-contract.ts`.

## Technical Context

**Language/Version**: TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`), Node ≥ 20, ESM
**Primary Dependencies**: React 18.3 · Zustand 5.0 (ADR-0007) · TanStack Query 5.66 · pnpm + Turborepo · Vitest 3.2
**Storage**: không đổi — `workspace.db` (SQLite qua `@corvus/storage`) giữ connection profile, vault, settings
**Testing**: Vitest 3.2 cho tầng rộng (thêm môi trường DOM, đã duyệt — xem [Cổng dependency](#cổng-dependency)) · Playwright cho tầng sâu (**đã** được quy định ở [testing-strategy.md §5](../../docs/04-plan/testing-strategy.md), gồm cả `_electron.launch` cho desktop)
**Target Platform**: web build + desktop build (Electron), phải chạy cả hai — ADR-0009
**Project Type**: Monorepo 24 packages & apps; feature này chạm `packages/ui`, `tools/`, và thư mục `e2e/` mới ở root
**Performance Goals**: mở kết nối + duyệt tới bảng < 30 s (SC-004) · tầng kiểm thử rộng ≤ 10 phút cho 7 engine · tầng sâu ≤ 15 phút (theo testing-strategy.md tầng 4) · mở bảng 100k dòng: first paint ≤ 1,5 s
**Constraints**: `packages/ui` không được import `node:*`/`electron`/driver (Cấm 1, depcruise `no-node-in-ui` + `no-engine-in-ui`) · không rẽ nhánh theo `driverId` (Cấm 2, eslint `no-driver-id-branching`) · mọi thao tác ghi qua preview-token (Cấm 5, ADR-0010) · không hard-code chuỗi hiển thị, đủ vi/en/ja · không hard-code màu, dùng token CSS (ui-rules §1)
**Scale/Scope**: 7 engine · 46 phương thức RPC cần nối · 11 bề mặt context menu · 59 FR / 7 SR / 16 SC · 6 user story

## Constitution Check

*GATE: phải qua trước Phase 0. Kiểm lại sau Phase 1.*

Dự án **không có** `.specify/memory/constitution.md` cục bộ. Constitution của plugin
(`${CLAUDE_PLUGIN_ROOT}/scaffold/.specify/memory/constitution.md`) giả định Next.js + shadcn/ui +
Prisma + Repository Pattern — **không áp dụng** cho monorepo Electron/React này; áp vào sẽ tạo
yêu cầu sai. Nguồn luật thật, theo tiền lệ của [002/plan.md](../002-docker-real-env-testing/plan.md):
[docs/05-rules/AGENTS.md §2](../../docs/05-rules/AGENTS.md) ("Mười điều tuyệt đối cấm"),
[coding-rules.md](../../docs/05-rules/coding-rules.md), [ui-rules.md](../../docs/05-rules/ui-rules.md),
10 ADR, và 8 luật `dependency-cruiser`.

| # | Luật | Trạng thái | Ghi chú |
|---|---|---|---|
| Cấm 1 | `ui`/`client` không import `node:*`, `electron`, driver | ✅ Pass | Toàn bộ việc nối là gọi RPC qua `useClient()`. Sổ đăng ký lệnh là code UI thuần |
| Cấm 2 | Không rẽ nhánh theo `driverId` | ⚠️ **Rủi ro cao nhất của feature** | Gating cho 11 bề mặt × 7 engine là nơi rất dễ tuồn `if (driverId === …)` vào. Giải: điều kiện khả dụng **chỉ** được khai báo bằng vị từ trên `CapabilitySet`; eslint `no-driver-id-branching` giữ cổng; thêm test khẳng định sổ đăng ký lệnh không tham chiếu `driverId`. Nhãn engine để hiển thị (`DRIVER_LABELS`) là **ánh xạ hiển thị**, không phải rẽ nhánh hành vi — giữ nguyên |
| Cấm 3 | Không `isElectron` trong component | ✅ Pass | Khác biệt web/desktop đi qua `Transport` và `FileGateway`; các lệnh cần hệ thống tệp (`file.*`) gọi RPC, không sờ `window.electron` |
| Cấm 4 | Không ghép chuỗi SQL | ✅ Pass | UI không sinh SQL. Lệnh "Sao chép tên có Quote" dùng `quoteIdentifier` từ `@corvus/sql` (đã là dependency của `ui`) |
| Cấm 5 | Ghi DB phải qua preview-token | ⚠️ **Cần cẩn trọng** | 46 phương thức cần nối gồm `ddl.applyRoutine/applyView/dropObject/maintain` và `data.applyChanges` — mỗi cái phải qua `preview*` trước. FR-052 còn buộc preview phải liệt kê **toàn bộ** đối tượng trong lô, không chỉ cái đầu. `check-contract.ts` đã giữ cổng ở tầng contract; cần thêm test UI khẳng định không có đường nào gọi `apply*` mà chưa qua dialog preview |
| Cấm 6 | Không đưa secret vào log | ⚠️ **Cần test** | SR-002 + FR-005: thông điệp lỗi mở kết nối hiện lên UI. Chuỗi kết nối và mật khẩu **không được** lọt vào đó. Cần test hồi quy trên thông điệp lỗi của cả 7 engine |
| Cấm 7 | Không trả cả mảng trong driver | ✅ Pass | Không sửa driver. Mở bảng lớn vẫn qua `data.browse` phân trang sẵn có |
| Cấm 8 | **Không tự quyết định kiến trúc** | ✅ **ĐÃ PHÊ DUYỆT 2026-08-24** | Cần thêm devDependency cho môi trường DOM ở tầng kiểm thử rộng. Người phụ trách đã chọn phương án khuyến nghị (`jsdom` + `@testing-library/react` + `@testing-library/user-event`). Xem [Cổng dependency](#cổng-dependency) |
| Cấm 9 | Không `eslint-disable` không giải thích | ✅ Pass | Không dự kiến cần |
| Cấm 10 | Không báo xong khi chưa chạy `pnpm verify` | ✅ Pass | Mọi mốc đều kèm lệnh kiểm chứng; feature này còn **mở rộng** `pnpm verify` |
| ADR-0007 | State bằng Zustand, không thêm thư viện state | ✅ Pass | Ngữ cảnh hoạt động mở rộng `shell.ts` hiện có, không thêm store mới |
| ADR-0009 | Web/desktop parity | ✅ Pass | Tầng sâu chạy trên **cả** web và desktop (Playwright projects), khớp testing-strategy.md §5 |
| ADR-0010 | Preview-token | ⚠️ xem Cấm 5 | |
| ui-rules §1.1 | Không hex trong component | ⚠️ **Cần sửa nợ có sẵn** | C-20: `ObjectContextMenu.tsx` đang hard-code `#ef4444`. Phải sửa khi đem component này vào dùng, không được mang theo vi phạm |
| ui-rules §5 | Chuỗi hiển thị qua i18n, đủ vi/en/ja | ⚠️ **Cần sửa nợ có sẵn** | C-20: cùng component đó hard-code chuỗi tiếng Việt. Nhãn lệnh + lý do vô hiệu hoá của 11 bề mặt đều phải vào từ điển 3 ngôn ngữ |
| depcruise `no-node-in-ui` | | ✅ Pass | |
| depcruise `no-engine-in-ui` | `ui`/`client` ⇏ `engine`/`driver-*`/`storage` | ✅ Pass | |
| depcruise `no-mock-in-runtime` | | ✅ Pass | Feature này **giảm** phụ thuộc mock, không tăng |
| depcruise `contract-is-leaf` | | ✅ Pass | Không sửa `contract` — không cần phương thức RPC mới |
| depcruise `no-orphans` (warn) | File không ai import | ⚠️ **Đang vi phạm sẵn** | C-19: `ObjectContextMenu`, `CellContextMenu`, `DdlPartialFailureDialog` là orphan **thật** nhưng cổng không bắt được vì `pathNot` loại trừ `index.ts`, mà chúng lại được re-export từ `index.ts`. Kế hoạch đưa cả ba vào dùng thật → hết orphan. Đề xuất siết luật để cổng bắt được lần sau |

**Kết luận cổng**: **qua được toàn bộ.** Mục duy nhất từng chặn (Cấm 8 — devDependency mới) đã được phê duyệt 2026-08-24. Sáu mục ⚠️ còn lại là điều kiện thiết kế phải giữ, không phải cổng chặn — đã có mục tương ứng trong Phase 1 và Constitution Re-check.

### Cổng dependency

AGENTS.md §3 buộc **dừng và hỏi** khi cần thêm dependency mới. Feature này cần:

| Dependency | Dùng cho | Đã được quy định sẵn? |
|---|---|---|
| `@playwright/test` | Tầng kiểm thử sâu (FR-017B), web + desktop qua `_electron.launch` | ✅ **Có** — [testing-strategy.md §5](../../docs/04-plan/testing-strategy.md) đã quy định tên công cụ, cấu hình `projects`, danh sách 18 spec, và luật selector `data-testid`. `package.json` đã có script `test:e2e` trỏ tới nó. Không phải quyết định mới |
| `jsdom` + `@testing-library/react` + `@testing-library/user-event` | Tầng kiểm thử rộng (FR-017): dựng UI có DOM thật để click được, cho cả 7 engine | ✅ **ĐÃ PHÊ DUYỆT 2026-08-24** — testing-strategy.md tầng 1 không nói dùng gì để render UI, và test UI hiện tại dùng `renderToStaticMarkup` nên chưa cần DOM. Người phụ trách đã duyệt cả ba, đặt ở `devDependencies` của root |

Không có cách nào đạt FR-017 mà không thêm môi trường DOM: `renderToStaticMarkup` trả về chuỗi tĩnh
— không có sự kiện, không có `useEffect`, nên không thể mở context menu hay bấm nút. Các phương án đã
cân nhắc nằm ở [research.md R1](./research.md).

**Điều kiện kèm theo khi hiện thực**:
- Cả ba nằm ở `devDependencies` của root, **không** ở `dependencies` của bất kỳ package nào — để không
  lọt vào bundle của cả ba target (đúng mối lo mà AGENTS.md §3 nêu).
- `vitest.config.ts` hiện đặt `environment: 'node'` cho toàn workspace. Không đổi giá trị toàn cục;
  chỉ bật `jsdom` cho các tệp test UI qua chú thích `@vitest-environment jsdom` hoặc `environmentMatchGlobs`,
  để 71 test hiện có không bị đổi môi trường chạy.
- Ba tệp test UI hiện dùng `renderToStaticMarkup` được giữ nguyên, không viết lại — chúng vẫn hợp lệ cho
  khẳng định ở mức đánh dấu. Test mới dùng testing-library.

## Security Design

*Feature này xử lý credential database, thông điệp lỗi hiển thị, và thao tác ghi phá huỷ → bắt buộc điền (SR-001…SR-007).*

### Threat Model

| Threat | Impact | Mitigation |
|---|---|---|
| Chuỗi kết nối hoặc mật khẩu lọt vào thông điệp lỗi mở kết nối hiện trên UI (FR-005) | Critical | `redact()` ở biên engine trước khi lỗi rời khỏi tầng dưới; test hồi quy trên cả 7 engine khẳng định thông điệp không chứa mật khẩu, host đầy đủ, hay vết ngăn xếp (SR-002) |
| Lệnh phá huỷ (Drop, Truncate, Empty) chạy mà người dùng chưa thấy SQL | Critical | Mọi lệnh ghi đi qua `preview*` → dialog → `apply*` với `previewToken`. FR-052: preview phải liệt kê câu lệnh cho **toàn bộ** đối tượng trong lô |
| Lệnh phá huỷ chạy trên đối tượng **khác** với đối tượng người dùng nhấp phải (do lệch giữa vùng chọn và mục dưới con trỏ) | Critical | FR-051 cấm âm thầm lấy đối tượng đầu tiên; edge case "nhấp phải ngoài vùng chọn" phải cập nhật vùng chọn trước. Preview hiện tên đầy đủ để người dùng đối chiếu |
| Người dùng chỉ có quyền đọc nhưng UI cho bấm lệnh ghi rồi nhận lỗi từ server | High | FR-016: gating theo quyền, vô hiệu hoá kèm lý do trước khi gọi |
| URI kết nối chứa credential bị sao chép ra clipboard qua lệnh "Copy URI" (FR-027) | High | Che phần credential khi hiển thị và khi sao chép; không ghi URI nguyên vẹn vào nhật ký |
| Bộ kiểm thử vô tình tác động lên database không thuộc môi trường kiểm thử | High | SR-007: cấu hình kiểm thử chỉ nhận host/port của stack container dự án; khẳng định tiền kiểm ở FR-021 |
| Dữ liệu dòng của người dùng lọt vào payload AI (`ai.chat` là một trong 46 phương thức cần nối) | Critical | Ngoại lệ **không thương lượng** ở AGENTS.md §9. Nối `ai.chat` chỉ được gửi lược đồ, không gửi dòng dữ liệu |

### Data Protection

| Field | Classification | Storage | Access Control |
|---|---|---|---|
| Mật khẩu kết nối | Confidential | Vault trong `workspace.db`, không bao giờ trả về UI dạng rõ | Chỉ engine đọc; UI chỉ gửi lên khi người dùng nhập mới |
| Khoá riêng / cụm mật khẩu SSH-SSL | Confidential | Chỉ lưu đường dẫn tệp | Nội dung không đi qua tầng UI |
| Chuỗi URI kết nối | Confidential | Sinh theo yêu cầu, không lưu | Che credential khi hiển thị/sao chép |
| Host, port, user, database | Internal | `workspace.db` | Hiển thị được trong chrome (FR-002) |
| Dữ liệu dòng đang mở | Internal | Chỉ trong phiên | Không ghi nhật ký; không gửi cho AI |
| Lịch sử truy vấn | Internal | `workspace.db` | Người dùng xoá được (`query.history.clear` — trong 46 phương thức cần nối) |
| Credential DB container phát triển | Public | `docker/dev-db/.env.example`, README | Chỉ cho môi trường cục bộ (SR-005) |

### Auth Strategy

- Dùng lại `security-provider` + `rbac-guard` đã có ở `packages/engine`; không thêm cơ chế phân quyền mới.
- Gating theo quyền ở UI (FR-016) là **lớp trải nghiệm**, không phải lớp bảo vệ: engine vẫn phải từ chối độc lập. Cần test khẳng định cả hai lớp cùng chặn (giống spec `readonly.spec.ts` đã dự kiến ở testing-strategy.md §5).
- Quyền hiện tại đọc từ `security.privileges` — một trong 46 phương thức cần nối; trước khi nối xong, gating theo quyền phải **mặc định an toàn** (coi như không đủ quyền cho lệnh ghi ở engine chưa nối được, kèm lý do rõ).

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-workflow-integration/
├── spec.md                      # Đã có (/speckit.specify + /speckit.clarify)
├── plan.md                      # Tệp này
├── research.md                  # Phase 0
├── data-model.md                # Phase 1
├── quickstart.md                # Phase 1
├── contracts/
│   ├── command-registry.md      # Hợp đồng nội bộ: khai báo lệnh + điều kiện khả dụng + bề mặt
│   ├── active-context.md         # Hợp đồng nội bộ: hình dạng ngữ cảnh hoạt động
│   └── no-rpc-change.md          # Khẳng định không thêm/đổi phương thức RPC
├── checklists/requirements.md   # Đã có
└── tasks.md                     # Phase 2 (/speckit.tasks — KHÔNG sinh ở bước này)
```

### Source Code (repository root)

```text
packages/ui/src/
├── store/
│   └── shell.ts                    # SỬA: thêm ngữ cảnh hoạt động (activeContext), bỏ selTable/selNode/selField
├── context/                        # MỚI: ngữ cảnh hoạt động
│   ├── activeContext.ts            #   hình dạng + phép chuyển trạng thái
│   ├── useActiveContext.ts         #   hook đọc ngữ cảnh của tab đang hoạt động
│   └── useCapabilities.ts          #   hook đọc CapabilitySet (dùng chung key react-query với useNavTree)
├── commands/                       # MỚI: sổ đăng ký lệnh — nguồn sự thật duy nhất
│   ├── types.ts                    #   Command, Availability, Surface, TargetKind, Cardinality
│   ├── registry.ts                 #   đăng ký + tra cứu theo bề mặt và mục tiêu
│   ├── availability.ts             #   đánh giá điều kiện → { enabled, hidden, reasonKey }
│   └── defs/                       #   khai báo lệnh theo nhóm (connection, object, data, query, tools…)
├── components/
│   ├── ContextMenu.tsx             # MỚI: khung menu chung cho cả 11 bề mặt (chuột + bàn phím)
│   ├── useContextMenu.ts           # MỚI: hook gắn onContextMenu + Shift+F10/Menu key
│   ├── Toolbar.tsx                 # SỬA: lấy lệnh từ registry; bỏ trạng thái/phiên bản hard-code
│   ├── MenuBar.tsx                 # SỬA: lấy lệnh từ registry; bỏ mục chết và mục trùng hành động
│   ├── ObjectToolbar.tsx           # SỬA: lấy lệnh từ registry
│   ├── TitleBar.tsx  StatusBar.tsx  InfoPane.tsx   # SỬA: đọc ngữ cảnh hoạt động thay chuỗi cứng
│   ├── NavPane.tsx                 # SỬA: tách chọn ↔ mở; gắn context menu; lỗi có nút thử lại
│   ├── navigation/ObjectContextMenu.tsx   # SỬA: bỏ hex + chuỗi cứng, chuyển sang registry (hết orphan)
│   ├── grid/CellContextMenu.tsx           # SỬA: cùng lý do (hết orphan)
│   └── dialogs/DdlPartialFailureDialog.tsx # SỬA: đưa vào dùng cho lệnh theo lô (hết orphan)
├── views/                          # SỬA: nối các view còn tĩnh (BackupView, CompareView, VirtualObjectsView)
├── wizards/                        # SỬA: Import/Export (L-5) + MỚI: Data Transfer, Data Sync, Structure Sync (L-6)
└── i18n/dictionaries.ts            # SỬA: nhãn lệnh + lý do vô hiệu hoá, đủ vi/en/ja

e2e/                                # MỚI (đã được quy định ở testing-strategy.md §5)
├── playwright.config.ts            #   projects: web-chromium / web-firefox / web-webkit / desktop
├── fixtures/                       #   tiền kiểm container + seed, chọn engine
└── specs/                          #   L-1…L-6 trên 2 engine

packages/ui/src/__tests__/          # SỬA + MỚI: tầng kiểm thử rộng (DOM thật, 7 engine)
tools/
├── check-ui-wiring.ts              # MỚI: cổng ratchet — UI_WIRING_DEBT chỉ được giảm (khuôn check-contract.ts)
└── check-contract.ts               # KHÔNG SỬA
```

**Structure Decision**: giữ nguyên toàn bộ ranh giới package hiện có — feature này **không** tạo package mới, khác với 002. Hai thư mục mới nằm **trong** `packages/ui/src` (`context/`, `commands/`) nên không chạm luật phụ thuộc; thư mục `e2e/` ở root đã được testing-strategy.md dự kiến. Ba component orphan (C-19) được **sửa và đưa vào dùng**, không viết lại — theo AGENTS.md §4 ("di chuyển/thay dữ liệu, không viết lại từ đầu").

## Kitchen Recipe Reference

Kitchen Recipe **không phát hiện được**. Dự án không có `.kitchen/`; các pattern T1 trong
`${CLAUDE_PLUGIN_ROOT}/scaffold/.kitchen/chef/kondate/patterns/` (`api/`, `cell/`, `component/`,
`state/`, `ui/`, `ux/`…) đều viết cho ngăn xếp Next.js/shadcn — không khớp Electron + React + Zustand
của repo này. Nguồn quy tắc thay thế đã dùng: [ui-rules.md](../../docs/05-rules/ui-rules.md),
[coding-rules.md](../../docs/05-rules/coding-rules.md),
[capability-matrix.md](../../docs/02-architecture/capability-matrix.md),
[testing-strategy.md](../../docs/04-plan/testing-strategy.md), ADR-0007/0009/0010.

Cũng **không có** PDL domain model (`domain-model.md` không tồn tại, không có marker `@parasol:`)
→ Phase 1 sinh `data-model.md` theo đường thông thường.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| ⚠️ **Thêm 3 devDependency** (`jsdom`, `@testing-library/react`, `@testing-library/user-event`) — **chờ phê duyệt theo Cấm 8** | FR-017 buộc phủ cả 7 engine bằng cách thao tác qua giao diện. `renderToStaticMarkup` hiện dùng trả về chuỗi tĩnh: không sự kiện, không `useEffect`, nên không thể bấm nút hay mở context menu | (a) Chỉ dùng Playwright cho cả hai tầng bị loại: khởi động app thật × 7 engine × mọi luồng vượt xa ngân sách 15 phút của testing-strategy.md tầng 4, và mỗi lần đỏ phải dò qua cả ngăn xếp. (b) Test gating bằng cách gọi hàm thuần, không render, bị loại: nó kiểm được `availability.ts` nhưng **không** kiểm được nút có thật sự vô hiệu hoá — tức bỏ đúng lớp lỗi mà C-13 đang gây ra. (c) Tự viết harness DOM tối thiểu bị loại: nhiều việc hơn, ít tin cậy hơn một thư viện chuẩn |
| **Sổ đăng ký lệnh** — một lớp gián tiếp mới giữa component và hành động | FR-010 buộc mỗi lệnh khai báo điều kiện khả dụng **và** tập bề mặt; FR-025 buộc kiểm kê được. Không có nơi khai báo tập trung thì cả hai đều không thực hiện được, và 11 bề mặt context menu sẽ phải nhân bản logic gating | Giữ `onClick` tại chỗ như hiện nay bị loại: đó chính là nguyên nhân C-10 (ba nút cùng hành động), C-11 (menu chết), C-13 (không có `disabled`). Nhân bản lệnh cho từng bề mặt bị loại vì vi phạm nguyên tắc "một khái niệm, một hiện thực" (AGENTS.md §2 bước 2) và làm FR-046 (một quyết định gating duy nhất) không thể giữ |
| **Hai tầng kiểm thử** thay vì một | Q1 = C. Tầng rộng cho bao phủ 7 engine với chi phí thấp; tầng sâu chứng minh app đã đóng gói chạy thật (bắt được lỗi transport/IPC mà tầng rộng bỏ qua) | Chỉ tầng rộng bị loại: không chứng minh được app thật chạy, mà chính lỗi người dùng báo ("mở connection thì lỗi") nằm ở đường chạy thật. Chỉ tầng sâu bị loại: xem ô đầu bảng. Giảm rủi ro lệch bằng cách **bắt buộc hai tầng dùng chung một bộ seed và chung một tập khẳng định về nội dung DB** |
| **Ratchet `UI_WIRING_DEBT`** — cho phép nợ tồn tại có kiểm soát trong `pnpm verify` | 46 phương thức không thể nối trong một PR. Không có ratchet thì cổng phải hoặc đỏ suốt (bị bỏ qua) hoặc chỉ bật ở cuối (không chặn được hồi quy giữa đường) | Cổng nhị phân bật ngay bị loại vì sẽ đỏ liên tục và mất tác dụng. Không có cổng bị loại vì đó đúng là lý do C-01 tồn tại mà không ai phát hiện. **Đã có tiền lệ trong repo**: `HANDLER_DEBT` ở `tools/check-contract.ts` — không phải mẫu mới |

---

## Phase 0 — Outline & Research

Xem [research.md](./research.md). Mười hạng mục R1…R10, gồm hai điểm Outstanding/Deferred mà
`/speckit.clarify` đã chuyển sang giai đoạn kế hoạch (mục tiêu độ trễ, tín hiệu quan sát) và
lựa chọn 2 engine cho tầng sâu.

## Phase 0.5 — PDL & Kitchen

Không có PDL domain model, không có Kitchen Recipe khớp. Xem [Kitchen Recipe Reference](#kitchen-recipe-reference).

## Phase 1 — Design & Contracts

Xem [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Constitution Re-check (sau Phase 1)

| Mục từng ⚠️ | Sau thiết kế | Cách giữ |
|---|---|---|
| Cấm 2 — rẽ nhánh `driverId` | ✅ Đã khu trú | `availability.ts` chỉ nhận `CapabilitySet`; kiểu của `Availability` **không có** trường nào mang `driverId`. Cổng: eslint `no-driver-id-branching` + test khẳng định |
| Cấm 5 — preview-token | ✅ Đã khu trú | `Command` có trường `write: 'none' \| 'preview-required'`; lệnh `preview-required` chỉ gọi được qua đường có `previewToken`. Cổng: test khẳng định không lệnh nào gọi `apply*` trực tiếp |
| Cấm 6 — secret vào log | ⚠️ Vẫn cần test | Không thể chứng minh bằng thiết kế; cần test hồi quy trên thông điệp lỗi 7 engine (đã có mục trong data-model + quickstart) |
| Cấm 8 — dependency mới | ✅ Đã phê duyệt 2026-08-24 | Ba devDependency ở root; `jsdom` bật theo glob, không đổi `environment` toàn cục |
| ui-rules §1.1 + §5 — hex và chuỗi cứng | ✅ Đã khu trú | Nhãn và lý do lấy từ `dictionaries.ts` qua khoá; màu lấy từ token. Cổng: test khẳng định `ContextMenu.tsx` và các `defs/` không chứa hex hay chuỗi hiển thị |
| depcruise `no-orphans` | ✅ Hết orphan | Ba component vào dùng thật. Kèm đề xuất siết `pathNot` để cổng bắt được orphan re-export qua `index.ts` |

**Kết luận**: không còn cổng chặn. Không có vi phạm nào phát sinh từ thiết kế. Mục Cấm 6 (secret vào thông điệp lỗi) không chứng minh được bằng thiết kế nên phải giữ bằng test hồi quy 7 engine.

## Phase 2 — Tasks

Chưa sinh. Cổng dependency đã mở → có thể chạy `/speckit.tasks`.

Thứ tự bắt buộc do phụ thuộc kỹ thuật, không phải do ưu tiên nghiệp vụ:

```
0. Cài 3 devDependency (đã duyệt)      ← chặn tầng kiểm thử rộng
1. Ngữ cảnh hoạt động (US1)            ← chặn US2
2. Sổ đăng ký lệnh + gating (US2)      ← chặn US4, US5, context menu
3. Hai tầng kiểm thử + ratchet (US3)   ← chạy song song được với 1–2, nhưng phải xanh trước khi mở 4
4. Nối 46 phương thức (US4) ‖ Bộ công cụ Tools (US5)
5. Hàng đợi US6 (chỉ lập bảng)
```

Trong đó **L-1…L-6 là thứ tự nghiệm thu tuyệt đối** bên trong bước 4–5, theo mục "Luồng cốt lõi"
của spec.
