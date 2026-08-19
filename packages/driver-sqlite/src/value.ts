import type { CellValue } from '@corvus/contract'

/**
 * Chuẩn hoá giá trị thô từ `better-sqlite3` về `CellValue` (driver-spi.md §6).
 *
 * SQLite khác mọi engine khác ở một điểm quyết định cách viết file này: **kiểu là của
 * GIÁ TRỊ, không phải của cột**. Một cột khai `INTEGER` vẫn lưu được chuỗi. Vì vậy:
 *
 *   - Kiểu KHAI BÁO (`declaredType`, lấy từ `stmt.columns()[i].type`) là nguồn quyết định
 *     chính — nhờ nó `'123'` trong cột `TEXT` không bị biến thành số, và cột `BOOLEAN`
 *     (SQLite lưu 0/1) hiện ra công tắc thay vì con số.
 *   - Chỉ khi `declaredType` là `null` — cột kết quả của biểu thức, ví dụ `SELECT 1 + 1` —
 *     mới suy từ giá trị. Đây là ngoại lệ DUY NHẤT được phép, và nó không thể tránh:
 *     SQLite không cấp kiểu khai báo cho biểu thức.
 *
 * Số nguyên: driver mở `safeIntegers` nên INTEGER về dạng `bigint`. Cột `INTEGER` của
 * SQLite rộng 64 bit, nên phải đổi sang `{k:'big'}` khi vượt 2^53 — không làm thì
 * 9223372036854775807 âm thầm thành 9223372036854776000.
 */
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE = -MAX_SAFE

type Kind = 'int' | 'real' | 'text' | 'blob' | 'bool' | 'json' | 'date' | 'exact' | 'unknown'

/**
 * Suy nhóm kiểu từ tên kiểu khai báo.
 *
 * Theo đúng thứ tự luật affinity của SQLite (§3.1 datatype3) rồi mở rộng thêm mấy tên
 * quy ước mà SQLite không hiểu nhưng người ta vẫn dùng: BOOLEAN, JSON, DATETIME.
 * Thứ tự kiểm là quan trọng: `'BOOLEAN'` chứa cả `'INT'`? không, nhưng `'BIGINT'` chứa
 * `'INT'` nên BOOL/JSON/DATE phải xét TRƯỚC nhóm INT.
 */
export function kindOfDeclaredType(declaredType: string | null | undefined): Kind {
  if (declaredType === null || declaredType === undefined || declaredType === '') return 'unknown'
  const t = declaredType.toUpperCase()

  if (t.includes('BOOL')) return 'bool'
  if (t.includes('JSON')) return 'json'
  if (t.includes('DATE') || t.includes('TIME')) return 'date'
  if (t.includes('INT')) return 'int'
  if (t.includes('CHAR') || t.includes('CLOB') || t.includes('TEXT')) return 'text'
  if (t.includes('BLOB')) return 'blob'
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB')) return 'real'
  // NUMERIC / DECIMAL / MONEY: ý ĐỊNH của người khai là số chính xác. SQLite có giữ được
  // hay không thì tuỳ giá trị — xử lý ở nhánh 'exact' trong toCellValue().
  if (t.includes('NUM') || t.includes('DEC') || t.includes('MONEY')) return 'exact'
  return 'unknown'
}

export function toCellValue(raw: unknown, declaredType: string | null | undefined): CellValue {
  if (raw === null || raw === undefined) return { k: 'null' }

  const kind = kindOfDeclaredType(declaredType)

  if (kind === 'bool') {
    if (typeof raw === 'boolean') return { k: 'bool', v: raw }
    if (typeof raw === 'bigint') return { k: 'bool', v: raw !== 0n }
    if (typeof raw === 'number') return { k: 'bool', v: raw !== 0 }
    return { k: 'bool', v: raw === '1' || String(raw).toLowerCase() === 'true' }
  }

  if (kind === 'json') {
    if (typeof raw === 'string') {
      try {
        return { k: 'json', v: JSON.parse(raw) }
      } catch {
        // JSON không hợp lệ trong cột JSON là bất thường, nhưng không nên làm sập việc đọc
        // cả bảng — hiện nguyên văn để người dùng thấy dữ liệu hỏng.
        return { k: 'str', v: raw }
      }
    }
    return { k: 'json', v: raw }
  }

  if (kind === 'date') return { k: 'date', v: stringify(raw) }

  if (kind === 'blob') {
    return { k: 'bytes', v: toHex(raw) }
  }

  if (kind === 'exact') {
    // Cột khai NUMERIC/DECIMAL, nhưng SQLite KHÔNG có kiểu số thập phân chính xác: affinity
    // NUMERIC tự đổi chuỗi số sang REAL nếu đổi được, và REAL chỉ có 15 chữ số.
    //
    // Vì vậy phải xét cái ĐANG NẰM trong ô, không xét kiểu khai báo:
    //   - còn ở dạng TEXT (SQLite không đổi được) → giữ nguyên chuỗi, `{k:'big'}` là đúng
    //   - đã là REAL → chữ số ĐÃ mất rồi. Trả `{k:'big'}` lúc này là nói dối người dùng
    //     rằng giá trị chính xác; trả `{k:'num'}` để UI hiện đúng bản chất số thực.
    if (typeof raw === 'string') return { k: 'big', v: raw }
    if (typeof raw === 'bigint') return { k: 'big', v: raw.toString() }
    if (typeof raw === 'number') return { k: 'num', v: raw }
    return { k: 'big', v: stringify(raw) }
  }

  if (kind === 'int') {
    return fromInteger(raw)
  }

  if (kind === 'real') {
    const n = Number(raw)
    return Number.isFinite(n) ? { k: 'num', v: n } : { k: 'str', v: stringify(raw) }
  }

  if (kind === 'text') return { k: 'str', v: stringify(raw) }

  // kind === 'unknown': cột biểu thức. Đây là chỗ duy nhất được suy từ giá trị.
  if (Buffer.isBuffer(raw)) return { k: 'bytes', v: raw.toString('hex') }
  if (typeof raw === 'bigint') return fromInteger(raw)
  if (typeof raw === 'number') return { k: 'num', v: raw }
  if (typeof raw === 'boolean') return { k: 'bool', v: raw }
  return { k: 'str', v: stringify(raw) }
}

function fromInteger(raw: unknown): CellValue {
  if (typeof raw === 'bigint') {
    if (raw > MAX_SAFE || raw < MIN_SAFE) return { k: 'big', v: raw.toString() }
    return { k: 'num', v: Number(raw) }
  }
  if (typeof raw === 'number') return { k: 'num', v: raw }
  // Cột khai INTEGER nhưng đang giữ chuỗi — SQLite cho phép. Không ép kiểu, hiện đúng
  // cái đang có, nếu không người dùng sẽ không bao giờ biết dữ liệu bị lệch kiểu.
  if (Buffer.isBuffer(raw)) return { k: 'bytes', v: raw.toString('hex') }
  return { k: 'str', v: stringify(raw) }
}

function toHex(raw: unknown): string {
  if (Buffer.isBuffer(raw)) return raw.toString('hex')
  if (raw instanceof Uint8Array) return Buffer.from(raw).toString('hex')
  return Buffer.from(String(raw), 'utf8').toString('hex')
}

function stringify(raw: unknown): string {
  if (typeof raw === 'bigint') return raw.toString()
  if (Buffer.isBuffer(raw)) return raw.toString('utf8')
  return String(raw)
}

/** Gợi ý căn lề cho grid theo kiểu khai báo (SPEC-03 FR-03.05). */
export function alignForDeclaredType(declaredType: string | null | undefined): 'r' | 't' | 'm' {
  switch (kindOfDeclaredType(declaredType)) {
    case 'int':
    case 'real':
    case 'exact':
      return 'r'
    case 'date':
    case 'blob':
      return 'm'
    default:
      return 't'
  }
}
