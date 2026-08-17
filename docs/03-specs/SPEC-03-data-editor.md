# SPEC-03: Data Editor (lưới dữ liệu)

- **Trạng thái**: Ready
- **Wave**: W-1
- **Tier**: T0
- **Phụ thuộc**: SPEC-02, ADR-0005, ADR-0010, [streaming-and-jobs.md](../02-architecture/streaming-and-jobs.md)
- **Task**: T-030 … T-039, T-100 … T-118

---

## 1. Mục tiêu

Người dùng xem, sửa, thêm, xoá dữ liệu trong bảng như dùng bảng tính — nhưng an toàn với
production và không sụp với bảng 16 triệu dòng.

Đây là **module quan trọng nhất và khó nhất** của sản phẩm. `DataGrid` được dùng lại ở 5 chỗ.

## 2. Phạm vi

**Trong phạm vi**: Grid View, Form View, cell editor theo kiểu, sửa/thêm/xoá, transaction,
phân trang, sort, filter & sort pane, find/replace, copy/paste, ẩn/hiện cột, đóng băng cột,
table profile, foreign-key lookup.

**Ngoài phạm vi**: kết quả query → dùng lại `DataGrid` nhưng read-only, xem SPEC-04.
So sánh A⇄B → SPEC-09. MongoDB tree/JSON view và Redis key editor → SPEC-13.

## 3. Yêu cầu chức năng

### 3.1 Hiển thị

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.01 | Grid MUST ảo hoá cả hàng và cột; cuộn 1 triệu dòng ở ≥ 55 fps | MUST |
| FR-03.02 | Header MUST hiện tên cột và kiểu dữ liệu (dòng phụ, chữ nhỏ) | MUST |
| FR-03.03 | Cột `NULL` MUST hiển thị khác chuỗi rỗng — chữ `NULL` in nghiêng màu `--text3` trên nền nhạt | MUST |
| FR-03.04 | Giá trị BLOB MUST hiện `«BLOB 1.2 MB»`, KHÔNG hiện nội dung nhị phân | MUST |
| FR-03.05 | Cột numeric MUST canh phải và dùng font mono; cột text canh trái | MUST |
| FR-03.06 | Người dùng MUST đổi được độ rộng cột; lưu theo (connection, bảng) | MUST |
| FR-03.07 | Người dùng MUST ẩn/hiện cột và đóng băng N cột đầu | SHOULD |
| FR-03.08 | Mật độ dòng MUST theo setting `density` (23 px / 28 px) | MUST |
| FR-03.09 | Định dạng date/time MUST theo setting `displayFormat`; giá trị gốc không bị đổi | SHOULD |
| FR-03.10 | Grid MUST hiện số thứ tự dòng ở cột đầu tiên | MUST |

### 3.2 Nạp dữ liệu

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.11 | Dữ liệu MUST nạp qua `data.browse` (stream), hiện chunk đầu ngay khi tới | MUST |
| FR-03.12 | Phân trang MUST theo `rowsPerPage` (mặc định 1 000, cấu hình được); có nút first/prev/next/last | MUST |
| FR-03.13 | Tổng số dòng MUST lấy bằng `estimateRowCount`; người dùng MAY bấm để đếm chính xác | MUST |
| FR-03.14 | Bảng không có khoá chính MUST vẫn đọc được nhưng KHÔNG cho sửa; banner giải thích lý do | MUST |
| FR-03.15 | Ring buffer UI MUST giới hạn 200 000 dòng trong RAM; cuộn ra ngoài → nạp lại theo OFFSET | MUST |
| FR-03.16 | Huỷ nạp MUST dừng trong ≤ 200 ms và gửi CANCEL tới server | MUST |

### 3.3 Sửa dữ liệu

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.17 | Nhấp đúp cell MUST mở editor phù hợp kiểu dữ liệu | MUST |
| FR-03.18 | Cell đã sửa MUST được đánh dấu trực quan (viền vàng) tới khi Apply | MUST |
| FR-03.19 | Người dùng MUST đặt được cell về `NULL` hoặc chuỗi rỗng (2 hành động riêng biệt) | MUST |
| FR-03.20 | Người dùng MUST thêm dòng mới (`Ctrl+N`) và xoá dòng (`Ctrl+Delete`) | MUST |
| FR-03.21 | `Apply` MUST gọi `data.previewChanges` → hiện SQL → `data.applyChanges` với preview-token | MUST |
| FR-03.22 | `Discard` MUST bỏ mọi thay đổi chưa Apply | MUST |
| FR-03.23 | UPDATE/DELETE sinh ra MUST định danh dòng bằng **khoá chính**, không bằng ROWID hay giá trị cũ của mọi cột | MUST |
| FR-03.24 | Nếu dòng đã bị người khác đổi giữa lúc đọc và Apply, hệ thống MUST phát hiện và hỏi (optimistic lock) | MUST |
| FR-03.25 | Sửa nhiều cell cùng lúc: chọn vùng, gõ giá trị → áp cho mọi cell tương thích kiểu | SHOULD |
| FR-03.26 | Ở chế độ read-only, mọi thao tác ghi MUST bị vô hiệu hoá ở UI **và** bị từ chối ở engine | MUST |

### 3.4 Transaction

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.27 | Người dùng MUST bắt đầu transaction thủ công (`Begin`), rồi `Commit`/`Rollback` | MUST |
| FR-03.28 | Nếu `autoBeginTransaction` bật, transaction MUST tự bắt đầu khi sửa cell đầu tiên | SHOULD |
| FR-03.29 | Khi có transaction mở, UI MUST hiện chỉ báo rõ ràng và số thay đổi đang chờ | MUST |
| FR-03.30 | Đóng tab khi còn transaction mở MUST hỏi commit/rollback/huỷ | MUST |
| FR-03.31 | Transaction MUST có timeout (mặc định 10 phút) — quá hạn thì rollback và thông báo | MUST |

### 3.5 Sort, filter, tìm kiếm

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.32 | Nhấp header MUST sort asc → desc → bỏ sort (server-side ORDER BY) | MUST |
| FR-03.33 | Filter & Sort pane MUST có 2 chế độ: Builder và Text (đã có UI) | MUST |
| FR-03.34 | Builder MUST hỗ trợ AND/OR, nhóm ngoặc, và các toán tử theo kiểu cột | MUST |
| FR-03.35 | Pane MUST hiện trước câu SQL sẽ chạy (đã có trong UI hiện tại) | MUST |
| FR-03.36 | Nhấp phải cell → "Lọc theo giá trị này" | SHOULD |
| FR-03.37 | `Ctrl+F` MUST mở thanh tìm trong dữ liệu đang tải; có tuỳ chọn match case, whole word, regex | SHOULD |
| FR-03.38 | Replace MUST hiện preview số dòng ảnh hưởng trước khi áp | SHOULD |

### 3.6 Copy / Paste

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.39 | `Ctrl+C` MUST sao chép vùng chọn dạng TSV | MUST |
| FR-03.40 | Menu ngữ cảnh MUST có: Copy as → TSV (chỉ dữ liệu / chỉ tên cột / cả hai), INSERT statement, UPDATE statement, JSON, Markdown | SHOULD |
| FR-03.41 | `Ctrl+V` MUST dán TSV vào vùng chọn; dán vượt số dòng hiện có → thêm dòng mới | SHOULD |
| FR-03.42 | Dán MUST đi qua luồng preview như mọi thay đổi khác | MUST |

### 3.7 Khác

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03.43 | Form View: xem/sửa một dòng, điều hướng prev/next | SHOULD |
| FR-03.44 | Foreign-key lookup: cell là FK → editor cho tìm và chọn từ bảng tham chiếu | SHOULD |
| FR-03.45 | Table Profile: lưu bộ (filter, sort, cột hiện, độ rộng) đặt tên và nạp lại | SHOULD |
| FR-03.46 | Cell editor lớn (memo/JSON/XML/hex/image) mở trong panel bên hoặc dialog | SHOULD |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `DataGrid` | `packages/ui/src/grid/DataGrid.tsx` | **mới — thành phần nền tảng** |
| `GridHeader`, `GridRow`, `GridCell` | `…/grid/` | mới |
| `CellEditor` + 9 editor con | `…/grid/editors/` | mới |
| `DataView` | `packages/ui/src/views/DataView.tsx` | **đã có** — thay bằng `DataGrid` |
| `FilterPanel` | `packages/ui/src/panes/FilterPanel.tsx` | **đã có** — nối logic thật |
| `NavigationBar` | `…/grid/NavigationBar.tsx` | mới |
| `SqlPreviewDialog` | `…/dialogs/SqlPreviewDialog.tsx` | mới — dùng chung với SPEC-06, 12 |
| `TransactionBar` | `…/grid/TransactionBar.tsx` | mới |
| `FormView` | `…/views/FormView.tsx` | mới |

### Cell editor theo kiểu

| Kiểu | Editor |
|---|---|
| varchar/text ngắn | inline text input |
| text/memo dài | panel mở rộng, đa dòng |
| số nguyên / decimal | input có kiểm tra, hiện min/max của kiểu |
| bool / tinyint(1) | checkbox 3 trạng thái (true / false / NULL) |
| date / time / datetime / timestamp | date-time picker + input text (nhập tay được) |
| enum / set | dropdown / multi-select từ `ColumnMeta.enumValues` |
| json / jsonb | editor CodeMirror chế độ JSON, có validate |
| xml | editor CodeMirror chế độ XML |
| blob / bytea | hex viewer + nút tải lên/tải xuống qua `FileGateway`; ảnh thì hiện preview |
| uuid | input + nút sinh UUID |
| geometry | hiện WKT, chỉ đọc ở v1.0 |
| array (PG) | editor danh sách |

Trạng thái bắt buộc: empty (bảng 0 dòng → "Bảng trống" + nút Thêm dòng) · loading (skeleton +
số dòng đã tải) · ready · error (banner, giữ dữ liệu đã tải) · unsupported (không có PK →
banner "chỉ đọc: bảng không có khoá chính").

### Phím tắt

| Phím | Hành động |
|---|---|
| `F5` | Làm mới |
| `Ctrl+N` | Thêm dòng |
| `Ctrl+Delete` | Xoá dòng đang chọn |
| `Ctrl+S` / `Ctrl+Enter` | Apply changes |
| `Esc` | Discard cell đang sửa |
| `Ctrl+F` | Tìm |
| `Ctrl+A` | Chọn tất cả |
| `Shift+↑↓←→` | Mở rộng vùng chọn |
| `Ctrl+Shift+N` | Set NULL |
| `Ctrl+Enter` (trong cell) | Mở editor lớn |
| `Alt+←/→` | Trang trước / sau |

## 5. Hợp đồng RPC

```ts
export const dataBrowse = defineStream({
  name: 'data.browse',
  params: z.object({
    connectionId: z.string().uuid(),
    ref: ObjectRef,
    columns: z.array(z.string()).optional(),       // undefined = tất cả
    filter: FilterExpr.optional(),                 // AST, KHÔNG phải chuỗi SQL
    sort: z.array(z.object({ column: z.string(), dir: z.enum(['ASC', 'DESC']) })).default([]),
    limit: z.number().int().min(1).max(100_000).default(1_000),
    offset: z.number().int().min(0).default(0),
    chunkSize: z.number().int().min(1).max(10_000).default(1_000),
    transactionId: z.string().uuid().optional(),
  }),
  chunk: ResultChunk,
  permission: 'data:read',
  audit: 'metadata',
})

export const dataPreviewChanges = defineUnary({
  name: 'data.previewChanges',
  params: z.object({
    connectionId: z.string().uuid(),
    ref: ObjectRef,
    changes: z.array(RowChange),
    /** Bật kiểm tra xung đột optimistic. */
    checkConflicts: z.boolean().default(true),
  }),
  result: z.object({
    statements: z.array(z.string()),
    previewToken: z.string(),
    expiresAt: z.string(),
    warnings: z.array(DdlWarning),
    estimatedRows: z.number(),
  }),
  permission: 'data:write',
  audit: 'metadata',
  guard: 'writeGuard',
})

export const dataApplyChanges = defineUnary({
  name: 'data.applyChanges',
  params: z.object({ previewToken: z.string(), transactionId: z.string().uuid().optional() }),
  result: z.object({
    applied: z.number(),
    conflicts: z.array(z.object({ rowKey: z.record(z.unknown()), reason: z.string() })),
  }),
  permission: 'data:write',
  audit: 'full',
  guard: 'writeGuard',
})
```

`RowChange`:
```ts
const RowChange = z.discriminatedUnion('op', [
  z.object({ op: z.literal('insert'), values: z.record(CellValueSchema) }),
  z.object({
    op: z.literal('update'),
    key: z.record(CellValueSchema),            // giá trị khoá chính
    values: z.record(CellValueSchema),         // CHỈ những cột đã đổi
    /** Giá trị cũ của các cột đã đổi — để kiểm tra xung đột. */
    expected: z.record(CellValueSchema).optional(),
  }),
  z.object({ op: z.literal('delete'), key: z.record(CellValueSchema), expected: z.record(CellValueSchema).optional() }),
])
```

## 6. Logic engine

### Xây câu SELECT từ AST

`FilterExpr` là AST, **không phải chuỗi SQL** (bảo mật: xem
[security.md](../02-architecture/security.md) §7):

```ts
type FilterExpr =
  | { t: 'and' | 'or'; items: FilterExpr[] }
  | { t: 'not'; item: FilterExpr }
  | { t: 'cmp'; column: string; op: CmpOp; value: CellValue }
  | { t: 'in'; column: string; values: CellValue[] }
  | { t: 'between'; column: string; from: CellValue; to: CellValue }
  | { t: 'null'; column: string; negated: boolean }
  | { t: 'like'; column: string; pattern: string; caseInsensitive: boolean }
  | { t: 'raw'; sql: string }        // CHỈ từ chế độ Text, có cảnh báo rõ cho người dùng
```

Engine dịch AST → `sql` template với identifier được quote và giá trị được bind.
`{ t: 'raw' }` chỉ dùng khi người dùng tự gõ ở chế độ Text — được phép, có cảnh báo, và bị
chặn hoàn toàn ở chế độ read-only nếu chứa DML.

### Optimistic locking

`update`/`delete` có `expected` → engine thêm điều kiện vào WHERE:
```sql
UPDATE "t" SET "email" = $1
WHERE "id" = $2 AND "email" = $3     -- $3 = expected.email
```
`affectedRows = 0` → xung đột. Trả về trong `conflicts[]`, UI hỏi người dùng: ghi đè / bỏ qua /
xem giá trị hiện tại.

Bảng không có PK → **không** sinh UPDATE/DELETE (FR-03.14). Không dùng ROWID hay `LIMIT 1`.

### Thứ tự áp dụng

`DELETE` → `UPDATE` → `INSERT`, trong một transaction nếu engine hỗ trợ. Lý do: tránh vi phạm
unique khi người dùng vừa xoá một dòng vừa thêm dòng có cùng khoá.

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|
| MySQL | `ddlTransactional=false`, nhưng DML thì có tx | Bình thường |
| SQLite | Kiểu động; `INTEGER PRIMARY KEY` là rowid | Đọc `ColumnMeta.declaredType` để chọn editor |
| PostgreSQL | Kiểu array, jsonb, range, custom | Editor riêng cho array; kiểu lạ → chỉ đọc + hiện text |
| MSSQL | `OFFSET…FETCH` cần `ORDER BY` | Không có sort → tự thêm `ORDER BY (SELECT NULL)` |
| Oracle | Không có `LIMIT` ở 11g | Bọc `ROW_NUMBER()` |
| MongoDB | Document, không phải dòng | View riêng (SPEC-13); `DataGrid` chỉ dùng cho chế độ Grid phẳng |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Vi phạm unique khi Apply | `UNIQUE_VIOLATION` | Highlight dòng lỗi, chỉ rõ cột, không mất các thay đổi khác |
| Vi phạm FK | `FK_VIOLATION` | Nêu rõ bảng tham chiếu |
| Cột NOT NULL trống | `NOT_NULL_VIOLATION` | Highlight cell trước khi gửi (validate ở client) |
| Xung đột optimistic | `ROW_CONFLICT` | Dialog so sánh giá trị của tôi ↔ trên server |
| Transaction timeout | `TX_TIMEOUT` | "Giao dịch đã bị rollback do quá hạn" |
| Preview hết hạn | `STALE_PREVIEW` | "Cấu trúc bảng đã thay đổi, hãy kiểm tra lại" |
| Sai kiểu dữ liệu | `TYPE_MISMATCH` | Validate ở client trước, thông báo tại cell |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| First paint sau chunk đầu | ≤ 150 ms (NFR-01) |
| Cuộn 1 triệu dòng | ≥ 55 fps (NFR-02) |
| RAM engine khi stream 10 triệu dòng | ≤ 400 MB (NFR-03) |
| Đổi độ rộng cột | ≤ 16 ms/frame |
| Apply 1 000 thay đổi | ≤ 3 s |
| Copy 100 000 cell ra TSV | ≤ 1 s (chạy trong Web Worker) |

## 10. Bảo mật

- `data:read` để xem, `data:write` để sửa.
- Mọi thay đổi bắt buộc qua preview-token (ADR-0010).
- Read-only: UI vô hiệu hoá + engine từ chối ở router (hai lớp).
- Filter AST chống injection; `{t:'raw'}` chỉ từ input người dùng tường minh.
- Audit `full` cho `applyChanges` — ghi SQL đã redact.

## 11. i18n

`grid.null`, `grid.emptyString`, `grid.blob`, `grid.setNull`, `grid.setEmpty`,
`grid.addRow`, `grid.deleteRow`, `grid.apply`, `grid.discard`, `grid.pendingChanges`,
`grid.noPrimaryKey`, `grid.readOnly`, `grid.copyAs.*` (6), `grid.paste`,
`grid.rowsPerPage`, `grid.countExact`, `tx.begin`, `tx.commit`, `tx.rollback`,
`tx.openWarning`, `tx.timeout`, `conflict.title`, `conflict.mine`, `conflict.theirs`,
`conflict.overwrite`, `conflict.skip`, `filter.*` (14), `find.*` (8)

## 12. Tiêu chí chấp nhận

```
[ ] FR-03.01–46 đều có test
[ ] Benchmark: 1 triệu dòng ≥ 55 fps, chạy trong CI, cảnh báo khi tụt (T-034)
[ ] RAM engine ≤ 400 MB khi stream 10 triệu dòng (integration)
[ ] Huỷ nạp ≤ 200 ms, không rò session
[ ] Bảng không PK: đọc được, không sửa được, banner đúng
[ ] Optimistic lock: sửa đồng thời từ 2 session → phát hiện xung đột
[ ] NULL ≠ chuỗi rỗng: round-trip qua cả 4 engine giữ nguyên phân biệt
[ ] Mọi kiểu dữ liệu round-trip đúng (dùng lại C4 conformance)
[ ] Apply luôn qua preview; test khẳng định không có đường nào bỏ qua
[ ] Read-only chặn ở cả UI và engine
[ ] 5 trạng thái UI đều có · i18n vi/en/ja đủ
[ ] E2E trên cả web build và desktop build
```
