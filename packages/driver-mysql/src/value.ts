import type { CellValue } from '@corvus/contract'

/**
 * Mã kiểu trường nhị phân theo MySQL Client/Server Protocol (mysql2 types).
 */
export const MYSQL_TYPE = {
  DECIMAL: 0,
  TINY: 1, // TINYINT / BOOLEAN
  SHORT: 2, // SMALLINT
  LONG: 3, // INT
  FLOAT: 4,
  DOUBLE: 5,
  NULL: 6,
  TIMESTAMP: 7,
  LONGLONG: 8, // BIGINT
  INT24: 9, // MEDIUMINT
  DATE: 10,
  TIME: 11,
  DATETIME: 12,
  YEAR: 13,
  NEWDATE: 14,
  VARCHAR: 15,
  BIT: 16,
  TIMESTAMP2: 17,
  DATETIME2: 18,
  TIME2: 19,
  JSON: 245,
  NEWDECIMAL: 246,
  ENUM: 247,
  SET: 248,
  TINY_BLOB: 249,
  MEDIUM_BLOB: 250,
  LONG_BLOB: 251,
  BLOB: 252, // Trong MySQL protocol, TEXT cũng mang type 252 (BLOB) nhưng cờ flags không có BINARY_FLAG
  VAR_STRING: 253,
  STRING: 254,
  GEOMETRY: 255,
} as const

const SAFE_NUMERIC_TYPES = new Set<number>([
  MYSQL_TYPE.TINY,
  MYSQL_TYPE.SHORT,
  MYSQL_TYPE.LONG,
  MYSQL_TYPE.INT24,
  MYSQL_TYPE.FLOAT,
  MYSQL_TYPE.DOUBLE,
  MYSQL_TYPE.YEAR,
])

const BIG_NUMERIC_TYPES = new Set<number>([
  MYSQL_TYPE.LONGLONG,
  MYSQL_TYPE.DECIMAL,
  MYSQL_TYPE.NEWDECIMAL,
])

const DATE_TYPES = new Set<number>([
  MYSQL_TYPE.DATE,
  MYSQL_TYPE.DATETIME,
  MYSQL_TYPE.DATETIME2,
  MYSQL_TYPE.TIMESTAMP,
  MYSQL_TYPE.TIMESTAMP2,
  MYSQL_TYPE.TIME,
  MYSQL_TYPE.TIME2,
  MYSQL_TYPE.NEWDATE,
])

const BLOB_TYPES = new Set<number>([
  MYSQL_TYPE.TINY_BLOB,
  MYSQL_TYPE.MEDIUM_BLOB,
  MYSQL_TYPE.LONG_BLOB,
  MYSQL_TYPE.BLOB,
  MYSQL_TYPE.GEOMETRY,
])

/**
 * Chuẩn hoá giá trị thô từ MySQL sang CellValue chuẩn (driver-spi.md §6).
 *
 * Nguyên tắc vàng:
 * 1. BIGINT và DECIMAL luôn là string trong `{k:'big'}` — không để Number làm mất chính xác (BẪY 2).
 * 2. NULL phân biệt rõ với chuỗi rỗng: null -> `{k:'null'}`, '' -> `{k:'str', v:''}`.
 * 3. BLOB / Buffer chuyển thành hex string `{k:'bytes', v: '...'}`.
 * 4. BIT(1) / TINYINT(1) boolean -> `{k:'bool', v: true|false}`.
 */
export function toCellValue(
  raw: unknown,
  columnType?: number,
  declaredType?: string,
  columnLength?: number,
  flags?: number,
): CellValue {
  if (raw === null || raw === undefined) return { k: 'null' }

  const normType = (declaredType ?? '').toLowerCase().trim()

  // Boolean / TINYINT(1) / BIT(1)
  // Trong MySQL protocol, BOOLEAN là TINYINT có columnLength = 1.
  if (
    columnType === MYSQL_TYPE.BIT ||
    (columnType === MYSQL_TYPE.TINY && columnLength === 1) ||
    normType === 'boolean' ||
    normType === 'bool' ||
    normType.startsWith('tinyint(1)') ||
    normType.startsWith('bit(1)')
  ) {
    if (typeof raw === 'boolean') return { k: 'bool', v: raw }
    if (Buffer.isBuffer(raw)) {
      return { k: 'bool', v: raw.length > 0 && raw[0] !== 0 }
    }
    if (typeof raw === 'number') return { k: 'bool', v: raw !== 0 }
    if (typeof raw === 'string') {
      const s = raw.toLowerCase()
      if (s === 'true' || s === '1' || s === 't') return { k: 'bool', v: true }
      if (s === 'false' || s === '0' || s === 'f') return { k: 'bool', v: false }
    }
  }

  // BLOB / Bytes / Buffer
  // Lưu ý: Trong MySQL protocol, TEXT cũng mang columnType = 252 (BLOB) nhưng không có BINARY_FLAG (128).
  // mysql2 trả về Buffer cho BLOB thật và string cho TEXT.
  if (Buffer.isBuffer(raw)) {
    return { k: 'bytes', v: raw.toString('hex') }
  }
  if (normType.includes('blob') || normType.includes('binary') || normType.includes('bytea')) {
    return { k: 'bytes', v: String(raw) }
  }
  if (columnType !== undefined && BLOB_TYPES.has(columnType)) {
    // Nếu flags được truyền vào và không có BINARY_FLAG (128), thì đây là kiểu TEXT
    if (flags !== undefined && (flags & 128) === 0) {
      return { k: 'str', v: String(raw) }
    }
    return { k: 'bytes', v: String(raw) }
  }

  // Big numbers (BIGINT, DECIMAL, NUMERIC)
  if (
    (columnType !== undefined && BIG_NUMERIC_TYPES.has(columnType)) ||
    normType.includes('bigint') ||
    normType.includes('decimal') ||
    normType.includes('numeric')
  ) {
    return { k: 'big', v: String(raw) }
  }

  // Safe numbers (INT, SMALLINT, FLOAT, DOUBLE...)
  if (columnType !== undefined && SAFE_NUMERIC_TYPES.has(columnType)) {
    const n = Number(raw)
    return Number.isFinite(n) ? { k: 'num', v: n } : { k: 'str', v: String(raw) }
  }
  if (
    normType.includes('int') ||
    normType.includes('float') ||
    normType.includes('double') ||
    normType.includes('real')
  ) {
    const n = Number(raw)
    return Number.isFinite(n) ? { k: 'num', v: n } : { k: 'str', v: String(raw) }
  }

  // JSON
  if (columnType === MYSQL_TYPE.JSON || normType === 'json') {
    if (typeof raw === 'string') {
      try {
        return { k: 'json', v: JSON.parse(raw) }
      } catch {
        return { k: 'str', v: raw }
      }
    }
    return { k: 'json', v: raw }
  }

  // Dates & Timestamps
  if (
    (columnType !== undefined && DATE_TYPES.has(columnType)) ||
    normType.includes('date') ||
    normType.includes('time') ||
    normType.includes('year')
  ) {
    return { k: 'date', v: raw instanceof Date ? raw.toISOString() : String(raw) }
  }

  // Chuỗi mặc định (TEXT, VARCHAR, CHAR...)
  return { k: 'str', v: String(raw) }
}

/** Gợi ý căn lề cột trong grid view (SPEC-03 FR-03.05). */
export function alignForMysqlType(columnType?: number, declaredType?: string): 'r' | 't' | 'm' {
  const normType = (declaredType ?? '').toLowerCase()
  if (
    (columnType !== undefined && (SAFE_NUMERIC_TYPES.has(columnType) || BIG_NUMERIC_TYPES.has(columnType))) ||
    normType.includes('int') ||
    normType.includes('decimal') ||
    normType.includes('numeric') ||
    normType.includes('float') ||
    normType.includes('double')
  ) {
    return 'r'
  }
  if (
    (columnType !== undefined && (DATE_TYPES.has(columnType) || BLOB_TYPES.has(columnType))) ||
    normType.includes('date') ||
    normType.includes('time') ||
    normType.includes('blob') ||
    normType.includes('binary')
  ) {
    return 'm'
  }
  return 't'
}
