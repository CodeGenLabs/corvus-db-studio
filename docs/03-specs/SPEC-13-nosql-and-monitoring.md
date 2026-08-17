# SPEC-13: NoSQL (MongoDB / Redis) & Monitoring

- **Trạng thái**: Ready
- **Wave**: W-5 (monitoring) / W-7 (NoSQL)
- **Tier**: T2
- **Phụ thuộc**: SPEC-02, SPEC-03, ADR-0003
- **Task**: T-400 … T-438

## 1. Mục tiêu

Hai nhóm tính năng gộp vào một SPEC vì cùng đặc điểm: chúng **không** vừa mô hình bảng/SQL và
đều dựa vào cơ chế `connection.extension()` của driver SPI.

- **NoSQL**: MongoDB (document) và Redis (key-value) cần view riêng, không dùng được `DataGrid`
  ở dạng thuần.
- **Monitoring**: process list, variables, status — dữ liệu thời gian thực của máy chủ.

## 2. Phạm vi

**Trong**: MongoDB grid/tree/JSON view, aggregation pipeline builder, schema analysis; Redis
key browser theo type, command monitor, pub/sub monitor; Server Monitor (process/variables/
status); Find in Database/Schema.
**Ngoài**: MongoDump/MongoExport → theo khung SPEC-08/10. Data profiling RDBMS → W8.

## 3. Yêu cầu chức năng

### 3.1 MongoDB

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-13.01 | Cây: connection → database → collection; hiện số document và dung lượng | MUST |
| FR-13.02 | **Grid view**: làm phẳng document thành cột; cột là union của các field xuất hiện trong mẫu | MUST |
| FR-13.03 | Grid MUST tô màu theo kiểu BSON (string / number / date / objectId / array / object / null) | MUST |
| FR-13.04 | **Tree view**: cây document mở/gập theo từng field | MUST |
| FR-13.05 | **JSON view**: editor JSON có validate, sửa được | MUST |
| FR-13.06 | Sửa document MUST đi qua preview (hiện `updateOne` sẽ chạy) | MUST |
| FR-13.07 | Thêm/xoá document | MUST |
| FR-13.08 | Filter bằng JSON query (`{ field: value }`), có validate cú pháp | MUST |
| FR-13.09 | Sort bằng JSON, projection bằng JSON | MUST |
| FR-13.10 | Query editor: chạy được `find`, `aggregate`, và các lệnh khác | MUST |
| FR-13.11 | Aggregation pipeline builder: thêm/xoá/đổi thứ tự stage, xem kết quả từng stage | SHOULD |
| FR-13.12 | Index: liệt kê, tạo, xoá (gồm compound, text, TTL, unique, partial) | MUST |
| FR-13.13 | Explain cho find/aggregate | SHOULD |
| FR-13.14 | Schema analysis: thống kê kiểu và phân phối theo field | SHOULD |
| FR-13.15 | GridFS: liệt kê, tải lên, tải về, xoá file | MAY |

### 3.2 Redis

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-13.16 | Cây: connection → db0..dbN (theo cấu hình server) | MUST |
| FR-13.17 | Key browser MUST dùng `SCAN` với cursor, KHÔNG dùng `KEYS *` | MUST |
| FR-13.18 | Lọc key theo pattern; hiện type, TTL, dung lượng ước lượng | MUST |
| FR-13.19 | Editor theo type: string, hash, list, set, zset, stream, JSON (RedisJSON) | MUST |
| FR-13.20 | Đặt/xoá TTL; đổi tên key; xoá key (có xác nhận) | MUST |
| FR-13.21 | Command editor: gõ lệnh Redis, có completion và syntax highlight | MUST |
| FR-13.22 | Command Monitor (`MONITOR`) MUST có cảnh báo rõ về ảnh hưởng hiệu năng trước khi bật | MUST |
| FR-13.23 | Pub/Sub monitor: subscribe channel/pattern, hiện message realtime, tô màu theo channel | SHOULD |
| FR-13.24 | Lệnh phá huỷ (`FLUSHDB`, `FLUSHALL`, `KEYS *` trên DB lớn) MUST bị chặn hoặc yêu cầu xác nhận đặc biệt | MUST |

### 3.3 Server Monitor

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-13.25 | Process list: liệt kê tiến trình/session đang chạy, cột theo engine | MUST |
| FR-13.26 | Auto refresh với chu kỳ cấu hình được (mặc định 5 s); bật/tắt được | MUST |
| FR-13.27 | Kill process MUST yêu cầu xác nhận và hiện câu lệnh sẽ chạy | MUST |
| FR-13.28 | Ghim (`On Top`) một tiến trình để theo dõi | SHOULD |
| FR-13.29 | Variables: liệt kê biến server; sửa được nếu engine cho phép (qua preview) | SHOULD |
| FR-13.30 | Status: liệt kê chỉ số trạng thái; đánh dấu chỉ số thay đổi giữa hai lần refresh | SHOULD |
| FR-13.31 | Chỉ hiện khi `caps.tools.processMonitor` / `.serverVariables` | MUST |

### 3.4 Find in Database/Schema

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-13.32 | Tìm trong **dữ liệu**: quét bảng đã chọn, cột kiểu text, theo mode Contains/Whole Word/Prefix/Regex | SHOULD |
| FR-13.33 | Tìm trong **cấu trúc**: tên bảng/cột/view/routine/index/trigger, và body routine | SHOULD |
| FR-13.34 | Chạy như job (có thể rất lâu), tiến trình theo bảng, huỷ được | MUST |
| FR-13.35 | Kết quả: nhấp đúp mở đúng object / đúng dòng dữ liệu | SHOULD |
| FR-13.36 | MUST cảnh báo trước khi tìm trong dữ liệu của database lớn (ước lượng thời gian) | MUST |

## 4. Giao diện

| Component | Đường dẫn |
|---|---|
| `MongoDataView` (grid/tree/json switcher) | `packages/ui/src/views/mongo/MongoDataView.tsx` |
| `BsonTreeView`, `BsonJsonView` | `…/views/mongo/` |
| `PipelineBuilder` | `…/views/mongo/PipelineBuilder.tsx` |
| `SchemaAnalysisView` | `…/views/mongo/SchemaAnalysisView.tsx` |
| `RedisKeyBrowser` | `…/views/redis/RedisKeyBrowser.tsx` |
| `RedisValueEditor` (7 editor con) | `…/views/redis/editors/` |
| `CommandMonitorView`, `PubSubView` | `…/views/redis/` |
| `ServerMonitorView` | `…/views/monitor/ServerMonitorView.tsx` |
| `FindInSchemaDialog` | `…/dialogs/FindInSchemaDialog.tsx` |

MongoDB grid dùng `DataGrid` với renderer cell riêng cho BSON. Redis key browser dùng
`DataGrid` cho danh sách key + panel editor bên phải.

Trạng thái: đủ 5 như mọi module; `unsupported` là quan trọng nhất ở đây — mọi view NoSQL phải
ẩn hoàn toàn với engine SQL và ngược lại.

## 5. Hợp đồng RPC

```ts
export const monitorProcesses = defineStream({
  name: 'monitor.processes',
  params: z.object({
    connectionId: z.string().uuid(),
    intervalMs: z.number().int().min(1000).max(60000).default(5000),
  }),
  chunk: z.object({
    columns: z.array(ColumnMeta),
    rows: z.array(z.array(CellValueSchema)),
    at: z.string(),
  }),
  permission: 'monitor:read',
  audit: 'none',
})

export const mongoFind = defineStream({
  name: 'mongo.find',
  params: z.object({
    connectionId: z.string().uuid(),
    database: z.string(), collection: z.string(),
    filter: z.record(z.unknown()).default({}),
    sort: z.record(z.number()).optional(),
    projection: z.record(z.number()).optional(),
    limit: z.number().int().max(100_000).default(1000),
    skip: z.number().int().default(0),
  }),
  chunk: z.object({ docs: z.array(z.unknown()), done: z.boolean(), stats: z.unknown().optional() }),
  permission: 'data:read',
  audit: 'metadata',
})

export const redisScan = defineStream({
  name: 'redis.scan',
  params: z.object({
    connectionId: z.string().uuid(), db: z.number().int(),
    match: z.string().default('*'),
    count: z.number().int().default(500),
    /** Số key tối đa trả về, chống quét vô hạn. */
    maxKeys: z.number().int().max(500_000).default(50_000),
  }),
  chunk: z.object({
    keys: z.array(z.object({ key: z.string(), type: z.string(), ttl: z.number(), sizeBytes: z.number().nullable() })),
    cursor: z.string(), done: z.boolean(),
  }),
  permission: 'data:read',
  audit: 'metadata',
})
```

Còn lại: `mongo.aggregate`, `.previewUpdate`/`.applyUpdate`, `.indexes`, `.explain`,
`.analyzeSchema`; `redis.get`/`.previewSet`/`.applySet`/`.previewDelete`/`.applyDelete`,
`.command`, `.monitorStart`/`.monitorStop`, `.subscribe`; `monitor.killProcess` (có preview),
`.variables`, `.previewSetVariable`, `.status`; `search.findInSchema` (job).

## 6. Logic engine

### MongoDB làm phẳng document → grid

```
1. Đọc N document mẫu (mặc định 100, cấu hình được)
2. Duyệt đệ quy, thu tập đường dẫn field: 'a', 'a.b', 'a.b.0'
3. Cột = union các đường dẫn, sắp xếp theo tần suất xuất hiện giảm dần
4. Field không có trong một document ⇒ ô 'missing' (KHÁC null — phải phân biệt trực quan)
5. Array/object lồng ⇒ hiện tóm tắt '{3 fields}' / '[5]', mở được ở Tree view
```

`missing` vs `null` là phân biệt có ý nghĩa trong MongoDB — grid phải thể hiện khác nhau
(giống NULL vs chuỗi rỗng ở SPEC-03).

### Redis SCAN

```
cursor = '0'
do {
  [cursor, keys] = SCAN cursor MATCH pattern COUNT count
  pipeline: TYPE + TTL + MEMORY USAGE (nếu có) cho từng key   ← pipeline, KHÔNG loop round-trip
  phát chunk
} while (cursor !== '0' && tổng key < maxKeys)
```

`MEMORY USAGE` tốn kém trên key lớn → chỉ gọi khi người dùng bật cột đó.

### Server Monitor auto refresh

Stream với `intervalMs`. Engine chạy truy vấn định kỳ, so sánh với kết quả trước để đánh dấu
dòng thay đổi. Client huỷ stream khi rời view — **bắt buộc**, nếu không sẽ để lại truy vấn
chạy mãi.

## 7. Khác biệt theo engine

| Engine | Process list | Variables | Status |
|---|---|---|---|
| MySQL | `SHOW FULL PROCESSLIST` / `performance_schema.threads` | `SHOW VARIABLES` (sửa được) | `SHOW GLOBAL STATUS` |
| PostgreSQL | `pg_stat_activity` | `pg_settings` (một số sửa được) | `pg_stat_database` |
| MSSQL | `sys.dm_exec_requests` + `sys.dm_exec_sql_text` | `sys.configurations` | `sys.dm_os_performance_counters` |
| Oracle | `v$session`, `v$sql` | `v$parameter` | `v$sysstat` |
| MongoDB | `currentOp()` | `getParameter` | `serverStatus()` |
| Redis | `CLIENT LIST` | `CONFIG GET *` (sửa được) | `INFO ALL` |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Không có quyền xem process list | `PERMISSION_DENIED` + nêu quyền cần (`PROCESS`, `pg_read_all_stats`…) |
| `MONITOR` làm chậm server | Cảnh báo **trước** khi bật; tự dừng sau 5 phút; nút dừng luôn hiển thị |
| Redis DB có 50 triệu key | Dừng ở `maxKeys`, hiện banner "đã hiện 50 000 key đầu tiên, hãy thu hẹp pattern" |
| JSON filter sai cú pháp | Validate ở client trước khi gửi, chỉ rõ vị trí |
| Find in data trên DB 500 GB | Cảnh báo ước lượng thời gian; job huỷ được |
| Kill process thất bại | Nêu lý do từ server (tiến trình đã kết thúc / thiếu quyền) |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Mongo find 10 000 document, làm phẳng và render | ≤ 2 s |
| Redis SCAN 50 000 key với pipeline metadata | ≤ 5 s |
| Process list refresh 5 s với 2 000 session | ≤ 500 ms/lần |
| Pub/Sub 1 000 message/giây | UI không tụt dưới 55 fps (gom theo lô 100 ms) |

## 10. Bảo mật

- `monitor:read` cho monitoring; `data:read`/`data:write` cho NoSQL data.
- Kill process, sửa variable, mọi ghi vào Mongo/Redis → preview-token.
- `FLUSHDB`/`FLUSHALL` → xác nhận gõ tên database, và **bị chặn hoàn toàn** ở read-only.
- `MONITOR` ghi audit `full` (nó thấy được mọi lệnh, kể cả `AUTH`) — và output của nó phải đi
  qua redaction trước khi hiện lên UI.
- Command editor Redis: lệnh trong danh sách phá huỷ cần xác nhận riêng.

## 11. i18n

`mongo.gridView`, `mongo.treeView`, `mongo.jsonView`, `mongo.missing`, `mongo.filter`,
`mongo.projection`, `mongo.pipeline.*` (8), `mongo.schemaAnalysis.*` (5),
`redis.keyBrowser`, `redis.pattern`, `redis.ttl`, `redis.type.*` (7), `redis.setTtl`,
`redis.rename`, `redis.monitor.warning`, `redis.flushWarning`, `redis.pubsub.*` (5),
`monitor.processes`, `monitor.variables`, `monitor.status`, `monitor.autoRefresh`,
`monitor.killProcess`, `monitor.onTop`, `monitor.notSupported`,
`find.inData`, `find.inStructure`, `find.mode.*` (4), `find.warnLarge`, `find.results`

## 12. Tiêu chí chấp nhận

```
[ ] FR-13.01–36 đều có test
[ ] Mongo: grid/tree/json cùng hiển thị đúng một document phức tạp (nested, array, ObjectId, Date, Decimal128)
[ ] Mongo: 'missing' phân biệt được với 'null' trực quan và trong copy ra
[ ] Mongo: sửa document qua preview, round-trip đúng kiểu BSON
[ ] Redis: SCAN không dùng KEYS — test spy trên lệnh gửi tới server
[ ] Redis: 7 loại value editor round-trip đúng
[ ] Redis: FLUSHDB bị chặn ở read-only, cần xác nhận ở read-write
[ ] MONITOR: cảnh báo trước, tự dừng sau 5 phút, output đã redact
[ ] Process list: auto refresh, huỷ stream khi rời view (test không còn truy vấn chạy)
[ ] Kill process qua preview
[ ] Find in schema: chạy như job, huỷ được, kết quả nhấp mở được object
[ ] Mọi view NoSQL ẩn với engine SQL và ngược lại
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
