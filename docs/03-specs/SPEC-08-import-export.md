# SPEC-08: Import & Export

- **Trạng thái**: Ready
- **Wave**: W-3
- **Tier**: T1
- **Phụ thuộc**: SPEC-02, SPEC-03, ADR-0009, [streaming-and-jobs.md](../02-architecture/streaming-and-jobs.md)
- **Task**: T-250 … T-278

## 1. Mục tiêu

Đưa dữ liệu từ file vào bảng và ngược lại, với file **hàng gigabyte**, không nạp hết vào RAM,
chạy được cả trên web (upload) lẫn desktop (đọc trực tiếp).

## 2. Phạm vi

**Trong**: Import từ CSV/TSV/TXT (delimited & fixed-width) / JSON / XML / Excel;
Export ra CSV/TSV/TXT/JSON/XML/SQL/HTML/Markdown/Excel; wizard nhiều bước; mapping field;
import mode; profile lưu lại; chạy như job.
**Ngoài**: Data Transfer giữa 2 DB → SPEC-09. ODBC/Access/DBF → không làm.

## 3. Yêu cầu chức năng

### 3.1 Import — wizard 6 bước

| Bước | Nội dung | FR |
|---|---|---|
| 1 | Chọn định dạng | FR-08.01 |
| 2 | Chọn file (nhiều file) + encoding | FR-08.02–04 |
| 3 | Delimiter / qualifier / record separator / fixed-width breaks | FR-08.05–07 |
| 4 | Tuỳ chọn thêm: dòng tên cột, dòng dữ liệu đầu/cuối, định dạng ngày, dấu thập phân, encoding nhị phân | FR-08.08–10 |
| 5 | Bảng đích (mới hoặc có sẵn) + map field + đổi kiểu | FR-08.11–15 |
| 6 | Import mode + tuỳ chọn nâng cao + chạy | FR-08.16–22 |

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-08.01 | Định dạng hỗ trợ: CSV, TSV, TXT, JSON, XML, XLSX | MUST |
| FR-08.02 | Chọn file qua `FileGateway` (desktop: dialog OS; web: upload có resume) | MUST |
| FR-08.03 | Nhiều file cùng lúc, mỗi file → một bảng đích | SHOULD |
| FR-08.04 | Encoding: UTF-8 (mặc định), UTF-16, Windows-1252, Shift-JIS, GBK; tự đoán từ BOM | MUST |
| FR-08.05 | Delimiter: `,` `;` `\t` `\|` hoặc tuỳ ý; text qualifier `"` `'` hoặc không | MUST |
| FR-08.06 | Fixed-width: đặt điểm cắt bằng giao diện trực quan | SHOULD |
| FR-08.07 | Xem trước 100 dòng đầu, cập nhật ngay khi đổi tuỳ chọn | MUST |
| FR-08.08 | Chỉ định dòng tên cột, dòng dữ liệu đầu, dòng dữ liệu cuối | MUST |
| FR-08.09 | Định dạng ngày (thứ tự, dấu phân cách), dấu thập phân | MUST |
| FR-08.10 | JSON/XML: chỉ định tag/path xác định một record; XML có tuỳ chọn coi attribute là field | MUST |
| FR-08.11 | Bảng đích: chọn bảng có sẵn hoặc nhập tên mới (tự tick "tạo bảng mới") | MUST |
| FR-08.12 | Suy luận kiểu từ dữ liệu mẫu; người dùng đổi được | MUST |
| FR-08.13 | Map field nguồn → đích: Smart Match / Direct Match / Unmatch All | MUST |
| FR-08.14 | Bỏ qua field không muốn import | MUST |
| FR-08.15 | Chọn cột làm khoá cho mode update | MUST |
| FR-08.16 | Import mode: **Append** / **Update** / **Append or Update** / **Delete** / **Copy** (xoá sạch rồi thêm) | MUST |
| FR-08.17 | Tuỳ chọn: extended insert, kích thước batch, `Continue on error`, `Use empty string as NULL`, `Ignore FK constraint` | MUST |
| FR-08.18 | Import chạy như **job** (SPEC-11), có tiến trình theo % byte, huỷ được | MUST |
| FR-08.19 | Lỗi từng dòng MUST ghi vào log kèm số dòng và lý do; không dừng nếu `Continue on error` | MUST |
| FR-08.20 | Kết thúc MUST báo: số dòng thành công / lỗi / bỏ qua, thời lượng, đường dẫn log | MUST |
| FR-08.21 | Lưu toàn bộ cấu hình thành **profile** để chạy lại hoặc đưa vào batch job | MUST |
| FR-08.22 | `Copy`/`Delete` mode MUST đi qua preview (hiện số dòng sẽ xoá) | MUST |

### 3.2 Export

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-08.23 | Nguồn: bảng, view, hoặc kết quả query đang mở | MUST |
| FR-08.24 | Định dạng: CSV, TSV, TXT, JSON, XML, SQL (INSERT), HTML, Markdown, XLSX | MUST |
| FR-08.25 | Nhiều object → mỗi file riêng, cùng thư mục; hoặc gộp một file (XLSX = nhiều sheet) | MUST |
| FR-08.26 | Chọn cột xuất | MUST |
| FR-08.27 | Tuỳ chọn: có/không dòng tiêu đề, encoding, thêm timestamp vào tên file, append vào file có sẵn, `Continue on error` | MUST |
| FR-08.28 | XML: chọn kiểu element hoặc attribute | SHOULD |
| FR-08.29 | SQL: chọn extended insert, có/không `CREATE TABLE`, kích thước batch | SHOULD |
| FR-08.30 | Export MUST stream — không buffer toàn bộ vào RAM | MUST |
| FR-08.31 | Web: file sinh ra tải về qua download token; desktop: ghi thẳng đường dẫn đã chọn | MUST |
| FR-08.32 | Lưu profile | MUST |

## 4. Giao diện

| Component | Đường dẫn |
|---|---|
| `ImportWizard` | `packages/ui/src/wizards/ImportWizard.tsx` |
| `ImportStep1..6` | `…/wizards/import/` |
| `DelimiterPreview` | `…/wizards/import/DelimiterPreview.tsx` |
| `FixedWidthEditor` | `…/wizards/import/FixedWidthEditor.tsx` |
| `FieldMappingGrid` | `…/wizards/import/FieldMappingGrid.tsx` |
| `ExportWizard` + `ExportStep1..5` | `…/wizards/export/` |
| `WizardShell` | `…/wizards/WizardShell.tsx` — khung dùng chung (Back/Next/Save profile/Start) |
| `JobProgressPanel` | `…/panes/JobProgressPanel.tsx` — dùng chung với SPEC-10, 11 |

Trạng thái: empty (chưa chọn file → vô hiệu hoá Next) · loading (đang upload / đang parse
preview) · ready · error (lỗi parse hiện tại bước đó, không nhảy bước) · unsupported (XLSX với
engine không hỗ trợ — không có; mọi định dạng độc lập engine).

## 5. Hợp đồng RPC

```ts
export const jobStart = defineUnary({
  name: 'job.start',
  params: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('import'),  params: ImportJobParams }),
    z.object({ kind: z.literal('export'),  params: ExportJobParams }),
    z.object({ kind: z.literal('backup'),  params: BackupJobParams }),
    // …
  ]),
  result: z.object({ jobId: z.string() }),
  permission: 'job:run',
  audit: 'full',
  guard: 'writeGuardIfMutating',
})

export const importAnalyze = defineUnary({
  name: 'import.analyze',
  params: z.object({
    file: FileHandle,
    format: ImportFormat,
    options: ImportParseOptions,
    sampleRows: z.number().int().max(1000).default(100),
  }),
  result: z.object({
    columns: z.array(z.object({ name: z.string(), inferredType: z.string(), sample: z.array(z.string()) })),
    rows: z.array(z.array(z.string())),
    totalBytes: z.number(),
    warnings: z.array(z.string()),     // vd. 'dòng 42 có số cột khác'
  }),
  permission: 'job:run',
  audit: 'metadata',
})
```

## 6. Logic engine

### Import — pipeline stream

```
FileGateway.read(handle)
  → decodeStream(encoding)         // iconv-lite, xử lý BOM
  → parseStream(format, options)   // csv-parse / stream-json / sax / exceljs streaming
  → transformStream(mapping, typeCoercion)
  → batchStream(batchSize)         // gom 1 000 dòng
  → writeStream(driver, importMode)
```

Toàn bộ chạy trong **worker thread**. Backpressure tự nhiên qua Node stream —
nếu DB ghi chậm, việc đọc file chậm theo.

### Import mode → SQL

| Mode | SQL sinh ra |
|---|---|
| Append | `INSERT INTO t (…) VALUES …` (extended nếu bật) |
| Update | `UPDATE t SET … WHERE key = …` |
| Append or Update | Upsert nếu `caps.sql.supportsUpsert`; nếu không → `UPDATE` rồi `INSERT` khi `affectedRows=0` |
| Delete | `DELETE FROM t WHERE key IN (…)` |
| Copy | `TRUNCATE`/`DELETE FROM t` rồi Append (qua preview, FR-08.22) |

### Export — pipeline stream

```
data.browse (cursor, không limit)
  → formatStream(format, options)   // sinh từng dòng, không gom
  → encodeStream(encoding)
  → FileGateway.write(handle)
```

XLSX là ngoại lệ: `exceljs` chế độ streaming writer, vẫn không buffer hết.

## 7. Khác biệt theo engine

| Engine | Ghi chú |
|---|---|
| PostgreSQL | Có thể dùng `COPY FROM STDIN` — **nhanh hơn 5–10×** so với INSERT. Ưu tiên dùng khi mode=Append và không cần xử lý lỗi từng dòng. |
| MySQL | `LOAD DATA LOCAL INFILE` nhanh nhưng thường bị tắt ở server → dùng extended insert |
| SQLite | Transaction lớn + `PRAGMA synchronous=OFF` tạm thời khi import |
| MSSQL | Bulk insert qua `tedious` bulk API |
| MongoDB | `insertMany` với `ordered:false` |

Việc chọn đường nhanh (`COPY`, bulk) là **tối ưu của driver**, khai báo qua
`caps.tools.bulkLoad`; logic import không cần biết.

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Dòng sai số cột | Ghi log kèm số dòng; `Continue on error` thì bỏ qua, không thì dừng |
| Không chuyển được kiểu | Log giá trị gốc + kiểu đích; không được ghi giá trị rác vào DB |
| File encoding sai | Phát hiện ở `import.analyze`, cảnh báo trước khi chạy |
| Hết dung lượng đĩa (export) | Huỷ job, `DISK_FULL`, xoá file dở |
| Upload đứt (web) | Resume từ byte cuối; job chưa bắt đầu nên không mất gì |
| Vi phạm FK | `Ignore FK constraint` thì tắt kiểm tra tạm, không thì log lỗi dòng đó |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Import CSV 1 GB / 10 triệu dòng (PostgreSQL, COPY) | ≤ 4 phút |
| Import CSV 1 GB (extended insert) | ≤ 12 phút |
| Export 10 triệu dòng ra CSV | ≤ 5 phút |
| RAM worker khi import file 5 GB | ≤ 300 MB |
| `import.analyze` (100 dòng đầu của file 5 GB) | ≤ 500 ms — **chỉ đọc phần đầu file** |

## 10. Bảo mật

`job:run`. Import là mutating → chặn ở read-only. `Copy`/`Delete` mode qua preview-token.
File upload (web): giới hạn `CORVUS_MAX_UPLOAD_MB`, kiểm MIME/extension, lưu ngoài web root,
xoá sau khi job xong. Log job đi qua redaction.

## 11. i18n

`import.step.*` (6), `import.format.*` (6), `import.encoding`, `import.delimiter`,
`import.qualifier`, `import.fixedWidth`, `import.fieldNameRow`, `import.firstDataRow`,
`import.lastDataRow`, `import.dateOrder`, `import.targetTable`, `import.newTable`,
`import.mapping.*` (4), `import.mode.*` (5), `import.advanced.*` (6),
`export.step.*` (5), `export.format.*` (9), `export.sameFile`, `export.sameFolder`,
`export.addTimestamp`, `export.includeHeader`, `job.*` (12), `wizard.saveProfile`

## 12. Tiêu chí chấp nhận

```
[ ] FR-08.01–32 đều có test
[ ] Import 1 GB CSV không vượt 300 MB RAM (integration, đo process)
[ ] Import round-trip: export → import → dữ liệu giống bản gốc bit-for-bit về giá trị
[ ] Cả 6 định dạng import và 9 định dạng export chạy được
[ ] 5 import mode đúng nghĩa (integration với dữ liệu chuẩn bị trước)
[ ] Continue on error: file có 10 dòng lỗi → 990 dòng vào, log đủ 10 lỗi
[ ] Encoding: file Shift-JIS và UTF-16 import đúng
[ ] Huỷ job giữa chừng: dọn sạch, transaction rollback, file tạm mất
[ ] Web: upload resume sau khi ngắt mạng
[ ] PostgreSQL dùng COPY khi có thể (test đếm thời gian, so với đường INSERT)
[ ] Profile lưu và nạp lại cho kết quả giống nhau
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
