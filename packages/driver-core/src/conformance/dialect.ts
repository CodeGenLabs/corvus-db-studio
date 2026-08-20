import type { CellValue, DriverId, ErrorCode } from '@corvus/contract'
import type { ResolvedProfile } from '../types'
import { CONFORMANCE_SCHEMA, MYSQL_SETUP_SQL, POSTGRES_SETUP_SQL, SQLITE_SETUP_SQL, MSSQL_SETUP_SQL } from './fixture'

/** Nhóm test của conformance suite — driver-spi.md §8. */
export type ConformanceGroup = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9'

/**
 * Kỳ vọng cho C3 về kiểu giá trị — mỗi engine một bảng riêng.
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

/** Test case kiểm tra round-trip kiểu dữ liệu native (C4 Types). */
export interface TypeRoundTripCase {
  name: string
  sql: string
  values?: unknown[]
  expected: CellValue
}

/** Test case kiểm tra ánh xạ mã lỗi (C8 Errors). */
export interface ErrorTestCase {
  code: ErrorCode
  label: string
  sql: string
  values?: unknown[]
}

/**
 * Phần KHÁC NHAU giữa các engine trong bộ conformance.
 *
 * Toàn bộ khác biệt gom về đây; runner chỉ còn phần chung.
 */
export interface ConformanceDialect {
  id: DriverId
  /**
   * SQL dựng fixture, đã tách thành từng câu.
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
  /** SQL sinh đúng `n` dòng một cột. */
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

  // ── Mở rộng cho C4, C6, C7, C8, C9 (T-B06) ──────────────────────────────────
  /** Kịch bản round-trip các kiểu native cho C4. */
  typeRoundTripCases?: readonly TypeRoundTripCase[]
  /** Câu lệnh chạy lâu phục vụ kiểm tra huỷ C6. */
  longRunningSql?: string
  /** Truy vấn đếm process backend đang active (C6). */
  countActiveQueriesSql?: (pattern: string) => { sql: string; values?: unknown[] }
  /** Kịch bản gây lỗi thật để kiểm tra ánh xạ lỗi C8. */
  errorCases?: readonly ErrorTestCase[]
  /** Số dòng stream kiểm tra RAM cho C9. */
  resourceStreamRows?: number
  /** Hàm sinh SQL tạo lại bảng đích từ DDL sinh ra cho C7. */
  recreateDdlSql?: (originalDdl: string, targetName: string) => string
}

function splitPgSetup(sql: string): string[] {
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

  // ── C4 Types ───────────────────────────────────────────────────────────────
  typeRoundTripCases: [
    { name: 'bigint max (+2^63-1)', sql: 'SELECT 9223372036854775807::bigint AS v', expected: { k: 'big', v: '9223372036854775807' } },
    { name: 'bigint min (-2^63)', sql: 'SELECT (-9223372036854775807 - 1)::bigint AS v', expected: { k: 'big', v: '-9223372036854775808' } },
    { name: 'numeric high precision', sql: "SELECT '12345678901234567890.12345678901234567890'::numeric AS v", expected: { k: 'big', v: '12345678901234567890.12345678901234567890' } },
    { name: 'float8 / double', sql: 'SELECT 3.141592653589793::float8 AS v', expected: { k: 'num', v: 3.141592653589793 } },
    { name: 'text unicode & emoji', sql: "SELECT 'Xin chào thế giới 🌍 🚀'::text AS v", expected: { k: 'str', v: 'Xin chào thế giới 🌍 🚀' } },
    { name: 'empty string', sql: "SELECT ''::text AS v", expected: { k: 'str', v: '' } },
    { name: 'null value', sql: 'SELECT NULL::text AS v', expected: { k: 'null' } },
    { name: 'boolean true', sql: 'SELECT true::boolean AS v', expected: { k: 'bool', v: true } },
    { name: 'boolean false', sql: 'SELECT false::boolean AS v', expected: { k: 'bool', v: false } },
    { name: 'date', sql: "SELECT '2026-08-19'::date AS v", expected: { k: 'date', v: '2026-08-19' } },
    { name: 'timestamp with timezone', sql: "SELECT '2026-08-19T09:00:00.000Z'::timestamptz AS v", expected: { k: 'date', v: '2026-08-19T09:00:00.000Z' } },
    { name: 'timestamp without timezone', sql: "SELECT '2026-08-19 09:00:00'::timestamp AS v", expected: { k: 'date', v: '2026-08-19 09:00:00' } },
    { name: 'bytea with null byte (0x00)', sql: "SELECT '\\x00deadbeef00'::bytea AS v", expected: { k: 'bytes', v: '00deadbeef00' } },
    { name: 'jsonb object', sql: "SELECT '{\"key\":\"value\",\"count\":42}'::jsonb AS v", expected: { k: 'json', v: { key: 'value', count: 42 } } },
    { name: 'uuid', sql: "SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid AS v", expected: { k: 'str', v: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' } },
  ],

  // ── C6 Cancel ──────────────────────────────────────────────────────────────
  longRunningSql: '/* corvus-pg-cancel-probe */ SELECT pg_sleep(10)',
  countActiveQueriesSql: (pattern: string) => ({
    sql: `SELECT count(*)::text AS cnt FROM pg_stat_activity
           WHERE state = 'active' AND query LIKE $1 AND pid <> pg_backend_pid()`,
    values: [pattern],
  }),

  // ── C7 DDL ─────────────────────────────────────────────────────────────────
  recreateDdlSql: (originalDdl: string, targetName: string) => {
    return originalDdl
      .replace(/CREATE TABLE [^ (]+/i, `CREATE TABLE ${CONFORMANCE_SCHEMA}."${targetName}"`)
      .replace(/CREATE (UNIQUE )?INDEX ([^\s(]+) ON [^\s(]+/gi, (_match, u, idx) => {
        const cleanIdx = idx.replace(/"/g, '').split('.').pop() ?? 'idx'
        return `CREATE ${u ?? ''}INDEX "${cleanIdx}_recreated" ON ${CONFORMANCE_SCHEMA}."${targetName}"`
      })
      .replace(/COMMENT ON TABLE [^\s]+/gi, `COMMENT ON TABLE ${CONFORMANCE_SCHEMA}."${targetName}"`)
      .replace(/COMMENT ON COLUMN [^\s]+\.([^\s]+)/gi, `COMMENT ON COLUMN ${CONFORMANCE_SCHEMA}."${targetName}".$1`)
  },

  // ── C8 Errors (≥ 20 mã lỗi thật) ───────────────────────────────────────────
  errorCases: [
    { code: 'SYNTAX_ERROR', label: 'syntax error', sql: 'SELEKT 1' },
    { code: 'TABLE_NOT_FOUND', label: 'table not found', sql: 'SELECT * FROM corvus_conf.table_khong_ton_tai_123' },
    { code: 'COLUMN_NOT_FOUND', label: 'column not found', sql: 'SELECT cot_khong_ton_tai FROM corvus_conf.country' },
    { code: 'DUPLICATE_KEY', label: 'unique constraint violation', sql: "INSERT INTO corvus_conf.country (country_id, country) VALUES (1, 'Việt Nam')" },
    { code: 'FOREIGN_KEY_VIOLATION', label: 'fk constraint violation', sql: "INSERT INTO corvus_conf.city (city_id, country_id, city) VALUES (9999, 9999, 'City')" },
    { code: 'INVALID_INPUT', label: 'not null violation', sql: 'INSERT INTO corvus_conf.country (country) VALUES (NULL)' },
    { code: 'INVALID_INPUT', label: 'division by zero', sql: 'SELECT 1 / 0' },
    { code: 'INVALID_INPUT', label: 'invalid text representation for integer', sql: "SELECT 'khong-phai-so'::integer" },
    { code: 'INVALID_INPUT', label: 'string data right truncation', sql: "INSERT INTO corvus_conf.country (country, iso_code) VALUES ('VN', 'VIETNAM_TOO_LONG')" },
    { code: 'INVALID_INPUT', label: 'numeric value out of range', sql: 'SELECT 999999999999999999999999999::smallint' },
    { code: 'INVALID_INPUT', label: 'invalid datetime format', sql: "SELECT 'ngay-thang-sai'::date" },
    { code: 'INVALID_INPUT', label: 'datetime field overflow', sql: "SELECT '2026-02-30'::date" },
    { code: 'NOT_FOUND', label: 'undefined function', sql: 'SELECT ham_khong_ton_tai_123(1)' },
    { code: 'NOT_FOUND', label: 'undefined object', sql: 'DROP TYPE corvus_conf.type_khong_ton_tai_123' },
    { code: 'DUPLICATE_KEY', label: 'duplicate table', sql: 'CREATE TABLE corvus_conf.country (id int)' },
    { code: 'INVALID_INPUT', label: 'ambiguous column', sql: 'SELECT country_id FROM corvus_conf.country c1 CROSS JOIN corvus_conf.country c2' },
    { code: 'INVALID_INPUT', label: 'cannot coerce array to int', sql: 'SELECT ARRAY[1]::integer' },
    { code: 'INVALID_INPUT', label: 'datatype mismatch in array', sql: "SELECT ARRAY[1, 'text']" },
    { code: 'INVALID_INPUT', label: 'subquery returns more than 1 row', sql: 'SELECT (SELECT country FROM corvus_conf.country)' },
    { code: 'INVALID_INPUT', label: 'savepoint outside transaction block', sql: 'SAVEPOINT sp1' },
  ],

  // ── C9 Resource ────────────────────────────────────────────────────────────
  resourceStreamRows: 100_000,
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
  seriesSql: (n) =>
    `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s`,
  echoParamSql: 'SELECT CAST(? AS TEXT) AS v',
  syntaxErrorSql: 'SELEKT 1',
  viewDdlContains: 'CREATE VIEW',
  probe: {
    big: { k: 'big', v: '9223372036854775807' },
    numeric: undefined,
    bool: { k: 'bool', v: true },
    json: 'json',
    bytes: 'bytes',
    ts: 'date',
  },

  // ── C4 Types ───────────────────────────────────────────────────────────────
  typeRoundTripCases: [
    { name: 'bigint max (+2^63-1)', sql: 'SELECT 9223372036854775807 AS v', expected: { k: 'big', v: '9223372036854775807' } },
    { name: 'bigint min (-2^63)', sql: 'SELECT -9223372036854775808 AS v', expected: { k: 'big', v: '-9223372036854775808' } },
    { name: 'float / real', sql: 'SELECT 3.141592653589793 AS v', expected: { k: 'num', v: 3.141592653589793 } },
    { name: 'text unicode & emoji', sql: "SELECT 'Xin chào thế giới 🌍 🚀' AS v", expected: { k: 'str', v: 'Xin chào thế giới 🌍 🚀' } },
    { name: 'empty string', sql: "SELECT '' AS v", expected: { k: 'str', v: '' } },
    { name: 'null value', sql: 'SELECT NULL AS v', expected: { k: 'null' } },
    { name: 'boolean 1 / 0', sql: 'SELECT 1 AS v', expected: { k: 'num', v: 1 } },
    { name: 'blob with null byte (0x00)', sql: "SELECT X'00deadbeef00' AS v", expected: { k: 'bytes', v: '00deadbeef00' } },
    { name: 'json column from table', sql: 'SELECT json_val FROM types_probe WHERE id = 1', expected: { k: 'json', v: { a: [1, 2, 3] } } },
    { name: 'json text expression', sql: "SELECT json('{\"key\":\"value\",\"count\":42}') AS v", expected: { k: 'str', v: '{"key":"value","count":42}' } },
  ],

  // ── C7 DDL ─────────────────────────────────────────────────────────────────
  recreateDdlSql: (originalDdl: string, targetName: string) => {
    return originalDdl.replace(/CREATE TABLE [^ (]+/i, `CREATE TABLE "${targetName}"`)
  },

  // ── C8 Errors ──────────────────────────────────────────────────────────────
  errorCases: [
    { code: 'SYNTAX_ERROR', label: 'syntax error', sql: 'SELEKT 1' },
    { code: 'TABLE_NOT_FOUND', label: 'table not found', sql: 'SELECT * FROM table_khong_ton_tai_123' },
    { code: 'COLUMN_NOT_FOUND', label: 'column not found', sql: 'SELECT cot_khong_ton_tai FROM country' },
    { code: 'DUPLICATE_KEY', label: 'unique constraint violation', sql: "INSERT INTO country (country_id, country) VALUES (1, 'Việt Nam')" },
    { code: 'FOREIGN_KEY_VIOLATION', label: 'fk constraint violation', sql: "INSERT INTO city (country_id, city) VALUES (9999, 'City')" },
    { code: 'INVALID_INPUT', label: 'not null violation', sql: 'INSERT INTO country (country) VALUES (NULL)' },
  ],

  // ── C9 Resource ────────────────────────────────────────────────────────────
  resourceStreamRows: 100_000,

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
  seriesSql: (n) => {
    // Cross join 5 bảng chữ số (0..9) để sinh tối đa 100k dòng tức thì mà không vượt cte_max_recursion_depth
    if (n <= 1000) {
      return `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s`
    }
    return `
      WITH d AS (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
      )
      SELECT (d1.n + d2.n * 10 + d3.n * 100 + d4.n * 1000 + d5.n * 10000) AS n
      FROM d d1, d d2, d d3, d d4, d d5
      LIMIT ${n}
    `
  },
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

  // ── C4 Types ───────────────────────────────────────────────────────────────
  typeRoundTripCases: [
    { name: 'bigint max (+2^63-1)', sql: 'SELECT 9223372036854775807 AS v', expected: { k: 'big', v: '9223372036854775807' } },
    { name: 'bigint min (-2^63)', sql: 'SELECT -9223372036854775808 AS v', expected: { k: 'big', v: '-9223372036854775808' } },
    { name: 'decimal high precision', sql: "SELECT CAST('12345678901234567890.12345678901234567890' AS DECIMAL(40,20)) AS v", expected: { k: 'big', v: '12345678901234567890.12345678901234567890' } },
    { name: 'double / decimal literal', sql: 'SELECT 3.141592653589793 AS v', expected: { k: 'big', v: '3.141592653589793' } },
    { name: 'text unicode & emoji', sql: "SELECT 'Xin chào thế giới 🌍 🚀' AS v", expected: { k: 'str', v: 'Xin chào thế giới 🌍 🚀' } },
    { name: 'empty string', sql: "SELECT '' AS v", expected: { k: 'str', v: '' } },
    { name: 'null value', sql: 'SELECT NULL AS v', expected: { k: 'null' } },
    { name: 'boolean column from table', sql: 'SELECT bool_val FROM types_probe WHERE id = 1', expected: { k: 'bool', v: true } },
    { name: 'boolean expression (1)', sql: 'SELECT true AS v', expected: { k: 'big', v: '1' } },
    { name: 'binary with null byte (0x00)', sql: "SELECT X'00deadbeef00' AS v", expected: { k: 'bytes', v: '00deadbeef00' } },
    { name: 'json object', sql: "SELECT CAST('{\"key\":\"value\",\"count\":42}' AS JSON) AS v", expected: { k: 'json', v: { key: 'value', count: 42 } } },
  ],

  // ── C6 Cancel ──────────────────────────────────────────────────────────────
  longRunningSql: '/* corvus-mysql-cancel-probe */ SELECT SLEEP(10) AS s',
  // Thiếu trường này thì test "sau khi huỷ, server không còn backend treo (IV-3)" KHÔNG
  // được đăng ký cho MySQL — nhóm C6 vẫn xanh nhưng chỉ kiểm được nửa bất biến.
  // `information_schema.processlist` là bản MySQL của `pg_stat_activity`.
  countActiveQueriesSql: (pattern: string) => ({
    sql: `SELECT CAST(COUNT(*) AS CHAR) AS cnt FROM information_schema.processlist
           WHERE info LIKE ? AND id <> CONNECTION_ID()`,
    values: [pattern],
  }),

  // ── C7 DDL ─────────────────────────────────────────────────────────────────
  recreateDdlSql: (originalDdl: string, targetName: string) => {
    return originalDdl.replace(/CREATE TABLE [^ (]+/i, `CREATE TABLE \`${targetName}\``)
  },

  // ── C8 Errors ──────────────────────────────────────────────────────────────
  errorCases: [
    { code: 'SYNTAX_ERROR', label: 'syntax error', sql: 'SELEKT 1' },
    { code: 'TABLE_NOT_FOUND', label: 'table not found', sql: 'SELECT * FROM table_khong_ton_tai_123' },
    { code: 'COLUMN_NOT_FOUND', label: 'column not found', sql: 'SELECT cot_khong_ton_tai FROM country' },
    { code: 'DUPLICATE_KEY', label: 'unique constraint violation', sql: "INSERT INTO country (country_id, country) VALUES (1, 'Việt Nam')" },
    { code: 'FOREIGN_KEY_VIOLATION', label: 'fk constraint violation', sql: "INSERT INTO city (country_id, city) VALUES (9999, 'City')" },
    { code: 'INVALID_INPUT', label: 'not null violation', sql: 'INSERT INTO country (country) VALUES (NULL)' },
    { code: 'DUPLICATE_KEY', label: 'duplicate table', sql: 'CREATE TABLE country (id INT)' },
  ],

  // ── C9 Resource ────────────────────────────────────────────────────────────
  resourceStreamRows: 100_000,
}

export const MSSQL_CONFORMANCE: ConformanceDialect = {
  id: 'mssql',
  setupSql: MSSQL_SETUP_SQL,
  schema: CONFORMANCE_SCHEMA,
  qualify: (name) => `${CONFORMANCE_SCHEMA}.[${name}]`,
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
      make: (base) => ({ ...base, host: 'khong-ton-tai.corvus.invalid', port: 1433 }),
      timeoutMs: 30_000,
    },
  ],
  seriesSql: (n) =>
    `WITH s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s OPTION (MAXRECURSION 0)`,
  echoParamSql: 'SELECT CAST(@p1 AS NVARCHAR(MAX)) AS v',
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

  // ── C4 Types ───────────────────────────────────────────────────────────────
  typeRoundTripCases: [
    { name: 'bigint max (+2^63-1)', sql: 'SELECT CAST(9223372036854775807 AS BIGINT) AS v', expected: { k: 'big', v: '9223372036854775807' } },
    { name: 'bigint min (-2^63)', sql: 'SELECT CAST(-9223372036854775808 AS BIGINT) AS v', expected: { k: 'big', v: '-9223372036854775808' } },
    { name: 'decimal high precision', sql: "SELECT CAST('12345678901234567890.12345678901234567890' AS DECIMAL(38,20)) AS v", expected: { k: 'big', v: '12345678901234567890.12345678901234567890' } },
    { name: 'float / real', sql: 'SELECT CAST(3.141592653589793 AS FLOAT) AS v', expected: { k: 'num', v: 3.141592653589793 } },
    { name: 'text unicode & emoji', sql: "SELECT N'Xin chào thế giới 🌍 🚀' AS v", expected: { k: 'str', v: 'Xin chào thế giới 🌍 🚀' } },
    { name: 'empty string', sql: "SELECT N'' AS v", expected: { k: 'str', v: '' } },
    { name: 'null value', sql: 'SELECT NULL AS v', expected: { k: 'null' } },
    { name: 'boolean bit', sql: 'SELECT CAST(1 AS BIT) AS v', expected: { k: 'bool', v: true } },
    { name: 'varbinary with null byte', sql: 'SELECT 0x00deadbeef00 AS v', expected: { k: 'bytes', v: '00deadbeef00' } },
  ],

  // ── C6 Cancel ──────────────────────────────────────────────────────────────
  longRunningSql: '/* corvus-mssql-cancel-probe */ WAITFOR DELAY \'00:00:10\'',
  countActiveQueriesSql: (pattern: string) => ({
    sql: `SELECT CAST(COUNT(*) AS NVARCHAR(20)) AS cnt
            FROM sys.dm_exec_requests r
           CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
           WHERE t.text LIKE @p1 AND r.session_id <> @@SPID`,
    values: [pattern],
  }),

  // ── C7 DDL ─────────────────────────────────────────────────────────────────
  recreateDdlSql: (originalDdl: string, targetName: string) => {
    return originalDdl.replace(/CREATE TABLE [^ (]+/i, `CREATE TABLE ${CONFORMANCE_SCHEMA}.[${targetName}]`)
  },

  // ── C8 Errors ──────────────────────────────────────────────────────────────
  errorCases: [
    { code: 'SYNTAX_ERROR', label: 'syntax error', sql: 'SELEKT 1' },
    { code: 'TABLE_NOT_FOUND', label: 'table not found', sql: 'SELECT * FROM corvus_conf.table_khong_ton_tai_123' },
    { code: 'COLUMN_NOT_FOUND', label: 'column not found', sql: 'SELECT cot_khong_ton_tai FROM corvus_conf.country' },
    { code: 'DUPLICATE_KEY', label: 'unique constraint violation', sql: "SET IDENTITY_INSERT corvus_conf.country ON; INSERT INTO corvus_conf.country (country_id, country) VALUES (1, N'Việt Nam'); SET IDENTITY_INSERT corvus_conf.country OFF;" },
    { code: 'FOREIGN_KEY_VIOLATION', label: 'fk constraint violation', sql: "INSERT INTO corvus_conf.city (country_id, city) VALUES (9999, N'City')" },
    { code: 'INVALID_INPUT', label: 'not null violation', sql: 'INSERT INTO corvus_conf.country (country) VALUES (NULL)' },
  ],

  // ── C9 Resource ────────────────────────────────────────────────────────────
  resourceStreamRows: 100_000,
}
