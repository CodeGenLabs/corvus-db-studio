import type { CellValue, DriverId } from '@corvus/contract'
import type { ResolvedProfile } from '../types'
import { CONFORMANCE_SCHEMA, MYSQL_SETUP_SQL, POSTGRES_SETUP_SQL, SQLITE_SETUP_SQL } from './fixture'

/** Nhóm test của conformance suite — driver-spi.md §8. */
export type ConformanceGroup = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9'

/**
 * Kỳ vọng cho C3 về kiểu giá trị — mỗi engine một bảng riêng.
 *
 * Đây là chỗ trung thực nhất trong bộ conformance: SQLite thật sự KHÔNG có kiểu boolean,
 * không có số thập phân chính xác, không có timestamp. Bắt nó trả `{k:'bool'}` cho mọi
 * trường hợp là bắt driver nói dối. Thay vì thế, mỗi engine khai đúng cái nó làm được,
 * và runner kiểm đúng cái đã khai.
 */
export interface ProbeExpectation {
  /** Kỳ vọng cho `big_val` = 9223372036854775807 — mọi engine đều phải giữ đủ chữ số. */
  big: CellValue
  /** Kỳ vọng cho `numeric_val`; `undefined` = engine không có kiểu số chính xác. */
  numeric?: { k: CellValue['k']; contains: string }
  bool: CellValue
  json: CellValue['k']
  bytes: CellValue['k']
  ts: CellValue['k']
}

/**
 * Phần KHÁC NHAU giữa các engine trong bộ conformance.
 *
 * Trước khi có kiểu này, `runner.ts` giả định PostgreSQL ở 8 chỗ (schema luôn tồn tại,
 * `generate_series`, `$1::text`, port 5432, `::jsonb`…) nên không engine thứ hai nào chạy
 * được. Toàn bộ khác biệt gom về đây; runner chỉ còn phần chung.
 */
export interface ConformanceDialect {
  id: DriverId
  /**
   * SQL dựng fixture, đã tách thành từng câu.
   * Tách sẵn vì SQLite chỉ chạy một câu lệnh mỗi lần `prepare()`.
   */
  setupSql: readonly string[]
  /** Schema chứa fixture; `undefined` khi engine không có tầng schema. */
  schema?: string
  /** Tên object đầy đủ, đã quote đúng cú pháp engine. */
  qualify(name: string): string
  hasDatabases: boolean
  hasSchemas: boolean
  /** Có lưu comment cột không (SQLite: không). */
  supportsColumnComment: boolean
  /** Profile chắc chắn không kết nối được — C1 kiểm việc từ chối bằng CorvusError. */
  badProfiles: ReadonlyArray<{
    label: string
    make(base: ResolvedProfile): ResolvedProfile
    timeoutMs?: number
  }>
  /** SQL sinh đúng `n` dòng một cột. PostgreSQL có `generate_series`, SQLite dùng CTE đệ quy. */
  seriesSql(n: number): string
  /** SQL trả về đúng một cột text lấy từ tham số thứ nhất — kiểm bind chứ không nội suy. */
  echoParamSql: string
  /** Câu lệnh sai cú pháp, phải cho ra SYNTAX_ERROR. */
  syntaxErrorSql: string
  /** Từ khoá bắt buộc có trong DDL của view. */
  viewDdlContains: string
  probe: ProbeExpectation
  /** Nhóm test bỏ qua, KÈM lý do — runner in ra, không bỏ qua trong im lặng. */
  skip?: Readonly<Partial<Record<ConformanceGroup, string>>>
}

function splitPgSetup(sql: string): string[] {
  // Fixture PostgreSQL không có dấu chấm phẩy trong chuỗi literal nên tách theo ';' là đủ.
  // Test thật của splitStatements nằm ở @corvus/sql; ở đây chỉ cần dựng fixture.
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export const POSTGRES_CONFORMANCE: ConformanceDialect = {
  id: 'postgres',
  setupSql: splitPgSetup(POSTGRES_SETUP_SQL),
  schema: CONFORMANCE_SCHEMA,
  qualify: (name) => `${CONFORMANCE_SCHEMA}."${name}"`,
  hasDatabases: true,
  hasSchemas: true,
  supportsColumnComment: true,
  badProfiles: [
    {
      label: 'sai mật khẩu',
      make: (base) => ({ ...base, password: 'mat-khau-sai-chac-chan-khong-dung' }),
    },
    {
      label: 'host không tồn tại',
      make: (base) => ({ ...base, host: 'khong-ton-tai.corvus.invalid', port: 5432 }),
      timeoutMs: 30_000,
    },
  ],
  seriesSql: (n) => `SELECT generate_series(1, ${n}) AS n`,
  echoParamSql: 'SELECT $1::text AS v',
  syntaxErrorSql: 'SELEKT 1',
  viewDdlContains: 'CREATE VIEW',
  probe: {
    big: { k: 'big', v: '9223372036854775807' },
    numeric: { k: 'big', contains: '12345678901234567890' },
    bool: { k: 'bool', v: true },
    json: 'json',
    bytes: 'bytes',
    ts: 'date',
  },
}

export const SQLITE_CONFORMANCE: ConformanceDialect = {
  id: 'sqlite',
  setupSql: SQLITE_SETUP_SQL,
  schema: undefined,
  qualify: (name) => `"${name}"`,
  hasDatabases: true,
  hasSchemas: false,
  supportsColumnComment: false,
  badProfiles: [
    {
      label: 'tệp không tồn tại',
      make: (base) => ({ ...base, database: 'D:/khong-ton-tai/corvus-khong-co-tep-nay.db' }),
    },
  ],
  // SQLite không có generate_series trong bản build mặc định → CTE đệ quy là cách chuẩn.
  seriesSql: (n) =>
    `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s`,
  echoParamSql: 'SELECT CAST(? AS TEXT) AS v',
  syntaxErrorSql: 'SELEKT 1',
  viewDdlContains: 'CREATE VIEW',
  probe: {
    // INTEGER của SQLite rộng 64 bit — đây chính là test bắt lỗi `safeIntegers` bị tắt.
    big: { k: 'big', v: '9223372036854775807' },
    // CỐ Ý để trống: SQLite KHÔNG có kiểu số thập phân chính xác. Affinity NUMERIC đổi
    // '12345678901234567890.0123456789' sang REAL và mất chữ số ngay lúc INSERT — trước cả
    // khi driver thấy giá trị. Không engine nào bù được việc đó, nên bắt buộc bỏ test này
    // thay vì hạ chuẩn nó. Giới hạn được ghi bằng một test riêng trong driver-sqlite.
    numeric: undefined,
    bool: { k: 'bool', v: true },
    json: 'json',
    bytes: 'bytes',
    ts: 'date',
  },
  skip: {
    C6: 'better-sqlite3 đồng bộ, không có interrupt() → không cắt được câu lệnh đang chạy',
  },
}

export const MYSQL_CONFORMANCE: ConformanceDialect = {
  id: 'mysql',
  setupSql: MYSQL_SETUP_SQL,
  schema: undefined,
  qualify: (name) => `\`${name}\``,
  hasDatabases: true,
  hasSchemas: false,
  supportsColumnComment: true,
  badProfiles: [
    {
      label: 'sai mật khẩu',
      make: (base) => ({ ...base, password: 'mat-khau-sai-chac-chan-khong-dung' }),
    },
    {
      label: 'host không tồn tại',
      make: (base) => ({ ...base, host: 'khong-ton-tai.corvus.invalid', port: 3306 }),
      timeoutMs: 30_000,
    },
  ],
  seriesSql: (n) =>
    `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s`,
  echoParamSql: 'SELECT CAST(? AS CHAR) AS v',
  syntaxErrorSql: 'SELEKT 1',
  viewDdlContains: 'VIEW',
  probe: {
    big: { k: 'big', v: '9223372036854775807' },
    numeric: { k: 'big', contains: '12345678901234567890' },
    bool: { k: 'bool', v: true },
    json: 'json',
    bytes: 'bytes',
    ts: 'date',
  },
}

