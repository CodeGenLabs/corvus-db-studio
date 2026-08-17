# SPEC-09: Data Transfer, Data Sync, Structure Sync

- **Trạng thái**: Ready
- **Wave**: W-6
- **Tier**: T2
- **Phụ thuộc**: SPEC-06, SPEC-08, ADR-0010
- **Task**: T-290 … T-318

## 1. Mục tiêu

Ba công cụ liên quan nhau, cùng dựa trên phép so sánh giữa hai đầu:

| Công cụ | Việc | Đầu ra |
|---|---|---|
| **Data Transfer** | Chuyển dữ liệu + cấu trúc từ connection A sang B | Dữ liệu ở B |
| **Data Synchronization** | So sánh **dữ liệu** A ↔ B, sinh script để B giống A | Script INSERT/UPDATE/DELETE |
| **Structure Synchronization** | So sánh **cấu trúc** A ↔ B, sinh script DDL | Script DDL |

UI "Compare A ⇄ B" đã có trong shell hiện tại chính là bước 3 của Data Synchronization.

## 2. Phạm vi

**Trong**: cả 3 công cụ, cross-engine transfer (MySQL→PG…), chọn object, mapping bảng/cột,
xem diff, chọn từng thay đổi để áp, sinh rollback script, lưu profile, chạy như job.
**Ngoài**: replication liên tục (không phải mục tiêu sản phẩm).

## 3. Yêu cầu chức năng

### 3.1 Data Transfer

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-09.01 | Chọn connection nguồn và đích, database/schema mỗi bên | MUST |
| FR-09.02 | Chọn object cần chuyển (bảng, view, routine) | MUST |
| FR-09.03 | Transfer mode: chỉ cấu trúc / cấu trúc + dữ liệu / chỉ dữ liệu | MUST |
| FR-09.04 | Tuỳ chọn: xoá bảng đích trước, khoá bảng, dùng transaction, `Continue on error`, kích thước batch | MUST |
| FR-09.05 | Cross-engine MUST ánh xạ kiểu qua `CorvusType` trung gian và **hiện bảng ánh xạ** để người dùng kiểm tra | MUST |
| FR-09.06 | Kiểu không ánh xạ được MUST cảnh báo rõ và cho người dùng chọn kiểu thay thế | MUST |
| FR-09.07 | Thứ tự chuyển MUST theo phụ thuộc FK (topological sort) | MUST |
| FR-09.08 | Chạy như job, tiến trình theo bảng và theo dòng | MUST |

### 3.2 Data Synchronization

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-09.09 | Chọn 2 bên; map bảng theo tên hoặc thủ công | MUST |
| FR-09.10 | Chọn khoá so sánh (mặc định PK; cho phép chọn cột khác) | MUST |
| FR-09.11 | Chọn cột tham gia so sánh (bỏ qua cột như `updated_at`) | MUST |
| FR-09.12 | Kết quả MUST phân loại: **thêm** / **xoá** / **khác** / **giống** với số lượng mỗi loại | MUST |
| FR-09.13 | Grid diff MUST tô màu: xanh (thêm), đỏ (xoá), vàng (khác); ô khác biệt hiện `cũ → mới` | MUST |
| FR-09.14 | Toggle "Chỉ hiện khác biệt" (đã có trong UI) | MUST |
| FR-09.15 | Người dùng MUST tick từng thay đổi hoặc chọn theo nhóm để áp | MUST |
| FR-09.16 | Script sinh ra MUST xem được, sửa được trước khi chạy | MUST |
| FR-09.17 | MUST sinh được **rollback script** (đảo ngược các thay đổi sẽ áp) | MUST |
| FR-09.18 | Áp script MUST đi qua preview-token và chạy trong transaction nếu engine hỗ trợ | MUST |
| FR-09.19 | So sánh MUST chạy theo khoá, streaming — bảng 10 triệu dòng không nạp hết vào RAM | MUST |
| FR-09.20 | Export diff ra file (CSV / SQL) | SHOULD |

### 3.3 Structure Synchronization

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-09.21 | So sánh: bảng, cột, index, FK, check, view, routine, trigger | MUST |
| FR-09.22 | Tuỳ chọn bỏ qua: comment, thứ tự cột, charset/collation, `AUTO_INCREMENT` hiện tại | MUST |
| FR-09.23 | Kết quả hiện dạng cây theo object, kèm chi tiết từng thuộc tính khác nhau | MUST |
| FR-09.24 | Chọn từng thay đổi để áp; DDL sinh ra dùng `DdlGenerator` của SPEC-06 | MUST |
| FR-09.25 | Cảnh báo mất dữ liệu (drop column/table) MUST hiện nổi bật | MUST |
| FR-09.26 | Áp qua preview-token | MUST |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `CompareView` | `packages/ui/src/views/CompareView.tsx` | **đã có** — nối logic thật |
| `TransferWizard` | `…/wizards/transfer/` | mới (dùng `WizardShell`) |
| `DataSyncWizard` | `…/wizards/datasync/` | mới |
| `StructureSyncWizard` | `…/wizards/structsync/` | mới |
| `DiffGrid` | `…/compare/DiffGrid.tsx` | mới (dùng `DataGrid` + renderer diff) |
| `StructureDiffTree` | `…/compare/StructureDiffTree.tsx` | mới |
| `ScriptEditorDialog` | `…/dialogs/ScriptEditorDialog.tsx` | mới (dùng `SqlEditor`) |
| `TypeMappingTable` | `…/wizards/transfer/TypeMappingTable.tsx` | mới |

Trạng thái: empty (chưa chọn đủ 2 bên) · loading (đang so sánh — hiện tiến trình theo bảng) ·
ready (có kết quả) · error · unsupported (cross-engine với cặp không hỗ trợ → nêu rõ).

## 5. Hợp đồng RPC

```ts
export const dataSyncCompare = defineStream({
  name: 'datasync.compare',
  params: z.object({
    source: z.object({ connectionId: z.string().uuid(), ref: ObjectRef }),
    target: z.object({ connectionId: z.string().uuid(), ref: ObjectRef }),
    keyColumns: z.array(z.string()).min(1),
    compareColumns: z.array(z.string()).optional(),   // undefined = tất cả
    options: z.object({
      caseSensitive: z.boolean().default(true),
      trimStrings: z.boolean().default(false),
      numericTolerance: z.number().default(0),
    }),
  }),
  chunk: z.object({
    rows: z.array(z.object({
      kind: z.enum(['added', 'removed', 'changed', 'same']),
      key: z.record(CellValueSchema),
      source: z.record(CellValueSchema).optional(),
      target: z.record(CellValueSchema).optional(),
      changedColumns: z.array(z.string()).optional(),
    })),
    progress: z.number(),
    summary: z.object({ added: z.number(), removed: z.number(), changed: z.number(), same: z.number() }).optional(),
    done: z.boolean(),
  }),
  permission: 'data:read',
  audit: 'metadata',
})

export const dataSyncPreviewApply = defineUnary({
  name: 'datasync.previewApply',
  params: z.object({
    target: z.object({ connectionId: z.string().uuid(), ref: ObjectRef }),
    /** Khoá của các dòng người dùng đã chọn để áp. */
    selections: z.array(z.object({ kind: z.enum(['added', 'removed', 'changed']), key: z.record(CellValueSchema) })),
    sessionId: z.string(),          // trỏ về kết quả compare đã lưu tạm ở engine
  }),
  result: z.object({
    statements: z.array(z.string()),
    rollback: z.array(z.string()),
    previewToken: z.string(), expiresAt: z.string(),
    warnings: z.array(DdlWarning),
  }),
  permission: 'data:write',
  audit: 'metadata',
  guard: 'writeGuard',
})
```

Còn lại: `transfer.previewPlan` / `.start`, `structsync.compare`, `.previewApply`, `.apply`,
`datasync.apply`.

## 6. Logic engine

### So sánh streaming theo khoá (merge join)

Không được `SELECT *` cả hai bảng vào RAM. Thuật toán:

```
1. Cả hai bên: SELECT key_cols, compare_cols FROM t ORDER BY key_cols
   (dùng cursor, chunk 1 000 dòng)
2. Merge join hai cursor đã sắp xếp:
     key_s < key_t  ⇒ added   (chỉ có ở nguồn)
     key_s > key_t  ⇒ removed (chỉ có ở đích)
     key_s = key_t  ⇒ so sánh compare_cols → changed / same
3. Phát chunk kết quả; lưu bản ghi diff vào file tạm (không giữ RAM)
4. sessionId trỏ tới file tạm đó, TTL 30 phút
```

Yêu cầu quan trọng: **collation của ORDER BY hai bên phải tương thích**. Cross-engine so sánh
chuỗi cần chuẩn hoá — engine sắp xếp lại phía Corvus nếu collation không khớp (chậm hơn nhưng
đúng). Phải cảnh báo cho người dùng khi rơi vào trường hợp này.

### Ánh xạ kiểu cross-engine

```
kiểu native nguồn → CorvusType → kiểu native đích
```
`CorvusType` là tập trung gian (`int8/16/32/64`, `decimal(p,s)`, `float32/64`, `varchar(n)`,
`text`, `blob`, `bool`, `date`, `time`, `timestamp`, `timestamptz`, `json`, `uuid`, `enum`,
`array<T>`, `geometry`, `unknown`).

Ánh xạ mất mát phải cảnh báo, ví dụ:
- MySQL `SET` → PG: không có → gợi ý `text` hoặc `varchar[]`
- PG `array` → MySQL: không có → gợi ý `json`
- Oracle `NUMBER` không precision → cần chọn cụ thể
- MySQL `datetime` → PG `timestamp` vs `timestamptz`: **phải hỏi**, không tự chọn

### Rollback script

`added` → `DELETE`; `removed` → `INSERT` (với giá trị đã đọc từ đích);
`changed` → `UPDATE` về giá trị cũ. Sinh cùng lúc với script chính, từ cùng dữ liệu diff.

## 7. Khác biệt theo engine

| Cặp | Ghi chú |
|---|---|
| MySQL → PG | Vấn đề `datetime`/`timestamptz`, `SET`, `unsigned`, `AUTO_INCREMENT` → `SERIAL`/`IDENTITY` |
| PG → MySQL | Array, jsonb, custom type, sequence |
| Bất kỳ → SQLite | Kiểu động; FK cần bật; không có schema |
| MongoDB ↔ RDBMS | **Không hỗ trợ** ở v1.0 — mô hình quá khác; nêu rõ trong UI |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Khoá không unique | Từ chối trước khi so sánh: `KEY_NOT_UNIQUE`, yêu cầu chọn khoá khác |
| Collation không khớp | Cảnh báo, chuyển sang sắp xếp phía Corvus |
| Kiểu không ánh xạ được | Chặn ở bước preview, buộc người dùng chọn |
| Session compare hết hạn | `STALE_COMPARE_SESSION` → yêu cầu so sánh lại |
| Áp script lỗi giữa chừng | Rollback nếu transactional; nếu không thì nêu rõ statement nào đã chạy + đưa rollback script |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| So sánh 2 bảng × 10 triệu dòng | ≤ 15 phút, RAM ≤ 400 MB |
| Transfer 10 triệu dòng cùng engine | ≤ 10 phút |
| Structure sync 500 bảng | ≤ 60 s |
| Render diff grid 100 000 dòng khác biệt | ảo hoá, ≥ 55 fps |

## 10. Bảo mật

Cần `data:read` ở nguồn **và** `data:write` ở đích. Đích read-only → chặn hoàn toàn.
Bắt buộc preview-token. Audit `full` cho apply, ghi rõ số dòng ảnh hưởng.
Cảnh báo bắt buộc khi đích là connection có tên chứa `prod`.

## 11. i18n

`transfer.step.*` (3), `transfer.mode.*` (3), `transfer.typeMapping`,
`transfer.typeMappingWarning`, `datasync.step.*` (4), `datasync.key`,
`datasync.compareColumns`, `datasync.summary.*` (4), `datasync.diffOnly`,
`datasync.rollback`, `datasync.exportDiff`, `structsync.*` (10), `compare.*` (8),
`error.keyNotUnique`, `error.collationMismatch`, `error.typeNotMappable`

## 12. Tiêu chí chấp nhận

```
[ ] FR-09.01–26 đều có test
[ ] Merge join: 2 bảng 10 triệu dòng, RAM ≤ 400 MB (integration)
[ ] Diff phát hiện đủ 4 loại, số lượng khớp với dữ liệu chuẩn bị trước
[ ] Rollback script đảo ngược đúng: áp → rollback → dữ liệu về trạng thái ban đầu (integration)
[ ] Cross-engine MySQL→PG: bảng sakila.customer chuyển đúng, kiểu ánh xạ hợp lý
[ ] Kiểu không ánh xạ được bị chặn, không âm thầm chọn thay
[ ] Khoá không unique bị từ chối
[ ] Structure sync: 20 kịch bản khác biệt cấu trúc → DDL đúng (golden file)
[ ] Áp qua preview-token, không có đường nào bỏ qua
[ ] Đích read-only → chặn
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
