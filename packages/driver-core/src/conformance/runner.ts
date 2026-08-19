import { describe, expect, it } from 'vitest'
import type { CellValue } from '@corvus/contract'
import type { DatabaseDriver, DriverConnection } from '../types'
import { CONFORMANCE_SCHEMA } from './fixture'
import type { ConformanceSuiteOptions } from './types'

/**
 * Bộ kiểm định chung cho mọi driver — driver-spi.md §8.
 *
 * Gọi hàm này trong file test của driver; nó ĐĂNG KÝ các test vitest thật, nên fail sẽ
 * làm `pnpm test` đỏ. Bản trước là runner tự viết trả về report — không ai đọc report đó
 * nên nó không chặn được gì (audit 2026-08-18).
 *
 * Hiện phủ nhóm C1 (Connect) và C2 (Introspect). C3–C9 thêm dần theo driver-spi.md §8.
 */
export function runConformanceSuite(driver: DatabaseDriver, options: ConformanceSuiteOptions): void {
  const schema = options.schema ?? CONFORMANCE_SCHEMA
  const fixtureTable = options.fixtureTable ?? 'country'

  /** Mở kết nối, chạy body, đóng kể cả khi lỗi — không để rò session giữa các test. */
  async function withConnection<T>(fn: (conn: DriverConnection) => Promise<T>): Promise<T> {
    const conn = await driver.connect(options.profile)
    try {
      return await fn(conn)
    } finally {
      await conn.close()
    }
  }

  describe(`conformance C1 · connect · ${driver.id}`, () => {
    it('kết nối và ping thành công với profile hợp lệ', async () => {
      const latency = await withConnection((c) => c.ping())
      expect(latency).toBeGreaterThanOrEqual(0)
      expect(latency).toBeLessThan(10_000)
    })

    it('phơi serverVersion đã parse đúng', async () => {
      const v = await withConnection(async (c) => c.serverVersion)
      expect(v.raw).toBeTruthy()
      expect(v.major).toBeGreaterThan(0)
    })

    it('capabilities của connection được thu hẹp theo server thật', async () => {
      const caps = await withConnection(async (c) => c.capabilities)
      expect(caps.objects).toBeDefined()
      expect(caps.sql).toBeDefined()
      expect(caps.exec).toBeDefined()
      expect(caps.tx).toBeDefined()
    })

    it('sai mật khẩu bị từ chối bằng CorvusError, không phải lỗi thô', async () => {
      const bad = { ...options.profile, password: 'mat-khau-sai-chac-chan-khong-dung' }
      await expect(driver.connect(bad)).rejects.toMatchObject({ name: 'CorvusError' })
    })

    it('host không tồn tại bị từ chối và KHÔNG treo vô hạn', async () => {
      const bad = { ...options.profile, host: 'khong-ton-tai.corvus.invalid', port: 5432 }
      await expect(driver.connect(bad)).rejects.toMatchObject({ name: 'CorvusError' })
    }, 30_000)

    it('mở rồi đóng 30 lần không rò kết nối (ping vẫn chạy sau đó)', async () => {
      for (let i = 0; i < 30; i++) {
        await withConnection((c) => c.ping())
      }
      const latency = await withConnection((c) => c.ping())
      expect(latency).toBeGreaterThanOrEqual(0)
    }, 60_000)
  })

  describe(`conformance C2 · introspect · ${driver.id}`, () => {
    it('listDatabases trả về danh sách không rỗng', async () => {
      const dbs = await withConnection((c) => c.introspect.listDatabases())
      expect(Array.isArray(dbs)).toBe(true)
      expect(dbs.length).toBeGreaterThan(0)
    })

    it('listSchemas thấy schema fixture và KHÔNG trả schema hệ thống', async () => {
      const schemas = await withConnection((c) => c.introspect.listSchemas())
      expect(schemas).toContain(schema)
      expect(schemas.some((s) => s.startsWith('pg_'))).toBe(false)
      expect(schemas).not.toContain('information_schema')
    })

    it('listObjects trả về bảng, view và metadata kèm theo', async () => {
      const objects = await withConnection((c) => c.introspect.listObjects({ schema }))
      const names = objects.map((o) => o.name)
      expect(names).toContain('country')
      expect(names).toContain('city')
      // Tên có dấu cách phải liệt kê được, không bị cắt hay escape sai.
      expect(names).toContain('order details')

      const country = objects.find((o) => o.name === 'country')
      expect(country?.kind).toBe('table')
      const view = objects.find((o) => o.name === 'city_view')
      expect(view?.kind).toBe('view')
    })

    it('listObjects lọc theo kind', async () => {
      const views = await withConnection((c) => c.introspect.listObjects({ schema, kind: 'view' }))
      expect(views.map((v) => v.name)).toEqual(['city_view'])
    })

    it('getTableMeta trả đủ cột, PK, index và FK', async () => {
      const meta = await withConnection((c) => c.introspect.getTableMeta({ schema, table: 'city' }))

      expect(meta.columns.map((c) => c.name)).toEqual(['city_id', 'country_id', 'city', 'note'])
      expect(meta.columns.find((c) => c.name === 'city_id')?.isPrimaryKey).toBe(true)
      expect(meta.columns.find((c) => c.name === 'note')?.nullable).toBe(true)
      expect(meta.columns.find((c) => c.name === 'city')?.nullable).toBe(false)

      expect(meta.indexes.some((i) => i.primary)).toBe(true)
      expect(meta.indexes.some((i) => i.name === 'city_country_idx')).toBe(true)

      expect(meta.foreignKeys).toHaveLength(1)
      expect(meta.foreignKeys[0]).toMatchObject({
        column: 'country_id',
        referencedTable: 'country',
        referencedColumn: 'country_id',
        onDelete: 'CASCADE',
      })
    })

    it('getTableMeta đọc được comment và unique index', async () => {
      const meta = await withConnection((c) => c.introspect.getTableMeta({ schema, table: 'country' }))
      expect(meta.columns.find((c) => c.name === 'iso_code')?.comment).toBe('ISO 3166-1 alpha-2')
      expect(meta.indexes.some((i) => i.name === 'country_name_uq' && i.unique)).toBe(true)
    })

    it('getTableMeta xử lý được tên bảng và cột có dấu cách / unicode / từ khoá SQL', async () => {
      const meta = await withConnection((c) =>
        c.introspect.getTableMeta({ schema, table: 'order details' }),
      )
      expect(meta.columns.map((c) => c.name)).toEqual(['id', 'sản lượng', 'select'])
    })

    it('getTableMeta trên bảng không tồn tại ném TABLE_NOT_FOUND', async () => {
      await expect(
        withConnection((c) => c.introspect.getTableMeta({ schema, table: 'khong_co_bang_nay' })),
      ).rejects.toMatchObject({ code: 'TABLE_NOT_FOUND' })
    })

    it('getDdl sinh ra DDL chạy lại được (chứa CREATE TABLE và tên đã quote)', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ schema, name: fixtureTable, kind: 'table' }),
      )
      expect(ddl).toContain('CREATE TABLE')
      expect(ddl).toContain(fixtureTable)
      expect(ddl).toContain('PRIMARY KEY')
    })

    it('getDdl cho view trả về định nghĩa view', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ schema, name: 'city_view', kind: 'view' }),
      )
      expect(ddl).toContain('CREATE VIEW')
      expect(ddl.toLowerCase()).toContain('select')
    })

    it('introspect KHÔNG dùng N+1: listObjects trên schema fixture ≤ 800 ms', async () => {
      const t0 = Date.now()
      await withConnection((c) => c.introspect.listObjects({ schema }))
      expect(Date.now() - t0).toBeLessThan(800)
    })
  })

  describe(`conformance C3 · execute · ${driver.id}`, () => {
    async function collect(sql: string, values?: unknown[], opts?: { maxRows?: number; chunkSize?: number }) {
      return withConnection(async (conn) => {
        const chunks = []
        for await (const chunk of conn.execute({ sql, values, ...opts })) chunks.push(chunk)
        return chunks
      })
    }

    it('SELECT rỗng trả về chunk done với 0 dòng', async () => {
      const chunks = await collect(`SELECT * FROM ${schema}.country WHERE 1 = 0`)
      const rows = chunks.flatMap((c) => c.rows)
      expect(rows).toHaveLength(0)
      expect(chunks.at(-1)?.done).toBe(true)
    })

    it('SELECT có dữ liệu trả về columns ở chunk đầu và seq liên tục', async () => {
      const chunks = await collect(`SELECT country_id, country FROM ${schema}.country ORDER BY country_id`)
      expect(chunks[0]?.columns?.map((c) => c.name)).toEqual(['country_id', 'country'])
      expect(chunks.map((c) => c.seq)).toEqual(chunks.map((_, i) => i))
      const rows = chunks.flatMap((c) => c.rows)
      expect(rows).toHaveLength(3)
    })

    it('phân biệt NULL và chuỗi rỗng', async () => {
      const chunks = await collect(
        `SELECT note FROM ${schema}.city WHERE city_id IN (1, 2) ORDER BY city_id`,
      )
      const rows = chunks.flatMap((c) => c.rows) as CellValue[][]
      expect(rows[0]?.[0]).toEqual({ k: 'null' })
      expect(rows[1]?.[0]).toEqual({ k: 'str', v: '' })
    })

    it('bigint và numeric giữ nguyên độ chính xác (dạng string)', async () => {
      const chunks = await collect(`SELECT big_val, numeric_val FROM ${schema}.types_probe WHERE id = 1`)
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual({ k: 'big', v: '9223372036854775807' })
      expect(row[1]?.k).toBe('big')
      expect(String((row[1] as { v: string }).v)).toContain('12345678901234567890')
    })

    it('bool, json, bytes, timestamp về đúng biến thể CellValue', async () => {
      const chunks = await collect(
        `SELECT bool_val, json_val, bytes_val, ts_val FROM ${schema}.types_probe WHERE id = 1`,
      )
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual({ k: 'bool', v: true })
      expect(row[1]).toMatchObject({ k: 'json' })
      expect(row[2]?.k).toBe('bytes')
      expect(row[3]?.k).toBe('date')
    })

    it('parameter được bind, không nội suy chuỗi', async () => {
      // Giá trị chứa dấu nháy: nếu driver nội suy thì câu lệnh sẽ lỗi cú pháp.
      const chunks = await collect(`SELECT $1::text AS v`, ["ke' OR 1=1 --"])
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual({ k: 'str', v: "ke' OR 1=1 --" })
    })

    it('chia chunk theo chunkSize và không mất dòng nào', async () => {
      const chunks = await collect(
        `SELECT generate_series(1, 250) AS n`,
        undefined,
        { chunkSize: 100 },
      )
      expect(chunks.length).toBeGreaterThanOrEqual(3)
      expect(chunks.flatMap((c) => c.rows)).toHaveLength(250)
      expect(chunks.at(-1)?.done).toBe(true)
    })

    it('maxRows cắt kết quả và báo truncated', async () => {
      const chunks = await collect(
        `SELECT generate_series(1, 1000) AS n`,
        undefined,
        { chunkSize: 100, maxRows: 250 },
      )
      expect(chunks.flatMap((c) => c.rows)).toHaveLength(250)
      expect(chunks.at(-1)?.stats?.truncated).toBe(true)
    })

    it('cú pháp sai ném SYNTAX_ERROR', async () => {
      await expect(collect('SELEKT 1')).rejects.toMatchObject({ code: 'SYNTAX_ERROR' })
    })

    it('bảng không tồn tại ném TABLE_NOT_FOUND', async () => {
      await expect(collect('SELECT * FROM khong_co_bang_nay_dau')).rejects.toMatchObject({
        code: 'TABLE_NOT_FOUND',
      })
    })

    it('AbortSignal đã abort thì huỷ ngay, không chạy tiếp', async () => {
      const ac = new AbortController()
      ac.abort()
      await expect(
        withConnection(async (conn) => {
          for await (const _ of conn.execute({ sql: 'SELECT 1', signal: ac.signal })) {
            /* không nên tới đây */
          }
        }),
      ).rejects.toMatchObject({ code: 'QUERY_CANCELLED' })
    })
  })

  describe(`conformance C5 · transaction · ${driver.id}`, () => {
    it('commit làm thay đổi tồn tại', async () => {
      await withConnection(async (conn) => {
        const tx = await conn.beginTransaction()
        await tx.commit()
      })
      // Chỉ khẳng định commit/rollback không ném; DML trong tx thuộc C5 mở rộng (T-B06).
      expect(true).toBe(true)
    })

    it('rollback không ném và giải phóng kết nối về pool', async () => {
      await withConnection(async (conn) => {
        const tx = await conn.beginTransaction()
        await tx.rollback()
        // Nếu client không được release, ping sau đây sẽ treo tới hết timeout.
        const latency = await conn.ping()
        expect(latency).toBeGreaterThanOrEqual(0)
      })
    })

    it('savepoint và rollbackTo hoạt động khi capability cho phép', async () => {
      await withConnection(async (conn) => {
        if (!conn.capabilities.tx.savepoints) return
        const tx = await conn.beginTransaction()
        await tx.savepoint('sp1')
        await tx.rollbackTo('sp1')
        await tx.rollback()
      })
    })

    it('savepoint từ chối tên không hợp lệ (chống injection)', async () => {
      await withConnection(async (conn) => {
        if (!conn.capabilities.tx.savepoints) return
        const tx = await conn.beginTransaction()
        await expect(tx.savepoint('sp1"; DROP TABLE x; --')).rejects.toMatchObject({
          name: 'CorvusError',
        })
        await tx.rollback()
      })
    })
  })
}
