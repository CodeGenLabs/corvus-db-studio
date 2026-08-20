import { describe, expect, it } from 'vitest'
import { assertReadOnlySql, sqlKeywordTokens, statementKind } from '../statement-kind'

/**
 * Bộ phân loại này là lớp duy nhất chặn `DELETE` gõ tay trên connection read-only
 * (security.md §5 mục 1). Sai theo hướng cho qua = mất dữ liệu production, nên test ở đây
 * ưu tiên các câu NGUY HIỂM MÀ TRÔNG NHƯ CHỈ ĐỌC.
 */

describe('statementKind · câu chỉ đọc phải được cho qua', () => {
  const reads = [
    'SELECT 1',
    'select * from users where id = 1',
    'SELECT * FROM "order details"',
    'WITH x AS (SELECT 1) SELECT * FROM x',
    'EXPLAIN SELECT * FROM t',
    'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM t',
    'SHOW TABLES',
    'SHOW CREATE TABLE t',
    'DESCRIBE t',
    'PRAGMA journal_mode',
    'TABLE users',
    'VALUES (1), (2)',
    '-- chỉ có comment\nSELECT 1',
    '/* khối */ SELECT 1',
    '',
    '   ',
  ]
  for (const sql of reads) {
    it(`cho qua: ${JSON.stringify(sql).slice(0, 48)}`, () => {
      expect(statementKind(sql)).toBe('read')
    })
  }
})

describe('statementKind · câu ghi phải bị chặn', () => {
  const writes = [
    'DELETE FROM users',
    'delete from users where 1=1',
    'INSERT INTO t VALUES (1)',
    'UPDATE t SET a = 1',
    'TRUNCATE t',
    'DROP TABLE t',
    'ALTER TABLE t ADD COLUMN c int',
    'CREATE TABLE t (a int)',
    'GRANT ALL ON t TO x',
    'CALL thu_tuc()',
    'DO $$ BEGIN PERFORM 1; END $$',
    'BEGIN',
    'COMMIT',
    'SET default_transaction_read_only = off',
    'PRAGMA journal_mode = WAL',
    'ATTACH DATABASE \'/tmp/x.db\' AS x',
    'COPY t FROM \'/tmp/x.csv\'',
    'VACUUM',
    'MERGE INTO t USING s ON (1=1) WHEN MATCHED THEN UPDATE SET a = 1',
  ]
  for (const sql of writes) {
    it(`chặn: ${sql.slice(0, 48)}`, () => {
      expect(statementKind(sql)).toBe('write')
    })
  }
})

describe('statementKind · những câu NGUY HIỂM mà trông như chỉ đọc', () => {
  it('CTE ghi dữ liệu của PostgreSQL bị chặn dù mở đầu WITH và kết thúc SELECT', () => {
    // Đây là trường hợp mà bản "chỉ xét từ đầu tiên" sẽ để lọt — và nó xoá dữ liệu thật.
    expect(
      statementKind('WITH d AS (DELETE FROM users RETURNING *) SELECT count(*) FROM d'),
    ).toBe('write')
  })

  it('SELECT … INTO bảng mới bị chặn (nó TẠO bảng)', () => {
    expect(statementKind('SELECT * INTO users_backup FROM users')).toBe('write')
  })

  it('nhiều câu: một câu ghi là chặn CẢ script', () => {
    // Chạy nửa script trên production tệ hơn không chạy gì.
    expect(() => assertReadOnlySql('SELECT 1; DELETE FROM users; SELECT 2')).toThrow()
  })

  it('SELECT … FOR UPDATE bị chặn — nó khoá dòng trên production', () => {
    expect(statementKind('SELECT * FROM t WHERE id = 1 FOR UPDATE')).toBe('write')
  })
})

describe('sqlKeywordTokens · không được nhìn vào chuỗi, comment, định danh đã quote', () => {
  it("chuỗi chứa từ khoá ghi KHÔNG làm câu bị chặn", () => {
    expect(statementKind("SELECT 'DELETE FROM users' AS canh_bao")).toBe('read')
  })

  it('comment chứa từ khoá ghi KHÔNG làm câu bị chặn', () => {
    expect(statementKind('SELECT 1 -- DROP TABLE users')).toBe('read')
    expect(statementKind('SELECT 1 /* TRUNCATE t */')).toBe('read')
  })

  it('định danh đã quote trùng từ khoá ghi KHÔNG làm câu bị chặn', () => {
    expect(statementKind('SELECT * FROM "delete"')).toBe('read')
    expect(statementKind('SELECT * FROM `update`', 'mysql')).toBe('read')
    expect(statementKind('SELECT * FROM [insert]', 'mssql')).toBe('read')
  })

  it('dollar-quote của PostgreSQL được bỏ qua', () => {
    expect(statementKind("SELECT $tag$ DROP TABLE t $tag$ AS s")).toBe('read')
  })

  it('nháy đơn nhân đôi bên trong chuỗi không làm lệch bộ quét', () => {
    expect(statementKind("SELECT 'it''s DELETE' AS s")).toBe('read')
  })

  it('token trả về đã chuẩn hoá chữ hoa và bỏ dấu câu', () => {
    expect(sqlKeywordTokens('select a, b from t')).toEqual(['SELECT', 'A', 'B', 'FROM', 'T'])
  })
})

describe('assertReadOnlySql', () => {
  it('ném CorvusError mã READ_ONLY', () => {
    expect(() => assertReadOnlySql('DELETE FROM t')).toThrowError(
      expect.objectContaining({ name: 'CorvusError', code: 'READ_ONLY' }),
    )
  })

  it('KHÔNG đưa cả câu lệnh vào detail — câu lệnh có thể chứa dữ liệu thật', () => {
    try {
      assertReadOnlySql("DELETE FROM users WHERE email = 'nguoi.dung@khachhang.com'")
      throw new Error('đáng ra phải ném')
    } catch (err) {
      const e = err as { code?: string; detail?: string; message?: string }
      expect(e.code).toBe('READ_ONLY')
      expect(e.detail).toBe('DELETE')
      expect(JSON.stringify(e)).not.toContain('khachhang.com')
      expect(e.message).not.toContain('khachhang.com')
    }
  })

  it('câu chỉ đọc đi qua không ném', () => {
    expect(() => assertReadOnlySql('SELECT 1; SELECT 2')).not.toThrow()
  })
})
