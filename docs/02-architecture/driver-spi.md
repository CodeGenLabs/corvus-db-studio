# Driver SPI — Giao diện nhà cung cấp database

> Mục tiêu: thêm một database engine mới = viết **một package** hiện thực interface dưới đây và
> vượt qua `driver-conformance-suite`. **Không sửa một dòng nào** trong `services`, `engine` hay `ui`.

---

## 1. Interface chính

```ts
// packages/driver-core/src/types.ts

export interface DatabaseDriver {
  readonly id: DriverId                    // 'postgres' | 'mysql' | 'sqlite' | …
  readonly displayName: string
  readonly capabilities: CapabilitySet
  readonly connectionSchema: z.ZodType     // field nào hiện trong dialog kết nối
  readonly defaultPort?: number

  connect(profile: ResolvedProfile, ctx: DriverContext): Promise<DriverConnection>
}

export interface DriverConnection {
  readonly driverId: DriverId
  readonly serverVersion: ServerVersion
  /** Capability có thể hẹp hơn của driver, tuỳ version server thật. */
  readonly capabilities: CapabilitySet

  readonly introspect: Introspector
  readonly dialect: SqlDialect
  readonly ddl: DdlGenerator

  execute(req: ExecuteRequest): AsyncIterable<ResultChunk>
  beginTransaction(opts?: TxOptions): Promise<Transaction>
  cancel(handle: StatementHandle): Promise<void>

  /** Chức năng chỉ engine đó có: MONITOR của Redis, aggregate của Mongo… */
  extension<T = unknown>(name: string): T | undefined

  ping(): Promise<number>                  // trả latency ms
  close(): Promise<void>
}
```

## 2. `CapabilitySet` — khác biệt engine biểu diễn bằng dữ liệu

```ts
export interface CapabilitySet {
  // Cấu trúc phân cấp
  hasCatalogs: boolean            // MS, PG có; MY thì database ≡ schema
  hasSchemas: boolean

  // Loại object hỗ trợ
  objects: {
    table: boolean; view: boolean; materializedView: boolean
    procedure: boolean; function: boolean; package: boolean
    trigger: boolean; sequence: boolean; index: boolean
    domain: boolean; type: boolean; event: boolean
    collection: boolean          // MongoDB
    keyspace: boolean            // Redis
  }

  // SQL
  sql: {
    parameterStyle: 'dollar' | 'question' | 'at' | 'colon' | 'none'
    supportsCte: boolean; supportsWindowFunctions: boolean
    supportsReturning: boolean; supportsUpsert: boolean
    limitSyntax: 'limit-offset' | 'offset-fetch' | 'rownum' | 'top' | 'none'
    identifierQuote: '"' | '`' | '[]'
    maxIdentifierLength: number
    caseSensitivity: 'sensitive' | 'insensitive' | 'lower' | 'upper'
  }

  // Thực thi
  exec: {
    streamingCursor: boolean
    multipleStatements: boolean
    multipleResultSets: boolean
    cancelStatement: boolean
    explain: boolean; explainAnalyze: boolean
    preparedStatements: boolean
  }

  // Giao dịch
  tx: {
    supported: boolean
    savepoints: boolean
    isolationLevels: IsolationLevel[]
    ddlTransactional: boolean     // PG true, MY false — ảnh hưởng lớn tới migration
  }

  // Công cụ
  tools: {
    logicalBackup: boolean; physicalBackup: boolean
    userManagement: boolean; roleManagement: boolean
    processMonitor: boolean; serverVariables: boolean
    dataGeneration: boolean; profiling: boolean
  }
}
```

**Quy tắc vàng**: UI **không bao giờ** viết `if (driverId === 'mysql')`.
Chỉ viết `if (caps.objects.materializedView)`.

Vi phạm sẽ bị chặn bởi ESLint rule `corvus/no-driver-id-branching` (xem
[coding-rules.md](../05-rules/coding-rules.md)).

Bảng đầy đủ giá trị của 8 engine: [capability-matrix.md](capability-matrix.md).

## 3. `Introspector`

```ts
export interface Introspector {
  listDatabases(): Promise<DatabaseMeta[]>
  listSchemas(db: string): Promise<SchemaMeta[]>
  listObjects(ref: SchemaRef, kinds: ObjectKind[]): Promise<ObjectSummary[]>

  tableMeta(ref: ObjectRef): Promise<TableMeta>       // cột, PK, index, FK, trigger, option
  routineMeta(ref: ObjectRef): Promise<RoutineMeta>
  viewMeta(ref: ObjectRef): Promise<ViewMeta>

  dependencies(ref: ObjectRef): Promise<{ uses: ObjectRef[]; usedBy: ObjectRef[] }>
  identifiers(ref: SchemaRef): Promise<IdentifierIndex>   // cho code completion

  /** Số dòng ước lượng, rẻ. Dùng cho cột "Rows" trong Objects view. */
  estimateRowCount(ref: ObjectRef): Promise<number | null>
}
```

Yêu cầu hiệu năng: `listObjects` trên schema có 5 000 bảng phải trả về trong **≤ 800 ms**.
Nghĩa là: một truy vấn gộp vào `information_schema`/catalog, **không** N+1.

## 4. `SqlDialect` và `DdlGenerator`

```ts
export interface SqlDialect {
  quoteIdentifier(name: string): string
  quoteLiteral(value: unknown): string        // chỉ dùng khi hiển thị preview, KHÔNG để thực thi
  buildLimit(sql: string, limit: number, offset: number): string
  buildParamPlaceholder(index: number): string
  mapNativeType(native: NativeTypeInfo): CorvusType
  mapCorvusType(t: CorvusType): string
  readonly keywords: ReadonlySet<string>
  readonly typeCatalog: TypeDefinition[]      // feed dropdown "Type" trong Table Designer
}

export interface DdlGenerator {
  createTable(d: TableDesign): SqlScript
  alterTable(before: TableMeta, after: TableDesign): SqlScript
  dropObject(ref: ObjectRef, opts: DropOptions): SqlScript
  createIndex / dropIndex / addForeignKey / dropForeignKey / …
  grant(g: GrantSpec): SqlScript
  revoke(g: GrantSpec): SqlScript
}

export interface SqlScript {
  statements: string[]
  /** Cảnh báo hiện cho người dùng trước khi chạy. */
  warnings: DdlWarning[]      // vd. 'ALTER này sẽ rebuild bảng 40 triệu dòng'
  /** Có thể sinh script đảo ngược không. */
  rollback?: string[]
  transactional: boolean
}
```

**`alterTable` là phần khó nhất của cả dự án.** Yêu cầu:
- Diff theo *danh tính cột* (dùng id nội bộ), không theo tên → phát hiện được rename
- Sinh cảnh báo khi thao tác gây khoá bảng hoặc mất dữ liệu (thu hẹp kiểu, xoá cột)
- SQLite không có `ALTER COLUMN` → phải sinh chuỗi
  `create table __new` → `insert select` → `drop` → `rename`
- Có bộ test bảng vàng (golden file) cho ≥ 40 kịch bản diff mỗi engine

## 5. Thực thi & streaming

```ts
export interface ExecuteRequest {
  sql: string
  params?: unknown[]
  chunkSize: number
  maxRows?: number
  signal: AbortSignal
  transaction?: Transaction
}

export interface ResultChunk {
  /** Chỉ có ở chunk đầu của mỗi result set. */
  columns?: ColumnMeta[]
  rows: CellValue[][]
  /** Chỉ mục result set — cho câu lệnh nhiều kết quả. */
  resultIndex: number
  done: boolean
  stats?: { rowCount: number; affectedRows?: number; durationMs: number; truncated: boolean }
  notices?: string[]      // NOTICE của PG, warning của MySQL
}
```

Bắt buộc với mọi driver:
- Dùng cursor thật (`pg-cursor`, `mysql2.stream()`, `mssql stream:true`, mongo cursor).
  **Cấm** gọi `client.query()` rồi trả cả mảng.
- Tôn trọng `signal.aborted` — huỷ trong ≤ 200 ms và gửi lệnh huỷ tới server nếu engine hỗ trợ.
- Không giữ tham chiếu tới chunk đã phát (để GC thu hồi).

## 6. Chuẩn hoá giá trị

Vấn đề: `BIGINT` của PG về là `string`, của MySQL là `number` khi nhỏ; `DATE` mỗi driver một kiểu.
Giải pháp — mọi driver phải map về **CellValue** chuẩn:

```ts
export type CellValue =
  | null
  | { k: 'str';  v: string }
  | { k: 'num';  v: number }
  | { k: 'big';  v: string }          // luôn là string, không mất chính xác
  | { k: 'bool'; v: boolean }
  | { k: 'date'; v: string }          // ISO-8601, kèm timezone nếu có
  | { k: 'bin';  v: string; size: number }   // base64, cắt ở 64 KB, kèm size thật
  | { k: 'json'; v: unknown }
  | { k: 'geo';  v: string }          // WKT
  | { k: 'unsupported'; text: string }
```

UI format hiển thị từ `CellValue` + `ColumnMeta`, không đoán kiểu từ nội dung.

## 7. Ánh xạ lỗi

Mỗi driver có bảng ánh xạ bắt buộc:

```ts
// packages/driver-postgres/src/errors.ts
const PG_ERROR_MAP: Record<string, ErrorCode> = {
  '28P01': 'AUTH_FAILED',
  '3D000': 'DATABASE_NOT_FOUND',
  '42601': 'SQL_SYNTAX',
  '42501': 'PERMISSION_DENIED',
  '23505': 'UNIQUE_VIOLATION',
  '23503': 'FK_VIOLATION',
  '57014': 'CANCELLED',
  '53300': 'TOO_MANY_CONNECTIONS',
  // …
}
```

Mã nào chưa map → `UNKNOWN` + giữ nguyên `detail`. Conformance suite yêu cầu ánh xạ đủ
**≥ 20 mã phổ biến nhất** của mỗi engine.

## 8. Bộ kiểm định `driver-conformance-suite`

Nằm ở `packages/driver-core/src/conformance/`. Một driver mới chỉ cần:

```ts
// packages/driver-postgres/src/conformance.test.ts
import { runConformanceSuite } from '@corvus/driver-core/conformance'
import { postgresDriver } from './index'

runConformanceSuite(postgresDriver, {
  container: 'postgres:16',
  setupSql: readFileSync('fixtures/conformance.sql', 'utf8'),
})
```

Suite kiểm 9 nhóm, tổng ~180 test case:

| Nhóm | Nội dung kiểm |
|---|---|
| C1 Connect | thành công, sai mật khẩu, sai host, timeout, TLS, huỷ giữa chừng |
| C2 Introspect | đủ 12 loại object, bảng 0 cột, tên có unicode/dấu cách/từ khoá, 5 000 bảng < 800 ms |
| C3 Execute | select rỗng, 1 dòng, 1 triệu dòng streaming, nhiều result set, DDL, DML, cú pháp sai |
| C4 Types | round-trip đủ kiểu native → `CellValue` → hiển thị → ghi lại, gồm NULL/BIG/blob/json/array |
| C5 Transaction | commit, rollback, savepoint, isolation level, DDL trong tx |
| C6 Cancel | huỷ query đang chạy < 200 ms, không rò rỉ session |
| C7 DDL gen | 40 kịch bản diff → so với golden file |
| C8 Errors | 20 mã lỗi → đúng `ErrorCode` |
| C9 Resource | 200 lần connect/close không rò socket; RAM ổn định khi stream 10 triệu dòng |

**Không vượt suite = không được ghi vào tài liệu là "hỗ trợ engine X".**

## 9. Checklist thêm driver mới

```
[ ] 1. pnpm create package @corvus/driver-<name>
[ ] 2. Khai báo CapabilitySet trung thực (thà thiếu còn hơn khai khống)
[ ] 3. Hiện thực connect() + pool + ping + close
[ ] 4. Hiện thực Introspector (truy vấn gộp, không N+1)
[ ] 5. Hiện thực SqlDialect + typeCatalog
[ ] 6. Hiện thực DdlGenerator + golden file
[ ] 7. Bảng ánh xạ lỗi ≥ 20 mã
[ ] 8. Chuẩn hoá CellValue đủ mọi kiểu native
[ ] 9. Đăng ký vào driver registry
[ ] 10. Bổ sung cột vào capability-matrix.md
[ ] 11. runConformanceSuite xanh 100%
[ ] 12. Thêm icon + màu vào ui/theme/driver-marks.ts
[ ] 13. Thêm preset kết nối vào dialog New Connection
[ ] 14. Cập nhật feature-inventory.md
```
