# Contract: sổ đăng ký lệnh (nội bộ `packages/ui`)

**Feature**: 003-ui-workflow-integration · **Date**: 2026-08-24

Đây là hợp đồng **nội bộ tầng UI**, không phải hợp đồng RPC. Nó là nguồn sự thật duy nhất cho
"lệnh nào tồn tại, khi nào dùng được, xuất hiện ở đâu" — thứ đang thiếu và là nguyên nhân của
C-10, C-11, C-12, C-13, C-19.

Nơi ở: `packages/ui/src/commands/`. Xem [research.md R3](../research.md) để biết vì sao ở đây.

---

## 1. Hình dạng

```ts
// commands/types.ts  — kiểu, không có hiện thực
export interface Command {
  readonly id: string                       // ổn định; dùng cho data-testid và cổng kiểm kê
  readonly labelKey: DictKey                // KHOÁ i18n, không phải chuỗi
  readonly availability: Availability
  readonly surfaces: readonly Surface[]     // FR-010(b) — không được rỗng
  readonly targets: readonly TargetKind[]   // FR-045
  readonly cardinality: 'single' | 'multi'  // FR-050
  readonly write: 'none' | 'preview-required'  // Cấm 5 / ADR-0010
  readonly rpc: readonly string[]           // đầu vào cổng ratchet
  run(ctx: CommandContext): Promise<void>   // FR-026 — không bao giờ null
}

export interface Availability {
  readonly needsConnection: boolean
  readonly capability?: (caps: CapabilitySet) => boolean   // Cấm 2: chỉ CapabilitySet
  readonly objectKinds?: readonly ObjectKind[]
  readonly permission?: string
}
```

**Ràng buộc kiểu là cổng chống Cấm 2**: `Availability` **không có** trường nào nhận `driverId`,
tên engine, hay chuỗi tự do. Muốn rẽ nhánh theo engine thì không có chỗ để viết. Đây là lý do
chọn hình dạng này thay vì một hàm `(ctx) => boolean` tự do.

---

## 2. Bất biến — mỗi cái đều kiểm được bằng máy

| # | Bất biến | Cách kiểm |
|---|---|---|
| I-1 | `surfaces` không rỗng | Test khẳng định trên toàn registry |
| I-2 | `run` không `null` — kiểu không có biến thể `null` | Trình biên dịch |
| I-3 | `labelKey` tồn tại ở **cả ba** từ điển vi/en/ja | Test khẳng định đối chiếu `dictionaries.ts` |
| I-4 | `write === 'preview-required'` ⇒ `rpc` chứa một `preview*` **và** `apply*` tương ứng | Test đối chiếu `METHODS` của `@corvus/contract` |
| I-5 | Không lệnh nào có `rpc` chứa `apply*` mà `write === 'none'` | Test khẳng định |
| I-6 | Không hai lệnh khác `id` có cùng `(run, surfaces, targets)` | Test khẳng định — chặn tái diễn C-10 |
| I-7 | Không tệp nào trong `commands/` chứa `driverId`, tên engine, hay so sánh chuỗi engine | eslint `no-driver-id-branching` + test khẳng định |
| I-8 | Không tệp nào trong `commands/` hay `ContextMenu.tsx` chứa mã hex màu hoặc chuỗi hiển thị | Test khẳng định — sửa C-20 |
| I-9 | `cardinality: 'multi'` chỉ được ở tập lệnh đã khai báo (Maintain, Drop, Export, chọn đối tượng cho Data Transfer & Import-Export) | Test khẳng định danh sách trắng — FR-050 |
| I-10 | Mỗi `Surface` kiểu `ctx-*` có ≥ 1 lệnh cho **mỗi** `TargetKind` của nó | Test khẳng định — nhấp phải không được ra menu rỗng |

---

## 3. Đánh giá khả dụng — một đường duy nhất

```ts
// commands/availability.ts
export function evaluate(
  cmd: Command,
  ctx: ActiveContext,
): AvailabilityVerdict
```

`AvailabilityVerdict` xem [data-model.md E4](../data-model.md).

**Ràng buộc FR-046**: đây là **hàm duy nhất** trong toàn UI quyết định lệnh có dùng được không.
Mọi bề mặt gọi chính nó. Cấm bề mặt nào tự tính lại.

**Ánh xạ trình bày (FR-046B)** nằm ở tầng render, **không** ở `evaluate`:

```
bề mặt tĩnh (toolbar / menubar / object-toolbar / palette):
    'disabled' → disabled + lý do        'hidden' → disabled + lý do   ← ép về disabled

bề mặt context menu (ctx-*):
    'disabled' → disabled + lý do        'hidden' → không render
```

Nghĩa là `evaluate` trả `hidden` **chỉ** cho lý do `engine-unsupported`; bề mặt tĩnh cố ý bỏ qua
gợi ý đó và vẫn hiện disabled, theo A-03. Một quyết định, hai cách trình bày.

---

## 4. Tra cứu theo bề mặt

```ts
// commands/registry.ts
export function commandsFor(
  surface: Surface,
  target: TargetKind,
): readonly Command[]
```

Trả về theo **thứ tự khai báo** trong registry — thứ tự menu là dữ liệu, không phải kết quả sắp xếp
ngẫu nhiên. Nhóm phân cách trong menu suy ra từ thứ tự này.

---

## 5. `CommandContext` — thứ `run` nhận được

```ts
export interface CommandContext {
  readonly active: ActiveContext        // gồm selection, capabilities, database, namespace
  readonly client: Client               // RPC; cách duy nhất chạm tầng dưới (Cấm 1)
  readonly openTab: (identity: TabIdentity) => void
  readonly openDialog: (id: DialogId) => void
  readonly requestPreview: (req: PreviewRequest) => Promise<PreviewToken>  // Cấm 5
}
```

**Ràng buộc Cấm 1**: `CommandContext` không phơi ra `node:*`, `electron`, hay driver nào. Lệnh cần
hệ thống tệp đi qua `client` với `file.*`.

**Ràng buộc Cấm 5**: lệnh có `write === 'preview-required'` **phải** gọi `requestPreview` và nhận
`PreviewToken` trước khi gọi `apply*`. Không có đường nào khác lấy được token.

**Ràng buộc FR-052**: với `cardinality: 'multi'`, `requestPreview` nhận **toàn bộ** `selection.names`
và preview phải liệt kê câu lệnh cho tất cả, không chỉ phần tử đầu.

---

## 6. Quan hệ với cổng ratchet

`tools/check-ui-wiring.ts` đọc registry và tính:

```
UI_WIRING_DEBT = |METHODS| − |{ m ∈ METHODS : ∃ cmd ∈ registry, m ∈ cmd.rpc }|
SURFACE_DEBT   = |{ s ∈ Surface, s khớp ctx-* : ¬∃ cmd ∈ registry, s ∈ cmd.surfaces }|
```

Khởi điểm đo 2026-08-24: `UI_WIRING_DEBT = 46`, `SURFACE_DEBT = 11`. Cả hai **chỉ được giảm**,
theo đúng khuôn `HANDLER_DEBT` của `tools/check-contract.ts`.

Điều này làm FR-025(b) và FR-025(c) thành **cổng máy** chứ chỉ là ý định: một lệnh gọi RPC nhưng
quên khai báo vào `rpc`, hay khai báo `surfaces` nhưng quên render, đều làm cổng đỏ.

---

## 7. Điều hợp đồng này KHÔNG làm

| | Lý do |
|---|---|
| Không thay `Transport`/`Client` | ADR-0002; lệnh chỉ là người gọi |
| Không giữ state riêng | ADR-0007: state ở Zustand `shell.ts`; registry là dữ liệu tĩnh |
| Không quyết định phím tắt | Đã có `ShortcutEditorModal` + cheatsheet; registry chỉ cung cấp `id` để phím tắt trỏ tới |
| Không sinh SQL | Cấm 4; SQL sinh ở `packages/sql` và `driver-*` |
