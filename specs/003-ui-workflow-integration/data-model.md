# Phase 1 — Data Model: 003-ui-workflow-integration

**Date**: 2026-08-24 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Feature này **không** thêm bảng vào `workspace.db` và **không** thêm phương thức RPC. Các thực thể
dưới đây là mô hình **trong bộ nhớ ở tầng UI** — thứ đang thiếu và là nguyên nhân gốc của C-04.

Mọi tên trường viết bằng tiếng Anh theo AGENTS.md §5; phần diễn giải bằng tiếng Việt.

---

## E1 — `ActiveContext` — ngữ cảnh hoạt động

Thoả FR-001…FR-004. Gắn **theo tab** (`Tab` trong `shell.ts`), không phải một giá trị đơn ở gốc store.

| Trường | Kiểu | Bắt buộc | Nghĩa |
|---|---|---|---|
| `connectionId` | `string` | ✅ | Kết nối đang hoạt động |
| `connectionName` | `string` | ✅ | Nhãn người dùng đặt — dùng cho chrome (FR-002) |
| `driverId` | `string` | ✅ | **Chỉ** để tra `DRIVER_LABELS` và chọn biểu tượng. Cấm dùng để rẽ nhánh hành vi (Cấm 2) |
| `serverVersion` | `string \| null` | | Từ `connection.status`; `null` khi chưa nạp xong |
| `serverEncoding` | `string \| null` | | Từ `connection.status` — thay chuỗi cứng `utf8mb4` (C-06) |
| `database` | `string \| null` | | `null` khi engine không có catalog hoặc chưa chọn |
| `namespace` | `string \| null` | | Schema; `null` khi `caps.hierarchy.hasSchemas === false` |
| `selection` | `ObjectSelection` | ✅ | Xem E2 |
| `capabilities` | `CapabilitySet \| null` | | `null` khi chưa mở xong; xem quy tắc mặc định an toàn bên dưới |
| `connectionState` | `'closed' \| 'opening' \| 'open' \| 'error'` | ✅ | Thay trạng thái "đã kết nối" cứng (C-06) |
| `lastError` | `RedactedError \| null` | | Xem E5. Thoả FR-005 |

### Phép chuyển trạng thái của `connectionState`

```
closed ──open()──▶ opening ──thành công──▶ open
                      │                     │
                      └──thất bại──▶ error ◀┴── mất kết nối giữa phiên
                                       │
                                       └──retry()──▶ opening
open ──close()──▶ closed
```

**Bất biến**:
- `capabilities !== null` **chỉ** khi `connectionState === 'open'`.
- `lastError !== null` **chỉ** khi `connectionState === 'error'`.
- Khi vào `closed`: `database`, `namespace`, `selection`, `capabilities` phải bị xoá (FR-007).
- **Mặc định an toàn**: khi `capabilities === null`, mọi lệnh cần năng lực engine ở trạng thái vô hiệu
  hoá với lý do "đang xác định năng lực" — **không** được coi là "có hỗ trợ". Đây là điểm khác biệt
  cố ý so với `useNavTree.ts:85` hiện tại (`caps?.hierarchy ? … : true` — mặc định *có* catalog), vì
  ở cây điều hướng đoán sai chỉ tốn một lần fetch, còn ở lệnh ghi đoán sai có thể chạy DDL sai engine.

---

## E2 — `ObjectSelection` — tập đối tượng đang chọn

Thoả FR-001 (đổi từ số ít sang tập), FR-050…FR-052.

| Trường | Kiểu | Nghĩa |
|---|---|---|
| `kind` | `ObjectKind \| null` | Loại đối tượng; `null` khi chọn rỗng hoặc chọn lẫn loại |
| `names` | `readonly string[]` | Tên các đối tượng; rỗng nghĩa là chưa chọn gì |
| `anchor` | `string \| null` | Đối tượng dưới con trỏ lúc mở context menu — dùng cho lệnh một-đối-tượng |

**Bất biến**:
- Mọi phần tử trong `names` phải cùng `kind`. Chọn lẫn loại → `kind = null`, và mọi lệnh cần loại đối
  tượng đều vô hiệu hoá kèm lý do.
- `anchor` nếu khác `null` phải nằm trong `names`. Nhấp phải ngoài vùng chọn → **thay** `names` bằng
  `[mục dưới con trỏ]` rồi đặt `anchor`, theo edge case của spec.
- Lệnh khai báo `cardinality: 'single'` chỉ chạy được khi `names.length === 1` (FR-051) —
  **không** được lấy `names[0]` khi `length > 1`.

---

## E3 — `Command` — lệnh giao diện

Thoả FR-010, FR-049, FR-050. Nguồn sự thật duy nhất cho mọi bề mặt.

| Trường | Kiểu | Nghĩa |
|---|---|---|
| `id` | `string` | Định danh ổn định, dùng cho `data-testid` và cho cổng kiểm kê |
| `labelKey` | `keyof Dict` | **Khoá i18n**, không phải chuỗi. Cấm chuỗi cứng (ui-rules §5, sửa C-20) |
| `availability` | `Availability` | Xem E4 |
| `surfaces` | `readonly Surface[]` | Tập bề mặt — thoả FR-010(b), là cơ sở của FR-049 |
| `targets` | `readonly TargetKind[]` | Mục tiêu nhấp phải áp dụng được (S-01…S-11 có tập riêng) |
| `cardinality` | `'single' \| 'multi'` | FR-050. `'multi'` giới hạn ở Maintain / Drop / Export / chọn đối tượng cho Data Transfer & Import-Export |
| `write` | `'none' \| 'preview-required'` | Cấm 5 / ADR-0010. `'preview-required'` chỉ gọi được qua đường có `previewToken` |
| `rpc` | `readonly string[]` | Các phương thức RPC lệnh này gọi — **đầu vào của cổng ratchet** `UI_WIRING_DEBT` |
| `run` | `(ctx) => Promise<void>` | Hành động. Không được `null` (sửa C-12) |

**Bất biến**:
- `surfaces` không được rỗng — lệnh không xuất hiện ở đâu là lệnh chết.
- `run` không được `null`; kiểu **không có** biến thể `null`, khác `MenuBar.tsx:8` hiện tại
  (`action: (() => void) | null`).
- Nếu `write === 'preview-required'` thì `rpc` phải chứa một phương thức `preview*` **và** một `apply*`
  tương ứng. Cổng: khẳng định đối chiếu với `METHODS` của `@corvus/contract`.
- `labelKey` phải tồn tại ở **cả ba** từ điển vi/en/ja. Cổng: test khẳng định.
- Hai lệnh khác `id` không được có cùng `(run, surfaces, targets)` — chặn tái diễn C-10.

---

## E4 — `Availability` — điều kiện khả dụng

Thoả FR-010(a), FR-012, FR-016. **Không có trường nào mang `driverId`** — đây là cách khu trú Cấm 2 ở
mức kiểu dữ liệu, không chỉ ở mức quy ước.

| Trường | Kiểu | Nghĩa |
|---|---|---|
| `needsConnection` | `boolean` | Cần `connectionState === 'open'` |
| `capability` | `(caps: CapabilitySet) => boolean \| undefined` | Vị từ trên năng lực. `undefined` = không phụ thuộc năng lực |
| `objectKinds` | `readonly ObjectKind[] \| undefined` | Loại đối tượng áp dụng được |
| `permission` | `string \| undefined` | Quyền cần có; đối chiếu `security.privileges` |

### Kết quả đánh giá — `AvailabilityVerdict`

```
{ state: 'enabled' }
{ state: 'disabled', reason: DisabledReason }
{ state: 'hidden',   reason: DisabledReason }
```

`DisabledReason` là **union đóng**, mỗi giá trị có khoá i18n riêng:

| Lý do | Trình bày ở bề mặt tĩnh | Trình bày ở context menu |
|---|---|---|
| `no-connection` | disabled + lý do | disabled + lý do |
| `engine-unsupported` | disabled + lý do | **hidden** |
| `wrong-object-kind` | disabled + lý do | disabled + lý do |
| `no-selection` | disabled + lý do | disabled + lý do |
| `multi-selection-unsupported` | disabled + lý do | disabled + lý do |
| `insufficient-permission` | disabled + lý do | disabled + lý do |
| `capabilities-unknown` | disabled + lý do | disabled + lý do |

**Bất biến then chốt (FR-046)**: hàm đánh giá trả về **cùng một** `AvailabilityVerdict` cho mọi bề mặt.
Chỉ tầng trình bày mới ánh xạ `engine-unsupported` sang `hidden` khi bề mặt là context menu (FR-046B).
Không được có hai đường đánh giá song song.

---

## E5 — `RedactedError` — lỗi hiển thị được cho người dùng

Thoả FR-005, SR-002, Cấm 6.

| Trường | Kiểu | Nghĩa |
|---|---|---|
| `messageKey` | `keyof Dict` | Thông điệp đã phân loại, qua i18n |
| `detail` | `string \| null` | Chi tiết **đã qua `redact()`**; `null` khi không có gì an toàn để hiện |
| `retryable` | `boolean` | Quyết định có hiện nút "Thử lại" (FR-005) |

**Bất biến**: `detail` không được chứa mật khẩu, chuỗi kết nối đầy đủ, đường dẫn nội bộ, hay vết ngăn
xếp. Không chứng minh được bằng kiểu → **bắt buộc có test hồi quy trên cả 7 engine** (đã ghi ở
Constitution Re-check, mục Cấm 6).

---

## E6 — `Surface` và `TargetKind` — bề mặt và mục tiêu

Thoả FR-044, FR-045. Ánh xạ 1:1 với bảng kiểm kê S-01…S-11 trong spec.

```
Surface = 'toolbar' | 'menubar' | 'object-toolbar' | 'command-palette'
        | 'ctx-nav'          (S-01)  | 'ctx-object-list'  (S-02)
        | 'ctx-data-grid'    (S-03)  | 'ctx-sql-editor'   (S-04)
        | 'ctx-query-builder'(S-05)  | 'ctx-er-diagram'   (S-06)
        | 'ctx-tab-bar'      (S-07)  | 'ctx-toolbar'      (S-08)
        | 'ctx-snippet'      (S-09)  | 'ctx-job-list'     (S-10)
        | 'ctx-diff'         (S-11)
```

`TargetKind` là union các mục tiêu nhấp phải, theo cột "Mục tiêu nhấp phải" của bảng kiểm kê —
ví dụ `ctx-nav` nhận `'connection' | 'database' | 'namespace' | 'object-group' | 'object' | 'sub-element'`;
`ctx-data-grid` nhận `'cell' | 'row-header' | 'column-header' | 'empty'`.

**Bất biến**: mỗi bề mặt `ctx-*` phải có ít nhất một lệnh đăng ký cho **mỗi** `TargetKind` của nó —
nhấp phải mà ra menu rỗng là lỗi. Nhấp phải vùng trống phải cho các lệnh cấp bề mặt (làm mới, tạo
mới, thiết lập hiển thị), không cho lệnh cần đối tượng (edge case của spec).

---

## E7 — `SeedInventory` — sự thật kỳ vọng của bộ kiểm thử

Thoả FR-019, FR-020. **Không phải hằng số trong mã test** — đọc từ DB thật lúc chạy.

| Trường | Kiểu | Nghĩa |
|---|---|---|
| `engine` | `string` | Engine đang kiểm |
| `databases` | `readonly string[]` | Từ `introspect.databases` |
| `objectsByKind` | `Record<ObjectKind, readonly string[]>` | Từ `introspect.objects` |
| `rowCounts` | `Record<string, number>` | Từ `data.count`, cho khẳng định phân trang |

**Bất biến (FR-020)**: mọi khẳng định của bộ kiểm thử về nội dung DB phải so **UI ↔ `SeedInventory`
đọc lúc chạy**, không so UI ↔ danh sách viết cứng. Đây là điều kiện để acceptance scenario 3 của US3
đúng (thêm một bảng vào seed mà UI chưa cập nhật thì test phải đỏ).

---

## Quan hệ giữa các thực thể

```
Tab ──1:1──▶ ActiveContext ──1:1──▶ ObjectSelection
                  │
                  ├──▶ CapabilitySet   (từ @corvus/contract, không định nghĩa lại)
                  └──▶ RedactedError

Command ──1:1──▶ Availability ──đánh giá cùng ActiveContext──▶ AvailabilityVerdict
   │
   ├──n:m──▶ Surface        (FR-049: phải xuất hiện đủ trên tập này)
   └──n:m──▶ TargetKind     (FR-045: quyết định hiện trong menu nào)

CommandRegistry ──chứa──▶ Command[]
       │
       └──đầu vào──▶ tools/check-ui-wiring.ts   (ratchet UI_WIRING_DEBT / SURFACE_DEBT)

SeedInventory ──đối chiếu──▶ khẳng định của bộ kiểm thử   (FR-020)
```

---

## Điều KHÔNG thay đổi

| | Lý do |
|---|---|
| Lược đồ `workspace.db` | Không cần trường mới; tránh Cấm 8 và tránh rủi ro không tương thích ngược |
| `packages/contract` | 76 phương thức đã đủ; xem [contracts/no-rpc-change.md](./contracts/no-rpc-change.md) |
| `CapabilitySet` | Dùng nguyên định nghĩa hiện có; không mở rộng |
| Bố cục, bảng màu, mật độ giao diện | AGENTS.md §4: thay đổi thị giác cần yêu cầu tường minh |
| Fixture Sakila của `transport-mock` | AGENTS.md §4: không xoá, giữ làm fixture cho unit test và Storybook |
