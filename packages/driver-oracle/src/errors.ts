import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

export const ORACLE_ERROR_MAP: Record<number, ErrorCode> = {
  // ── Quyền truy cập & Xác thực ─────────────────────────────────────────────
  1017: 'UNAUTHORIZED', // ORA-01017: invalid username/password; logon denied
  1031: 'FORBIDDEN', // ORA-01031: insufficient privileges

  // ── Database & Schema & Table & Column ────────────────────────────────────
  942: 'TABLE_NOT_FOUND', // ORA-00942: table or view does not exist
  904: 'COLUMN_NOT_FOUND', // ORA-00904: invalid identifier
  4043: 'NOT_FOUND', // ORA-04043: object does not exist
  955: 'DUPLICATE_KEY', // ORA-00955: name is already used by an existing object

  // ── Cú pháp & Ngữ nghĩa & Cardinality ─────────────────────────────────────
  933: 'SYNTAX_ERROR', // ORA-00933: SQL command not properly ended
  900: 'SYNTAX_ERROR', // ORA-00900: invalid SQL statement
  923: 'SYNTAX_ERROR', // ORA-00923: FROM keyword not found where expected
  918: 'INVALID_INPUT', // ORA-00918: column ambiguously defined
  1427: 'INVALID_INPUT', // ORA-01427: single-row subquery returns more than one row

  // ── Ràng buộc dữ liệu ─────────────────────────────────────────────────────
  1: 'DUPLICATE_KEY', // ORA-00001: unique constraint violated
  2291: 'FOREIGN_KEY_VIOLATION', // ORA-02291: integrity constraint violated - parent key not found
  2292: 'FOREIGN_KEY_VIOLATION', // ORA-02292: integrity constraint violated - child record found
  1400: 'INVALID_INPUT', // ORA-01400: cannot insert NULL into
  2290: 'INVALID_INPUT', // ORA-02290: check constraint violated

  // ── Lỗi kiểu dữ liệu & Giá trị ─────────────────────────────────────────────
  1476: 'INVALID_INPUT', // ORA-01476: divisor is equal to zero
  1722: 'INVALID_INPUT', // ORA-01722: invalid number
  1843: 'INVALID_INPUT', // ORA-01843: not a valid month
  1861: 'INVALID_INPUT', // ORA-01861: literal does not match format string
  1401: 'INVALID_INPUT', // ORA-01401: inserted value too large for column
  12899: 'INVALID_INPUT', // ORA-12899: value too large for column

  // ── Huỷ & Timeout ─────────────────────────────────────────────────────────
  1013: 'QUERY_CANCELLED', // ORA-01013: user requested cancel of current operation
  54: 'LOCK_TIMEOUT', // ORA-00054: resource busy and acquire with NOWAIT specified
  60: 'DEADLOCK', // ORA-00060: deadlock detected while waiting for resource

  // ── Kết nối ───────────────────────────────────────────────────────────────
  12154: 'CONNECTION_FAILED', // ORA-12154: TNS:could not resolve the connect identifier specified
  12541: 'CONNECTION_FAILED', // ORA-12541: TNS:no listener
  12514: 'CONNECTION_FAILED', // ORA-12514: TNS:listener does not currently know of service requested
}

export function toCorvusError(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    errorNum?: number
    code?: string | number
    message?: string
    offset?: number
  }

  const num = e?.errorNum ?? (typeof e?.code === 'number' ? e.code : undefined)

  if (num && ORACLE_ERROR_MAP[num]) {
    const code = ORACLE_ERROR_MAP[num]
    return corvusError(code, e.message ?? `ORA-${String(num).padStart(5, '0')}`, {
      detail: e.message,
    })
  }

  // Parse ORA-XXXXX from message string if errorNum not set
  if (e?.message) {
    const match = /ORA-(\d{5})/.exec(e.message)
    if (match && match[1]) {
      const codeNum = parseInt(match[1], 10)
      if (ORACLE_ERROR_MAP[codeNum]) {
        return corvusError(ORACLE_ERROR_MAP[codeNum], e.message, {
          detail: e.message,
        })
      }
    }
  }

  const rawMessage = e?.message ?? String(err)
  return corvusError('INTERNAL_ERROR', rawMessage, {
    detail: rawMessage,
  })
}
