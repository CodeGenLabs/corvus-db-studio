import { corvusError } from '@corvus/contract'
import type { SqlDialect } from './dialect'
import { splitStatements } from './split'

/**
 * Phân loại câu lệnh SQL để thực thi chế độ read-only ở tầng ENGINE.
 *
 * security.md §5 yêu cầu 4 lớp cho chế độ read-only; đây là lớp 1 — lớp duy nhất chặn được
 * `DELETE` mà người dùng gõ tay trong SQL Editor. Trước khi có file này, `profile.readOnly`
 * chỉ được đọc trong `beginTransaction()`, nên một `DELETE` đi qua `query.execute` vẫn xoá
 * dữ liệu thật trên connection đã bật read-only (đo được bằng thí nghiệm, 2026-08-19).
 *
 * NGUYÊN TẮC: **mặc định TỪ CHỐI.** Chỉ những gì chứng minh được là chỉ-đọc mới cho qua.
 * Sai theo hướng chặn oan thì người dùng tắt read-only; sai theo hướng cho qua thì mất dữ liệu.
 */

/** Từ khoá mở đầu được coi là chỉ đọc (security.md §5 mục 1). */
const READ_LEADING = new Set([
  'SELECT',
  'WITH',
  'SHOW',
  'EXPLAIN',
  'DESCRIBE',
  'DESC',
  'PRAGMA', // SQLite: chỉ đọc khi không có `=`, kiểm riêng bên dưới
  'TABLE', // PostgreSQL 12+: `TABLE t` ≡ `SELECT * FROM t`
  'VALUES',
])

/**
 * Từ khoá ghi. Xuất hiện ở BẤT KỲ đâu trong câu lệnh (ngoài chuỗi, comment, định danh
 * đã quote) là đủ để từ chối.
 *
 * Vì sao phải quét cả câu chứ không chỉ từ đầu tiên: PostgreSQL cho phép CTE ghi dữ liệu —
 * `WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d` mở đầu bằng WITH và kết thúc bằng
 * SELECT nhưng vẫn xoá dữ liệu. Chỉ xét từ đầu tiên là để lọt đúng trường hợp nguy hiểm nhất.
 */
const WRITE_KEYWORDS = new Set([
  'INSERT',
  'UPDATE',
  'DELETE',
  'MERGE',
  'UPSERT',
  'REPLACE',
  'TRUNCATE',
  'CREATE',
  'ALTER',
  'DROP',
  'RENAME',
  'COMMENT',
  'GRANT',
  'REVOKE',
  'VACUUM',
  'REINDEX',
  'ANALYZE',
  'CLUSTER',
  'REFRESH',
  'COPY',
  'IMPORT',
  'LOAD',
  'CALL',
  'DO',
  'EXEC',
  'EXECUTE',
  'ATTACH',
  'DETACH',
  'SET',
  'RESET',
  'LOCK',
  'UNLOCK',
  'BEGIN',
  'START',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'PREPARE',
  'DEALLOCATE',
  'LISTEN',
  'NOTIFY',
  'KILL',
  'INTO', // `SELECT … INTO bang_moi` tạo bảng
])

/**
 * Từ khoá ghi được tha, tuỳ theo từ khoá MỞ ĐẦU.
 *
 * `EXPLAIN ANALYZE SELECT` có chạy thật câu SELECT nhưng không ghi; nếu câu bên trong là
 * `DELETE` thì token `DELETE` vẫn bị bắt, nên nới `ANALYZE` không mở lỗ.
 */
const LEADING_EXCEPTIONS: Record<string, Set<string>> = {
  EXPLAIN: new Set(['ANALYZE']),
  SHOW: new Set(['CREATE']),
}

export type StatementKind = 'read' | 'write'

/**
 * Tách câu lệnh thành các token từ khoá, BỎ QUA chuỗi, comment và định danh đã quote.
 *
 * Bắt buộc phải bỏ qua chúng: `SELECT 'DELETE FROM users'` là chỉ đọc, còn
 * `SELECT * FROM "delete"` cũng vậy. Quét thô bằng regex trên cả câu sẽ chặn oan cả hai.
 */
export function sqlKeywordTokens(sql: string, dialect: SqlDialect = 'postgres'): string[] {
  const tokens: string[] = []
  let word = ''
  let i = 0
  const len = sql.length

  const flush = () => {
    if (word.length > 0) {
      tokens.push(word.toUpperCase())
      word = ''
    }
  }

  while (i < len) {
    const ch = sql[i]!
    const next = i + 1 < len ? sql[i + 1] : ''

    // Comment dòng
    if (ch === '-' && next === '-') {
      flush()
      while (i < len && sql[i] !== '\n') i++
      continue
    }
    // Comment khối
    if (ch === '/' && next === '*') {
      flush()
      i += 2
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }
    // Chuỗi ký tự
    if (ch === "'") {
      flush()
      i++
      while (i < len) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2
            continue
          }
          i++
          break
        }
        i++
      }
      continue
    }
    // Định danh đã quote — nội dung KHÔNG phải từ khoá
    if (ch === '"' || (ch === '`' && dialect === 'mysql') || (ch === '[' && dialect === 'mssql')) {
      flush()
      const close = ch === '[' ? ']' : ch
      i++
      while (i < len && sql[i] !== close) i++
      i++
      continue
    }
    // Dollar-quoted string của PostgreSQL
    if (ch === '$' && dialect === 'postgres') {
      const m = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i))
      if (m) {
        flush()
        const tag = m[0]
        i += tag.length
        const end = sql.indexOf(tag, i)
        i = end === -1 ? len : end + tag.length
        continue
      }
    }

    if (/[A-Za-z0-9_]/.test(ch)) {
      word += ch
    } else {
      flush()
    }
    i++
  }
  flush()
  return tokens
}

/**
 * Câu lệnh này có chắc chắn chỉ đọc không?
 *
 * GIỚI HẠN ĐÃ BIẾT, ghi ra để không ai tưởng đây là bảo đảm tuyệt đối: hàm do người dùng
 * gọi vẫn có thể ghi (`SELECT ham_tu_viet_ghi_du_lieu()`, `SELECT nextval('s')`). Chặn được
 * việc đó cần phân tích phía server, không phải phía cú pháp. Vì vậy read-only còn có lớp
 * thứ hai ở tầng session của driver (`default_transaction_read_only`, `SET SESSION
 * TRANSACTION READ ONLY`) — hai lớp bù nhau, không thay nhau.
 */
export function statementKind(sql: string, dialect: SqlDialect = 'postgres'): StatementKind {
  const tokens = sqlKeywordTokens(sql, dialect)
  if (tokens.length === 0) return 'read' // câu rỗng / chỉ có comment

  const first = tokens[0]!
  if (!READ_LEADING.has(first)) return 'write'

  // `PRAGMA x = y` là ghi; `PRAGMA x` là đọc. Dấu `=` không phải token nên kiểm trên chuỗi
  // đã bỏ comment ở mức đủ dùng: PRAGMA không nhận chuỗi hay định danh quote trong thực tế.
  if (first === 'PRAGMA' && /=/.test(sql)) return 'write'

  // Ngoại lệ theo từ khoá mở đầu — nếu không có, ta chặn oan những câu chỉ đọc rất thông dụng:
  //   `SHOW CREATE TABLE t`            (MySQL, chỉ đọc, nhưng chứa CREATE)
  //   `EXPLAIN (ANALYZE) SELECT …`     (PostgreSQL, chứa ANALYZE)
  // Ngoại lệ chỉ nới đúng một từ khoá cho đúng một từ mở đầu, không nới cả nhóm.
  const allowed = LEADING_EXCEPTIONS[first]

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]!
    if (WRITE_KEYWORDS.has(t) && !allowed?.has(t)) return 'write'
  }
  return 'read'
}

/**
 * Chặn mọi câu lệnh không chứng minh được là chỉ đọc.
 *
 * Nhận cả script nhiều câu: MỘT câu ghi là từ chối toàn bộ, không chạy phần đầu rồi mới lỗi
 * ở phần sau — chạy nửa script trên production tệ hơn là không chạy gì.
 */
export function assertReadOnlySql(sql: string, dialect: SqlDialect = 'postgres'): void {
  for (const stmt of splitStatements(sql, dialect)) {
    if (statementKind(stmt, dialect) === 'write') {
      throw corvusError(
        'READ_ONLY',
        'Kết nối đang ở chế độ chỉ đọc: câu lệnh này có thể thay đổi dữ liệu nên bị từ chối',
        {
          i18nKey: 'error.readOnlyConnection',
          // KHÔNG đưa cả câu lệnh vào detail: câu lệnh của người dùng có thể chứa giá trị
          // dữ liệu thật, mà detail đi tiếp vào log/audit (security.md §3).
          detail: sqlKeywordTokens(stmt, dialect)[0],
        },
      )
    }
  }
}
