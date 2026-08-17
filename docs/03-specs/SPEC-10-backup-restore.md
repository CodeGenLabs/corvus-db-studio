# SPEC-10: Backup & Restore

- **Trạng thái**: Ready
- **Wave**: W-3
- **Tier**: T1
- **Phụ thuộc**: SPEC-02, SPEC-08, ADR-0009, ADR-0010
- **Task**: T-320 … T-342

## 1. Mục tiêu

Người dùng tạo bản sao lưu logic của database và khôi phục lại, có thể lập lịch tự động.
UI Backup view đã có trong shell hiện tại.

## 2. Phạm vi

**Trong**: backup logic built-in (MySQL/PG/SQLite/MariaDB), restore, extract SQL từ file
backup, nén, verify, wrapper `mysqldump`/`pg_dump` khi có sẵn, lịch sử backup, profile.
**Ngoài**: physical backup, Oracle Data Pump, MongoDump, SQL Server native BACKUP → W6–W8
(vẫn theo cùng khung job).

## 3. Yêu cầu chức năng

### 3.1 Backup

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-10.01 | Chọn nguồn: connection + database/schema | MUST |
| FR-10.02 | Phạm vi: **toàn bộ database** / **chọn object** / **chỉ cấu trúc** | MUST |
| FR-10.03 | Chế độ "toàn bộ" MUST tự bao gồm object mới thêm sau này (không cố định danh sách) | MUST |
| FR-10.04 | Tuỳ chọn: nén (gzip / zstd / không), kèm routine & trigger, chỉ dữ liệu, verify sau khi ghi | MUST |
| FR-10.05 | Tuỳ chọn nâng cao: `single transaction` (InnoDB), `lock all tables`, tên file tuỳ ý, comment | MUST |
| FR-10.06 | Đích lưu: đường dẫn (desktop) hoặc thư mục trên server (web) | MUST |
| FR-10.07 | Tên file mặc định `<db>_<YYYYMMDD_HHmmss>.sql[.gz]` | MUST |
| FR-10.08 | Backup chạy như **job**, tiến trình theo object + theo dòng, huỷ được | MUST |
| FR-10.09 | Sau khi ghi, nếu bật verify: đọc lại file, kiểm checksum và cú pháp cơ bản | MUST |
| FR-10.10 | File backup MUST có header metadata: version Corvus, engine + version server, database, danh sách object, thời điểm, checksum | MUST |
| FR-10.11 | Backup MUST stream ra file — không buffer vào RAM | MUST |
| FR-10.12 | Lưu profile để chạy lại / đưa vào batch job | MUST |
| FR-10.13 | Nếu có `mysqldump`/`pg_dump` trong PATH hoặc cấu hình, người dùng MAY chọn dùng (nhanh hơn) | SHOULD |

### 3.2 Lịch sử backup

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-10.14 | Danh sách file backup trong thư mục đích: tên, thời điểm, dung lượng, loại, trạng thái | MUST |
| FR-10.15 | Trạng thái đọc từ metadata trong file; file lỗi/dở → `fail`, không cho restore | MUST |
| FR-10.16 | Thẻ tổng quan: bản mới nhất, dung lượng đích còn lại, lần restore gần nhất | SHOULD |
| FR-10.17 | Xoá file backup (có xác nhận) | SHOULD |

### 3.3 Restore

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-10.18 | Chọn file backup (từ lịch sử hoặc chọn file bất kỳ) | MUST |
| FR-10.19 | Hiện metadata của file: engine, version, database gốc, danh sách object, thời điểm | MUST |
| FR-10.20 | Chọn database đích (có thể khác database gốc) | MUST |
| FR-10.21 | Chọn object cần restore | MUST |
| FR-10.22 | Tuỳ chọn: tạo bảng, tạo index, tạo trigger, restore dữ liệu, `empty table` trước, `lock tables`, `Continue on error` | MUST |
| FR-10.23 | Restore MUST đi qua preview: hiện danh sách object **sẽ bị DROP**, số dòng hiện có sẽ mất | MUST |
| FR-10.24 | Restore vào database khác engine/version MUST cảnh báo tương thích | MUST |
| FR-10.25 | Chạy như job, tiến trình theo byte đã đọc, huỷ được | MUST |
| FR-10.26 | Huỷ giữa chừng MUST để lại trạng thái được nêu rõ (không im lặng) | MUST |
| FR-10.27 | Restore vào connection read-only MUST bị chặn | MUST |

### 3.4 Extract SQL

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-10.28 | Trích SQL từ file backup ra file `.sql` (chọn object, chọn structure/data) | SHOULD |
| FR-10.29 | Xem trước nội dung SQL của một object trong file backup | SHOULD |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `BackupView` | `packages/ui/src/views/BackupView.tsx` | **đã có** — nối logic thật |
| `BackupForm` | `…/backup/BackupForm.tsx` | tách từ `BackupView` |
| `BackupHistoryGrid` | `…/backup/BackupHistoryGrid.tsx` | dùng `DataGrid` |
| `RestoreWizard` | `…/wizards/restore/` | mới |
| `BackupFileInfo` | `…/backup/BackupFileInfo.tsx` | mới |
| `JobProgressPanel` | dùng chung | |

Trạng thái: empty (chưa có backup nào) · loading (đang đọc thư mục / đang đọc metadata file) ·
ready · error (file hỏng → hiện lý do) · unsupported (engine chưa có backup built-in → hiện
hướng dẫn dùng công cụ ngoài).

## 5. Hợp đồng RPC

```ts
export const backupList = defineUnary({
  name: 'backup.list',
  params: z.object({ connectionId: z.string().uuid(), directory: z.string().optional() }),
  result: z.array(z.object({
    fileName: z.string(), path: z.string(),
    createdAt: z.string(), sizeBytes: z.number(),
    kind: z.enum(['full', 'structure', 'data', 'incremental']),
    status: z.enum(['ok', 'warn', 'fail']),
    meta: BackupMeta.nullable(),           // null nếu không đọc được header
  })),
  permission: 'job:run',
  audit: 'metadata',
})

export const restorePreview = defineUnary({
  name: 'restore.preview',
  params: z.object({
    connectionId: z.string().uuid(),
    target: SchemaRef,
    file: FileHandle,
    objects: z.array(z.string()),
    options: RestoreOptions,
  }),
  result: z.object({
    /** Object sẽ bị DROP và số dòng hiện có sẽ mất — thông tin quan trọng nhất. */
    willDrop: z.array(z.object({ name: z.string(), currentRows: z.number().nullable() })),
    willCreate: z.array(z.string()),
    compatibility: z.array(z.object({ severity: z.enum(['info', 'warn', 'error']), message: z.string() })),
    previewToken: z.string(), expiresAt: z.string(),
  }),
  permission: 'job:run',
  audit: 'metadata',
  guard: 'writeGuard',
})
// restore.start({ previewToken }) → { jobId }
```

## 6. Logic engine

### Định dạng file backup

Văn bản SQL thuần với header metadata trong comment — **đọc được bằng mắt và chạy được bằng
`psql`/`mysql`** ngay cả khi không có Corvus. Đây là quyết định thiết kế quan trọng: không dùng
định dạng nhị phân độc quyền.

```sql
-- CORVUS-BACKUP-V1
-- {"appVersion":"1.0.0","engine":"postgres","serverVersion":"16.2",
--  "database":"sakila","schema":"public","createdAt":"2026-08-17T02:00:00Z",
--  "objects":[{"kind":"table","name":"country","rows":109}, …],
--  "options":{"compress":"gzip","includeRoutines":true},
--  "checksum":"sha256:…"}
-- END-CORVUS-HEADER
SET client_encoding = 'UTF8';
…
```

Nén: gzip/zstd bọc **toàn bộ** file (header cũng nén). Engine đọc header bằng cách giải nén
phần đầu.

`checksum` tính trên phần thân, ghi vào header ở **cuối** quá trình bằng cách ghi header
placeholder rồi seek về ghi lại — hoặc ghi header vào file `.meta` kèm theo nếu file bị nén
streaming. Chọn phương án 2 (đơn giản và an toàn hơn): `x.sql.gz` + `x.sql.gz.meta`.

### Thứ tự backup

```
1. Header metadata
2. SET / SET SESSION theo engine
3. Với từng object theo thứ tự phụ thuộc:
     - DROP IF EXISTS (nếu tuỳ chọn)
     - CREATE (structure)
     - INSERT dữ liệu (extended, batch)
4. Index và FK ở cuối (nhanh hơn nhiều so với tạo trước khi insert)
5. Trigger, routine
6. Reset SET
```

### Restore

Đọc stream → tách statement bằng `splitStatements` (SPEC-04 §6) → chạy tuần tự trong
transaction nếu engine hỗ trợ. Tiến trình theo byte đã đọc / tổng byte.

**Không** nạp cả file vào RAM. File 20 GB phải restore được.

## 7. Khác biệt theo engine

| Engine | Ghi chú |
|---|---|
| MySQL | `single transaction` chỉ đúng với InnoDB; MyISAM cần `lock tables`. `SET FOREIGN_KEY_CHECKS=0` khi restore |
| PostgreSQL | `pg_dump` custom format nhanh hơn nhiều — dùng nếu có; built-in thì sinh SQL thuần |
| SQLite | Backup nhanh nhất là copy file (khi không có writer); vẫn hỗ trợ dump SQL |
| MSSQL/Oracle/Mongo/Redis | W6–W8; dùng công cụ native, cùng khung job |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Hết dung lượng đĩa | `DISK_FULL` | Huỷ job, xoá file dở, nêu dung lượng cần |
| File backup hỏng / checksum sai | `BACKUP_CORRUPT` | Không cho restore; nêu rõ |
| Version server đích thấp hơn nguồn | `INCOMPATIBLE_VERSION` | Cảnh báo, cho phép tiếp tục có xác nhận |
| Restore lỗi giữa chừng, không transactional | `RESTORE_PARTIAL` | Dialog nêu rõ object nào đã restore, nào chưa |
| Thiếu quyền CREATE/DROP | `PERMISSION_DENIED` | Nêu quyền cần thiết |
| Huỷ giữa restore | `CANCELLED` | Nêu rõ trạng thái database hiện tại |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Backup database 10 GB (built-in, gzip) | ≤ 25 phút |
| Backup 10 GB (qua `pg_dump -Fc`) | ≤ 8 phút |
| Restore file 10 GB | ≤ 40 phút |
| RAM worker khi backup/restore | ≤ 300 MB |
| `backup.list` với 500 file | ≤ 300 ms (đọc header, không đọc cả file) |

## 10. Bảo mật

`job:run`. Restore là mutating → chặn ở read-only, bắt buộc preview-token với danh sách
`willDrop`. File backup **chứa dữ liệu thật** → tài liệu phải nhắc người dùng về bảo mật thư
mục đích; ở web, thư mục backup không được nằm trong web root. Audit `full` cho restore.

## 11. i18n

`backup.new`, `backup.scope.*` (3), `backup.option.*` (6), `backup.destination`,
`backup.run`, `backup.running`, `backup.complete`, `backup.idle`, `backup.history`,
`backup.file`, `backup.when`, `backup.size`, `backup.kind`, `backup.status`,
`backup.restore`, `backup.delete`, `restore.step.*` (4), `restore.willDrop`,
`restore.willLoseRows`, `restore.compatibility`, `restore.option.*` (7),
`error.backup.*` (5)

## 12. Tiêu chí chấp nhận

```
[ ] FR-10.01–29 đều có test
[ ] Round-trip: backup → drop database → restore → schema và dữ liệu giống bản gốc (integration, 3 engine)
[ ] File backup chạy được bằng psql/mysql client bên ngoài (test gọi CLI thật)
[ ] Backup 10 GB: RAM worker ≤ 300 MB
[ ] Verify phát hiện được file bị sửa (test làm hỏng file có chủ đích)
[ ] restore.preview hiện đúng danh sách willDrop + số dòng sẽ mất
[ ] Huỷ backup: file dở bị xoá; huỷ restore: trạng thái được nêu rõ
[ ] Chế độ "toàn bộ database" bao gồm bảng mới tạo sau khi lưu profile
[ ] pg_dump wrapper cho kết quả restore được bằng chính Corvus
[ ] Read-only chặn restore
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
