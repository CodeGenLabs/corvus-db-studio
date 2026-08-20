# Implementation Plan: Đối ứng đa engine + điều hướng theo cấp

**Branch**: `001-multi-engine-navigation` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-engine-navigation/spec.md`

## Summary

Làm luồng điều hướng **trung lập engine**: cây bên trái bung dần theo số cấp mà năng lực của
kết nối khai báo, nhóm đối tượng suy từ `CapabilitySet.objects`, và chọn một đối tượng mở một
tab bên phải có danh tính riêng. Sau đó thêm **SQL Server** làm engine thật thứ tư — engine đầu
tiên dùng đủ ba cấp phân tầng, nên nó là phép thử thật cho luồng vừa làm — kèm môi trường Docker
dựng lại được. Oracle, MongoDB, Redis chỉ đặc tả đường đi.

Cách tiếp cận kỹ thuật: **không thêm khái niệm mới ở tầng contract cho phần phân tầng**
(`hierarchy.hasCatalogs/hasSchemas` đã đủ diễn tả cả bốn tổ hợp), mở rộng đúng một enum
(`introspect.objects.kind`) và sinh nó từ `ObjectCapabilities` để hai bên không thể lệch, rồi
thêm hai bảng khai báo ở tầng UI (nhóm → nhãn/thứ tự, loại đối tượng → loại nội dung). Xem
[research.md](research.md) cho từng quyết định và phương án đã loại.

## Technical Context

**Language/Version**: TypeScript 5.7, strict mode. Node 22 cho tầng engine/driver.
**Primary Dependencies**: React 18 + Vite (UI), zustand (client state), TanStack Query (server
state), zod (contract), `mssql`/tedious (driver mới), `ws` (transport), vitest + testcontainers.
**Storage**: workspace SQLite (`better-sqlite3`) cho profile kết nối và bí mật. Dữ liệu người
dùng nằm ở database của chính họ — dự án này là **client**, không sở hữu lược đồ nào.
**Testing**: vitest (unit + conformance không cần Docker), vitest + testcontainers
(integration), Playwright cho luồng UI.
**Target Platform**: web app và Windows desktop (Electron) từ một codebase.
**Project Type**: monorepo pnpm + Turborepo, 19 package/app — không khớp mẫu single/web/mobile
của template; xem Project Structure.
**Performance Goals**: danh sách tên đối tượng của namespace 5 000 bảng ≤ 1 s (SC-003); mở app
với 10 kết nối ≤ 1 s và **0 truy vấn** (SC-001); stream giữ RAM phẳng theo IV-1/IV-2.
**Constraints**: UI không được import `node:*`/electron/driver (ép bằng dependency-cruiser);
không rẽ nhánh theo `driverId` ngoài package driver (ép bằng ESLint rule); mọi thao tác ghi qua
preview-token; SQL sinh tự động không ghép chuỗi.
**Scale/Scope**: 7 engine (4 đã chạy sau feature này), ~8 loại đối tượng mỗi engine, tab không
giới hạn cứng.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution của harness viết cho ứng dụng Next.js + Prisma. Dự án này là **công cụ quản trị
database đa nền tảng**, nên một số nguyên tắc áp dụng đúng tinh thần nhưng khác hình thức. Dưới
đây là đánh giá thật, không phải đánh dấu cho qua.

| # | Nguyên tắc | Kết luận | Căn cứ |
|---|---|---|---|
| I | Repository Pattern (NON-NEG) | **ĐẠT — khác hình thức** | Vai trò "repository" do **Driver SPI** (`DatabaseDriver`/`DriverConnection`, ADR-0003) và **Transport** (ADR-0002) đảm nhiệm. Logic nghiệp vụ chỉ phụ thuộc interface; đổi hiện thực qua `driverRegistry`. Không nơi nào gọi thẳng `pg`/`mysql2`/`better-sqlite3` ngoài package driver, và điều đó được **máy kiểm** bằng dependency-cruiser |
| II | Schema-First (Prisma/Drizzle là SSOT) | **LỆCH CÓ LÝ DO** | Xem Complexity Tracking CT-1 |
| III | Environment-Based Configuration | **ĐẠT** | `CORVUS_MASTER_KEY`, `CORVUS_DATA_DIR`, `CORVUS_HOST`, `CORVUS_AUTH_TOKEN`; production từ chối khởi động khi thiếu khoá chủ |
| IV | Migration-Based Schema Changes | **ĐẠT** | workspace.db có migration runner + `user_version`, từ chối mở tệp mới hơn app |
| V | Test-First Data Layer | **ĐẠT** | conformance suite là hợp đồng viết trước cho mọi driver; driver mới phải qua C1–C9 |
| VI | Technology Stack Standards (NON-NEG) | **ĐẠT MỘT PHẦN** | TypeScript strict ✔, React 18 ✔, Vite ✔, TanStack Query cho server state ✔, zustand cho client state ✔. **Lệch**: không Tailwind, không shadcn/ui, không React Router — xem CT-2 |
| VII | Quality Standards (NON-NEG) | **ĐẠT** | strict mode, không `any`, vitest. `pnpm verify` = lint + depcruise + typecheck + 262 test + check-contract + build, exit 0 |
| VIII | Performance Standards (NON-NEG) | **ĐẠT — có số đo** | IV-1/IV-2 đo bằng test thật; ngưỡng huỷ 200 ms đã ghim bằng test. Feature này thêm SC-003 (5 000 bảng ≤ 1 s) |
| IX | Security Standards (NON-NEG) | **ĐẠT — vượt yêu cầu**, một ngoại lệ | SecretVault, redaction, preview-token, read-only 2 lớp, xác thực token cho `/rpc` + `/ws`. **Ngoại lệ đã đo**: không validate zod từng `ResultChunk` (ADR-0008 cho phép; bench 1 triệu dòng = 1 515 ms CPU chặn event loop) |
| X | Accessibility Standards (NON-NEG) | **CHƯA ĐẠT — feature này phải làm** | Cây điều hướng là thành phần bắt buộc có bàn phím. Xem R-9 và task nhóm P |
| XI | Layer Dependency Rules (NON-NEG) | **ĐẠT — khác hình thức** | Phân tầng theo **package** thay vì theo thư mục `pages/components/hooks/services`. Ép bằng 7 luật dependency-cruiser + 3 ESLint rule tuỳ biến. Mạnh hơn kiểm bằng mắt |
| XII | Frontend-First Orchestration | **ĐẠT** | UI chỉ gọi RPC qua `Transport`; không biết mình đang chạy web hay desktop |

**Cổng Phase 0: QUA.** Hai chỗ lệch (II, VI) có lý do và ghi ở Complexity Tracking. Một chỗ
**chưa đạt** (X) không phải lý do chặn — nó là công việc *của chính feature này*, đã thành task.

### Re-evaluate sau Phase 1 (design)

| # | Nguyên tắc | Sau khi thiết kế |
|---|---|---|
| I | Repository Pattern | **vẫn ĐẠT** — driver SQL Server cắm vào cùng SPI, không thêm đường tắt |
| VI | Stack | **vẫn ĐẠT MỘT PHẦN như trên** — thiết kế không thêm dependency UI mới nào |
| IX | Security | **ĐẠT** — thiết kế thêm SR-006/SR-007 (mật khẩu không vào repo, bộ kiểm từ chối database nghiệp vụ), chặt hơn trạng thái trước |
| X | Accessibility | **ĐẠT SAU THIẾT KẾ** — vai trò `tree`/`treeitem` + bàn phím nằm trong data-model và task nhóm P |
| XI | Layer Dependency | **vẫn ĐẠT** — hai bảng khai báo mới nằm ở tầng UI, đọc capability từ contract; không có chiều phụ thuộc mới |

Không phát sinh vi phạm mới sau thiết kế.

## Security Design

### Threat Model

| Threat | Impact | Mitigation |
|---|---|---|
| Injection qua tên object lấy từ catalog (`users"; DROP TABLE x; --`) | Critical | Tên object là **dữ liệu không tin cậy** kể cả khi đến từ server của khách. Bind param ở mọi chỗ được; chỗ không bind được (tiền tố schema) đi qua allowlist rồi `quoteIdentifier`. ESLint rule `no-raw-sql-concat` chặn ở mức error |
| Mở app tự kết nối database production | High | FR-002: 0 truy vấn tới database cho tới khi người dùng mở kết nối. R-8: bỏ mọi giá trị mở/chọn mặc định |
| Bộ kiểm chạy DDL trên database nghiệp vụ | Critical | FR-029 + SR-007: bộ kiểm tự tạo database riêng và **từ chối chạy** nếu đích không mang dấu hiệu dùng riêng cho kiểm |
| Mật khẩu container lọt vào repo | High | SR-006: mật khẩu sinh trong lần chạy hoặc lấy từ biến môi trường. Không có mật khẩu nào trong mã nguồn/tài liệu |
| Ghi ngoài ý muốn trên kết nối chỉ đọc | Critical | Đã có 2 lớp (bộ phân loại câu lệnh ở engine + `default_transaction_read_only` ở session). Feature này thêm lớp thứ ba ở UI: FR-020 không chào mời hành động ghi |
| Chứng chỉ TLS tự ký của SQL Server bị tin bừa | High | `trustServerCertificate` mặc định `false`, **không có tuỳ chọn UI để bỏ qua**. Môi trường kiểm bật cờ đó qua biến môi trường riêng của nó |
| Đường dẫn tệp / tên database lộ ra ngoài phiên của chủ kết nối | Medium | Thông báo lỗi không mang chuỗi kết nối, dấu vết ngăn xếp, hay `cause` |

### Data Protection

| Field | Classification | Storage | Access Control |
|---|---|---|---|
| Mật khẩu database, khoá SSH | Confidential | SecretVault (OS keychain hoặc AES-256-GCM có phong bì) | chỉ rời vault để đi vào driver; không bao giờ vào RPC result |
| Đường dẫn tệp SQLite | Internal | workspace.db | chỉ chủ kết nối |
| Tên object từ catalog | Untrusted input | không lưu | xử lý như dữ liệu ngoài |
| Giá trị ô dữ liệu | Confidential | không lưu | không vào log/telemetry/AI |
| Cấu trúc tài liệu suy luận (MongoDB) | Internal | không lưu | luôn kèm nhãn "suy luận từ N mẫu" |
| Mật khẩu môi trường kiểm | Confidential | sinh trong lần chạy | không ghi ra tệp nào |

### Auth Strategy

- Dùng lại lớp xác thực token đã có ở `/rpc` và `/ws`; feature này **không** thêm cơ chế mới.
- Không thêm phạm vi quyền mới: mọi thao tác đọc dùng `introspect:read` đã có.
- `createSingleUserAuth()` vẫn là chủ thể mặc định cho bản một người dùng; feature này không
  chạm phần đó.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-engine-navigation/
├── plan.md              # tệp này
├── research.md          # Phase 0 — 9 quyết định + 3 câu hỏi thiết kế còn mở
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 — dựng môi trường và kiểm bằng tay
├── contracts/           # Phase 1 — thay đổi hợp đồng RPC
│   └── introspect-object-kind.md
├── checklists/
│   └── requirements.md  # đã có, 16/16
└── tasks.md             # Phase 2 (/speckit.tasks — KHÔNG do plan tạo)
```

### Source Code (repository root)

```text
packages/
├── contract/src/
│   ├── capabilities.ts            # SỬA: sinh ObjectKind từ ObjectCapabilities
│   ├── methods/introspect.ts      # SỬA: mở rộng enum kind của introspect.objects
│   └── models/view.ts             # SỬA: tách ContentKind (gắn object) khỏi ToolKind
├── driver-core/src/conformance/
│   ├── dialect.ts                 # THÊM: MSSQL_CONFORMANCE
│   └── fixture.ts                 # THÊM: MSSQL_SETUP_SQL
├── driver-mssql/                  # MỚI: driver SQL Server
│   └── src/{driver,introspect,value,errors,capabilities}.ts
├── driver-postgres/src/           # SỬA: listObjects trả đủ nhóm đã khai
├── driver-mysql/src/              # SỬA: như trên
├── driver-sqlite/src/             # (đã sửa) + quyết ODQ-1 về hasCatalogs
├── engine/src/handlers/           # SỬA: introspect.objects nhận kind mới
└── ui/src/
    ├── components/
    │   ├── useNavTree.ts          # SỬA: số cấp và nhóm suy từ capability
    │   └── NavPane.tsx            # SỬA: bàn phím + vai trò accessibility của cây
    ├── navigation/
    │   ├── objectGroups.ts        # MỚI: bảng nhóm → nhãn/thứ tự
    │   └── contentForKind.ts      # MỚI: bảng loại object → loại nội dung
    ├── tabs/
    │   ├── tabIdentity.ts         # MỚI: dựng và so danh tính tab
    │   └── useTabs.ts             # MỚI: mở/focus/đóng
    ├── store/shell.ts             # SỬA: bỏ trạng thái mở/chọn mặc định; thêm danh sách tab
    └── views/DefinitionView.tsx   # MỚI: loại nội dung còn thiếu cho function/procedure/trigger

apps/web/server/src/engine.ts      # SỬA: đăng ký mssqlDriver
```

**Structure Decision**: giữ nguyên monorepo theo package đang có. Feature này thêm **một**
package (`driver-mssql`) và **hai** thư mục con trong `packages/ui/src` (`navigation/`, `tabs/`)
— đặt thành thư mục riêng thay vì nhét vào `components/` vì cả hai là **dữ liệu khai báo + logic
thuần**, không phải component, và cần test được mà không dựng React.

Không dùng cấu trúc `single/web/mobile` của template: dự án đã có ranh giới package được máy ép
(dependency-cruiser + ESLint), đổi sang cấu trúc thư mục phẳng là phá đúng cái đang bảo vệ
Constitution XI.

## Kitchen Recipe Reference

| Pattern | Recipe | Status | 振る舞い仕様 |
|---|---|---|---|
| `patterns/state/zustand.md` | — | accepted | tham khảo một phần |

**Kitchen Recipe: gần như không áp dụng được.** Lý do cụ thể, không phải bỏ qua cho nhanh:

- Thư mục `.recipes/` không tồn tại trong scaffold của harness bản 1.1.0 → không có recipe nào
  để tham chiếu.
- `patterns/state/zustand.md` viết cho **Next.js**, và khuyến nghị `persist` middleware để lưu
  vào `localStorage`. Feature này **cố ý không** lưu trạng thái mở của cây (Assumption 7 + R-8:
  phục hồi trạng thái mở sẽ tự chạy truy vấn lúc mở app, vi phạm FR-002). Phần dùng được là
  selector pattern để không re-render toàn bộ khi một tab đổi.
- Các pattern `ui/list.md`, `ui/layout.md`, `ui/table.md` giả định Tailwind + shadcn/ui — dự án
  này không dùng (xem CT-2).
- Repo không có `.kitchen/` riêng, nên không có manifest golden recipe nào để tham chiếu (bước
  đó của quy trình `/speckit.specify` cũng đã bỏ vì lý do này).

## Phase 0 · Outline & Research → hoàn thành

Đầu ra: [research.md](research.md). 9 quyết định (R-1→R-9), mỗi quyết định có căn cứ đối chiếu
mã nguồn và phương án đã loại. Không còn `NEEDS CLARIFICATION` nào trong Technical Context.

Ba câu hỏi thiết kế nội bộ còn mở (ODQ-1 hasCatalogs của SQLite, ODQ-2 chỗ đặt state chưa lưu,
ODQ-3 ảnh Docker cho conformance) — không đổi phạm vi hay hành vi người dùng, nên không chặn
`/speckit.tasks`. ODQ-1 phải chốt trước khi viết mã cây.

## Phase 0.5 · PDL / Kitchen

- `specs/001-multi-engine-navigation/domain-model.md`: **không có** → Phase 1 sinh
  `data-model.md` theo đường thông thường.
- Kitchen T1 pattern: xem mục trên.

## Phase 1 · Design & Contracts → hoàn thành

Đầu ra: [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md).

Thứ tự hiện thực khuyến nghị (mỗi bước để lại repo ở trạng thái `pnpm verify` xanh):

| Bước | Nội dung | Vì sao thứ tự này |
|---|---|---|
| 1 | Contract: sinh `ObjectKind` từ `ObjectCapabilities`, mở rộng enum `introspect.objects.kind`, tách `ContentKind`/`ToolKind` | mọi bước sau đọc kiểu từ đây; làm sau thì phải sửa hai lần |
| 2 | Driver: `listObjects` của postgres + mysql trả đủ nhóm đã khai, kèm test chống hồi quy như SQLite đã có | phát hiện ngay chỗ nào khai khống, trước khi UI dựa vào |
| 3 | UI: hai bảng khai báo (`objectGroups`, `contentForKind`) — logic thuần, test không cần React | rẻ nhất và là nền cho cả cây lẫn tab |
| 4 | UI: `useNavTree` suy số cấp + nhóm từ capability; xoá trạng thái mở/chọn mặc định | đây là US1 + US2 + US5, phần lớn giá trị |
| 5 | UI: mô hình tab theo danh tính + `DefinitionView` | US3 + US4; cần bước 3 |
| 6 | UI: bàn phím + vai trò accessibility của cây | Constitution X; tách riêng để không lẫn với bước 4 |
| 7 | `driver-mssql` + `MSSQL_CONFORMANCE` + môi trường Docker | US7 — phép thử thật cho bước 4, và là chỗ lộ ra chỗ nào còn giả định 2 cấp |
| 8 | Tài liệu đường đi cho Oracle / MongoDB / Redis | US8; viết sau khi SQL Server đã dạy ta điều gì thật sự khó |

Bước 7 **cố ý đặt sau** bước 4–6: nếu làm trước, ta sẽ vừa gỡ lỗi driver mới vừa gỡ lỗi luồng
mới cùng lúc và không biết lỗi thuộc bên nào.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| **CT-1** · Không dùng Prisma/Drizzle làm SSOT (lệch Constitution II) | Sản phẩm này là **client của database bất kỳ**. Lược đồ mà nó làm việc với là lược đồ của khách hàng, biết được lúc chạy chứ không khai lúc build. Không có schema nào để sinh kiểu từ | Prisma/Drizzle chỉ mô hình hoá được lược đồ **do mình sở hữu**. Dùng chúng nghĩa là chỉ làm việc được với đúng lược đồ mình khai trước — tức là không còn là công cụ quản trị database. SSOT thay thế: **zod** cho hợp đồng RPC (ADR-0008) + **Driver SPI** cho khác biệt engine (ADR-0003), cả hai đều được `check-contract` và conformance suite kiểm bằng máy |
| **CT-2** · Không dùng Tailwind / shadcn/ui / React Router (lệch Constitution VI) | Giao diện là **một cửa sổ nhiều pane** kiểu ứng dụng desktop, không phải nhiều trang. Không có điều hướng theo URL nên không có việc cho React Router. Hệ màu/khoảng cách dùng CSS custom property để đổi theme tức thời và để bản desktop dùng lại nguyên | Tailwind + shadcn/ui hợp với app nhiều trang; ở đây chúng thêm một tầng token thứ hai song song với biến CSS đang có, tức là hai nguồn sự thật cho cùng một hệ thiết kế. Ràng buộc thay thế: `docs/05-rules/ui-rules.md` khoá bảng cỡ chữ và bảng màu, và cấm mã màu viết thẳng |
| **CT-3** · Thêm một package mới (`driver-mssql`) | Mỗi engine là một ranh giới phụ thuộc riêng: `mssql` chỉ được xuất hiện trong package của nó, và dependency-cruiser ép điều đó | Nhét SQL Server vào `driver-core` làm mọi app kéo theo `mssql` kể cả khi không dùng, và mất khả năng kiểm "driver không import engine khác" |
| **CT-4** · Không validate zod từng `ResultChunk` (ngoại lệ của Constitution IX) | Đã đo: 1 triệu dòng = **1 515 ms** CPU chặn event loop, và `safeParse` trả bản sao sâu nên chunk tồn tại hai lần trong RAM đúng lúc cao điểm | Validate đầy đủ phá IV-1 (≤ 3 chunk trong RAM) và IV-2 (≤ 400 MB cho 10 triệu dòng). Params **vẫn** validate đầy đủ; ngoại lệ đúng phạm vi chunk kết quả, và ADR-0008 đã nêu sẵn ngoại lệ này. Số đo tái tạo được: `npx tsx tools/bench/chunk-validate.bench.ts` |
