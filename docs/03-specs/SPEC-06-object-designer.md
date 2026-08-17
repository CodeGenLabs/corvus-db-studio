# SPEC-06: Object Designer (Table / View / Routine)

- **Trạng thái**: Ready
- **Wave**: W-2 (table, view) / W-3 (routine)
- **Tier**: T0 (table) / T1 (còn lại)
- **Phụ thuộc**: SPEC-02, ADR-0003, ADR-0010
- **Task**: T-140 … T-168

## 1. Mục tiêu

Người dùng tạo và sửa cấu trúc đối tượng qua giao diện, và **luôn thấy chính xác DDL** sẽ chạy
trước khi nó chạy.

`ALTER TABLE` là phần khó nhất của toàn bộ sản phẩm — xem §6.

## 2. Phạm vi

**Trong**: Table Designer (fields / indexes / foreign keys / triggers / checks / options /
comment / partitions), View Designer, Procedure & Function Designer, xoá object, maintain
(analyze/optimize/vacuum/reindex).
**Ngoài**: sửa dữ liệu → SPEC-03. Model designer → SPEC-07.

## 3. Yêu cầu chức năng

### 3.1 Table Designer — Fields

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-06.01 | Grid field MUST cho sửa: tên, kiểu, độ dài/precision, not null, default, auto-increment, comment, charset/collation | MUST |
| FR-06.02 | Dropdown kiểu MUST lấy từ `dialect.typeCatalog`, không hard-code | MUST |
| FR-06.03 | Người dùng MUST thêm / xoá / đổi thứ tự field | MUST |
| FR-06.04 | Đổi tên field MUST được nhận là **rename**, không phải drop+add | MUST |
| FR-06.05 | Chọn khoá chính (một hoặc nhiều cột), có thứ tự | MUST |
| FR-06.06 | Validate ở client: tên trùng, tên rỗng, vượt `maxIdentifierLength`, kiểu cần độ dài mà để trống | MUST |

### 3.2 Table Designer — các tab khác

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-06.07 | Indexes: tạo/xoá, chọn cột + thứ tự + chiều, unique, loại index (btree/hash/gin/fulltext theo engine) | MUST |
| FR-06.08 | Foreign keys: cột nguồn, bảng/cột đích, ON DELETE/UPDATE, tên constraint | MUST |
| FR-06.09 | Check constraints (nếu engine hỗ trợ) | SHOULD |
| FR-06.10 | Triggers: liệt kê, tạo, sửa body trong editor SQL | SHOULD |
| FR-06.11 | Options: engine, charset, collation, auto_increment, comment, tablespace — theo engine | MUST |
| FR-06.12 | Partitions | MAY (W6) |

### 3.3 Luồng lưu

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-06.13 | `Preview SQL` MUST hiện DDL sinh ra bất cứ lúc nào, không cần lưu | MUST |
| FR-06.14 | `Save` MUST đi qua `ddl.previewTable` → dialog SQL → `ddl.applyTable(previewToken)` | MUST |
| FR-06.15 | Dialog preview MUST hiện cảnh báo: rebuild bảng, khoá bảng, mất dữ liệu | MUST |
| FR-06.16 | Nếu engine `ddlTransactional=false`, dialog MUST cảnh báo "không thể hoàn tác tự động" | MUST |
| FR-06.17 | Sau khi lưu thành công, cache metadata MUST bị vô hiệu hoá và designer nạp lại | MUST |
| FR-06.18 | Rời designer khi còn thay đổi chưa lưu MUST hỏi xác nhận | MUST |
| FR-06.19 | Ở read-only, designer MUST mở ở chế độ chỉ đọc, `Save` vô hiệu hoá | MUST |

### 3.4 Xoá & maintain

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-06.20 | Xoá object MUST hiện DDL + yêu cầu gõ đúng tên object để xác nhận | MUST |
| FR-06.21 | Xoá MUST cảnh báo về object phụ thuộc (`introspect.dependencies`) | MUST |
| FR-06.22 | Maintain: chỉ hiện thao tác engine hỗ trợ (`caps.tools`) | SHOULD |

### 3.5 View & Routine

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-06.23 | View Designer: tên, definition SQL (editor CodeMirror), check option, comment | MUST |
| FR-06.24 | Routine Designer: tên, tham số (in/out/inout, kiểu, default), kiểu trả về, body, ngôn ngữ, security/determinism | SHOULD |
| FR-06.25 | Body routine MUST có syntax highlight và completion như SQL Editor | SHOULD |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `DesignView` | `packages/ui/src/views/DesignView.tsx` | **đã có** — nối logic thật |
| `FieldGrid` | `…/designer/FieldGrid.tsx` | mới (dùng `DataGrid` ở chế độ form) |
| `IndexTab`, `ForeignKeyTab`, `CheckTab`, `TriggerTab`, `OptionTab` | `…/designer/tabs/` | mới |
| `SqlPreviewDialog` | `…/dialogs/SqlPreviewDialog.tsx` | dùng chung |
| `DropObjectDialog` | `…/dialogs/DropObjectDialog.tsx` | mới |
| `ViewDesigner`, `RoutineDesigner` | `…/designer/` | mới |

Trạng thái: empty (bảng mới → 1 field mặc định `id`) · loading · ready · error · unsupported
(tab ẩn theo capability).

## 5. Hợp đồng RPC

```ts
export const ddlPreviewTable = defineUnary({
  name: 'ddl.previewTable',
  params: z.object({
    connectionId: z.string().uuid(),
    /** undefined = tạo mới; có giá trị = sửa bảng hiện có. */
    ref: ObjectRef.optional(),
    design: TableDesign,
  }),
  result: z.object({
    statements: z.array(z.string()),
    previewToken: z.string(),
    expiresAt: z.string(),
    warnings: z.array(DdlWarning),
    transactional: z.boolean(),
    rollback: z.array(z.string()).optional(),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
  guard: 'writeGuard',
})

export const ddlApplyTable = defineUnary({
  name: 'ddl.applyTable',
  params: z.object({ previewToken: z.string() }),
  result: z.object({ ok: z.literal(true), executed: z.number() }),
  permission: 'ddl:write',
  audit: 'full',
  guard: 'writeGuard',
})
```

`TableDesign` mang **id nội bộ** cho mỗi field để phát hiện rename:

```ts
const FieldDesign = z.object({
  /** ID bền vững trong phiên designer. Field từ DB lấy id = tên gốc. */
  id: z.string(),
  name: z.string(),
  type: z.string(),
  length: z.string().optional(),
  notNull: z.boolean(),
  default: z.string().nullable(),
  autoIncrement: z.boolean(),
  comment: z.string().optional(),
  charset: z.string().optional(),
  collation: z.string().optional(),
})
```

Còn lại: `ddl.previewView` / `.applyView`, `.previewRoutine` / `.applyRoutine`,
`.previewDrop` / `.applyDrop`, `.maintain`.

## 6. Logic engine — thuật toán diff ALTER TABLE

```
Đầu vào: before: TableMeta (từ DB), after: TableDesign (từ UI)

1. Ghép field theo `id`, KHÔNG theo tên
   → id có ở cả hai, tên khác  ⇒ RENAME COLUMN
   → id có ở cả hai, thuộc tính khác ⇒ ALTER/MODIFY COLUMN
   → id chỉ có ở after   ⇒ ADD COLUMN
   → id chỉ có ở before  ⇒ DROP COLUMN  (cảnh báo MẤT DỮ LIỆU)

2. Sinh cảnh báo:
   - Thu hẹp kiểu (varchar(100)→varchar(50), bigint→int) ⇒ CẢNH BÁO mất dữ liệu
   - Thêm NOT NULL cho cột đang có NULL ⇒ CẢNH BÁO sẽ lỗi
   - Đổi kiểu không tương thích ⇒ CẢNH BÁO cần USING/CAST
   - Bảng > 1 triệu dòng và thao tác gây rebuild ⇒ CẢNH BÁO thời gian khoá

3. Thứ tự statement:
   DROP FK/index phụ thuộc → thao tác cột → PK → index → FK → trigger → options

4. Gói vào transaction nếu caps.tx.ddlTransactional
```

### SQLite — trường hợp đặc biệt

SQLite không có `ALTER COLUMN`, `DROP CONSTRAINT`. Mọi thay đổi ngoài
`ADD COLUMN`/`RENAME COLUMN`/`DROP COLUMN` (3.35+) phải sinh chuỗi 12 bước theo tài liệu SQLite:

```
PRAGMA foreign_keys=OFF; BEGIN;
CREATE TABLE t__new (…);
INSERT INTO t__new (…) SELECT … FROM t;
DROP TABLE t;
ALTER TABLE t__new RENAME TO t;
-- tạo lại index, trigger, view
PRAGMA foreign_key_check; COMMIT; PRAGMA foreign_keys=ON;
```

Dialog preview **phải** hiện rõ toàn bộ chuỗi này — người dùng cần biết bảng của họ sẽ được
tạo lại.

## 7. Khác biệt theo engine

| Engine | Khác biệt chính |
|---|---|
| MySQL | `MODIFY COLUMN` cần khai lại toàn bộ định nghĩa; DDL không transactional; có `ALGORITHM=INPLACE` |
| PostgreSQL | `ALTER TYPE … USING`; DDL transactional; index concurrent |
| SQLite | Xem §6 |
| MSSQL | `ALTER COLUMN` từng thuộc tính; constraint phải drop trước |
| Oracle | `MODIFY`; không đổi kiểu khi bảng có dữ liệu (một số trường hợp) |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Bảng đã bị người khác sửa | `STALE_PREVIEW` | "Cấu trúc đã thay đổi, hãy xem lại DDL" |
| DDL lỗi giữa chuỗi (engine không transactional) | `DDL_PARTIAL_FAILURE` | Nêu rõ statement nào chạy được, nào không, **và trạng thái hiện tại của bảng** |
| Vi phạm khi thêm NOT NULL | `NOT_NULL_VIOLATION` | Nêu số dòng đang NULL |
| Tên trùng | `DUPLICATE_OBJECT` | Validate ở client trước |

`DDL_PARTIAL_FAILURE` là tình huống nghiêm trọng — phải hiện dialog riêng, không phải toast.

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Mở designer bảng 200 cột | ≤ 300 ms |
| Sinh DDL diff | ≤ 50 ms |
| Preview với `estimateRowCount` | ≤ 200 ms |

## 10. Bảo mật

`ddl:write`. **Bắt buộc** preview-token. Read-only → chỉ đọc. Xoá cần gõ tên object.
Audit `full` cho apply.

## 11. i18n

`designer.fields`, `designer.indexes`, `designer.foreignKeys`, `designer.checks`,
`designer.triggers`, `designer.options`, `designer.previewSql`, `designer.save`,
`designer.unsavedWarning`, `designer.notTransactionalWarning`,
`ddl.warning.dataLoss`, `ddl.warning.tableRebuild`, `ddl.warning.lockDuration`,
`ddl.warning.notNullViolation`, `ddl.warning.sqliteRecreate`,
`drop.title`, `drop.confirmType`, `drop.dependencies`, `maintain.*` (6)

## 12. Tiêu chí chấp nhận

```
[ ] FR-06.01–25 đều có test
[ ] Golden file: ≥ 40 kịch bản diff × 4 engine (C7 conformance)
[ ] Rename cột không sinh drop+add — test theo id
[ ] SQLite: chuỗi tạo lại bảng đúng, dữ liệu và index được giữ (integration)
[ ] Cảnh báo mất dữ liệu xuất hiện đúng lúc, không xuất hiện sai lúc
[ ] STALE_PREVIEW: sửa bảng từ session khác giữa preview và apply → bị chặn
[ ] Không có đường nào chạy DDL mà bỏ qua preview (test contract T-062)
[ ] DDL_PARTIAL_FAILURE hiện dialog nêu rõ trạng thái
[ ] Read-only: designer chỉ đọc
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
