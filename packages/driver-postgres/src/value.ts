import type { CellValue } from '@corvus/contract'

/**
 * OID của các kiểu PostgreSQL cần xử lý riêng.
 * Nguồn: `SELECT oid, typname FROM pg_type`. Chỉ liệt kê những gì ta thực sự phân biệt.
 */
const OID = {
  bool: 16,
  bytea: 17,
  int8: 20,
  int2: 21,
  int4: 23,
  text: 25,
  json: 114,
  float4: 700,
  float8: 701,
  varchar: 1043,
  date: 1082,
  time: 1083,
  timestamp: 1114,
  timestamptz: 1184,
  numeric: 1700,
  uuid: 2950,
  jsonb: 3802,
} as const

/** Kiểu số nguyên vừa trong `number` an toàn (≤ 2^53). */
const SAFE_INT_OIDS = new Set<number>([OID.int2, OID.int4])
const FLOAT_OIDS = new Set<number>([OID.float4, OID.float8])
/** Kiểu phải giữ dưới dạng string để không mất chính xác. */
const BIG_OIDS = new Set<number>([OID.int8, OID.numeric])
const JSON_OIDS = new Set<number>([OID.json, OID.jsonb])
const DATE_OIDS = new Set<number>([OID.date, OID.time, OID.timestamp, OID.timestamptz])

/**
 * Chuẩn hoá giá trị thô từ `pg` về `CellValue` (driver-spi.md §6).
 *
 * Nguyên tắc: **kiểu do cột quyết định, không suy từ nội dung giá trị.** Nhờ vậy
 * `'123'` trong cột `text` không bị biến thành số, và `NULL` phân biệt được với chuỗi rỗng.
 *
 * `pg` được cấu hình để trả về mọi thứ dạng string (xem `setTypeParsers`), nên hàm này
 * là nơi duy nhất quyết định kiểu hiển thị.
 */
export function toCellValue(raw: unknown, dataTypeOid: number): CellValue {
  if (raw === null || raw === undefined) return { k: 'null' }

  if (dataTypeOid === OID.bool) {
    // pg trả 't' / 'f' khi parser bị tắt.
    if (typeof raw === 'boolean') return { k: 'bool', v: raw }
    return { k: 'bool', v: raw === 't' || raw === 'true' }
  }

  if (dataTypeOid === OID.bytea) {
    const hex = Buffer.isBuffer(raw) ? raw.toString('hex') : String(raw)
    return { k: 'bytes', v: hex }
  }

  if (BIG_OIDS.has(dataTypeOid)) {
    // int8 và numeric giữ nguyên string: 2^63 và decimal độ chính xác cao không
    // biểu diễn được bằng Number mà không mất dữ liệu.
    return { k: 'big', v: String(raw) }
  }

  if (SAFE_INT_OIDS.has(dataTypeOid) || FLOAT_OIDS.has(dataTypeOid)) {
    const n = Number(raw)
    // Nếu vì lý do nào đó không parse được, giữ nguyên text thay vì trả NaN.
    return Number.isFinite(n) ? { k: 'num', v: n } : { k: 'str', v: String(raw) }
  }

  if (JSON_OIDS.has(dataTypeOid)) {
    if (typeof raw === 'string') {
      try {
        return { k: 'json', v: JSON.parse(raw) }
      } catch {
        // JSON không hợp lệ trong cột json là bất thường nhưng không nên làm sập việc đọc.
        return { k: 'str', v: raw }
      }
    }
    return { k: 'json', v: raw }
  }

  if (DATE_OIDS.has(dataTypeOid)) {
    return { k: 'date', v: raw instanceof Date ? raw.toISOString() : String(raw) }
  }

  return { k: 'str', v: String(raw) }
}

/** Gợi ý căn lề cho grid dựa trên OID (SPEC-03 FR-03.05). */
export function alignForOid(dataTypeOid: number): 'r' | 't' | 'm' {
  if (SAFE_INT_OIDS.has(dataTypeOid) || FLOAT_OIDS.has(dataTypeOid) || BIG_OIDS.has(dataTypeOid)) {
    return 'r'
  }
  if (DATE_OIDS.has(dataTypeOid) || dataTypeOid === OID.uuid || dataTypeOid === OID.bytea) {
    return 'm'
  }
  return 't'
}
