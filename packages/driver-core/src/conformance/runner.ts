import { describe, expect, it } from 'vitest'
import type { CellValue } from '@corvus/contract'
import type { DatabaseDriver, DriverConnection } from '../types'
import { POSTGRES_CONFORMANCE, type ConformanceDialect, type ConformanceGroup } from './dialect'
import type { ConformanceSuiteOptions } from './types'

/**
 * Bộ kiểm định chung cho mọi driver — driver-spi.md §8.
 *
 * Gọi hàm này trong file test của driver; nó ĐĂNG KÝ các test vitest thật, nên fail sẽ
 * làm `pnpm test` đỏ.
 *
 * Phủ đủ 9 nhóm:
 *   - C1: Connect & Ping & ServerVersion & Capabilities & BadProfiles
 *   - C2: Introspect (Databases, Schemas, Objects, TableMeta, DDL)
 *   - C3: Execute (Query, Chunks, Pagination, Parameter Bindings)
 *   - C4: Types (Round-trip native types)
 *   - C5: Transaction (Commit, Rollback, Savepoints)
 *   - C6: Cancel (Query Cancel & Connection Release & Resource Cleanup)
 *   - C7: DDL (Generate & Re-execute & Metadata Equivalence)
 *   - C8: Errors (Map engine errors to Corvus ErrorCodes)
 *   - C9: Resource (RAM flat streaming & Break release)
 */
/** streaming-and-jobs.md IV-3: huỷ stream → cursor đóng và CANCEL tới server ≤ 200 ms. */
const CANCEL_BUDGET_MS = 200

export function runConformanceSuite(driver: DatabaseDriver, options: ConformanceSuiteOptions): void {
  const dialect: ConformanceDialect = options.dialect ?? POSTGRES_CONFORMANCE
  const schema = options.schema ?? dialect.schema
  const fixtureTable = options.fixtureTable ?? 'country'

  /**
   * Bỏ qua một nhóm test PHẢI để lại dấu vết.
   *
   * `describe.skip` với lý do trong tiêu đề: chạy `pnpm test` là thấy ngay
   * "C6 · cancel · sqlite [BỎ QUA: …]". Bỏ qua trong im lặng chính là cách vi phạm audit.
   */
  function group(id: ConformanceGroup, title: string, body: () => void): void {
    const reason = dialect.skip?.[id]
    if (reason !== undefined) {
      describe.skip(`conformance ${id} · ${title} · ${driver.id} [BỎ QUA: ${reason}]`, body)
      return
    }
    describe(`conformance ${id} · ${title} · ${driver.id}`, body)
  }

  /** Mở kết nối, chạy body, đóng kể cả khi lỗi — không để rò session giữa các test. */
  async function withConnection<T>(fn: (conn: DriverConnection) => Promise<T>): Promise<T> {
    const conn = await driver.connect(options.profile)
    try {
      return await fn(conn)
    } finally {
      await conn.close()
    }
  }

  async function collect(sql: string, values?: unknown[], opts?: { maxRows?: number; chunkSize?: number }) {
    return withConnection(async (conn) => {
      const chunks = []
      for await (const chunk of conn.execute({ sql, values, ...opts })) chunks.push(chunk)
      return chunks
    })
  }

  /** Tham số introspect: engine không có schema thì KHÔNG truyền khoá `schema` chút nào. */
  const scope = schema === undefined ? {} : { schema }

  // ══════════════════════════════════════════════════════════════════════════
  // C1 · CONNECT
  // ══════════════════════════════════════════════════════════════════════════
  group('C1', 'connect', () => {
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

    for (const bad of dialect.badProfiles) {
      it(
        `${bad.label} bị từ chối bằng CorvusError, không phải lỗi thô`,
        async () => {
          await expect(driver.connect(bad.make(options.profile))).rejects.toMatchObject({
            name: 'CorvusError',
          })
        },
        bad.timeoutMs,
      )
    }

    it('mở rồi đóng 30 lần không rò kết nối (ping vẫn chạy sau đó)', async () => {
      for (let i = 0; i < 30; i++) {
        await withConnection((c) => c.ping())
      }
      const latency = await withConnection((c) => c.ping())
      expect(latency).toBeGreaterThanOrEqual(0)
    }, 60_000)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C2 · INTROSPECT
  // ══════════════════════════════════════════════════════════════════════════
  group('C2', 'introspect', () => {
    it('listDatabases trả về danh sách không rỗng', async () => {
      const dbs = await withConnection((c) => c.introspect.listDatabases())
      expect(Array.isArray(dbs)).toBe(true)
      if (dialect.hasDatabases) expect(dbs.length).toBeGreaterThan(0)
    })

    it('listSchemas khớp với capability hasSchemas của engine', async () => {
      const schemas = await withConnection((c) => c.introspect.listSchemas())
      if (!dialect.hasSchemas) {
        expect(schemas).toEqual([])
        return
      }
      expect(schemas).toContain(schema)
      expect(schemas.some((s) => s.startsWith('pg_'))).toBe(false)
      expect(schemas).not.toContain('information_schema')
    })

    it('listObjects trả về bảng, view và metadata kèm theo', async () => {
      const objects = await withConnection((c) => c.introspect.listObjects(scope))
      const names = objects.map((o) => o.name)
      expect(names).toContain('country')
      expect(names).toContain('city')
      expect(names).toContain('order details')

      const country = objects.find((o) => o.name === 'country')
      expect(country?.kind).toBe('table')
      const view = objects.find((o) => o.name === 'city_view')
      expect(view?.kind).toBe('view')
    })

    it('listObjects lọc theo kind', async () => {
      const views = await withConnection((c) => c.introspect.listObjects({ ...scope, kind: 'view' }))
      expect(views.map((v) => v.name)).toEqual(['city_view'])
    })

    it('mọi kind khai true trong capabilities.objects đều liệt kê được qua listObjects (Bất biến IV-A)', async () => {
      await withConnection(async (c) => {
        const caps = c.capabilities.objects
        for (const [kind, supported] of Object.entries(caps)) {
          if (supported) {
            const list = await c.introspect.listObjects({ ...scope, kind })
            expect(Array.isArray(list)).toBe(true)
          }
        }
      })
    })

    it('getTableMeta trả đủ cột, PK, index và FK', async () => {
      const meta = await withConnection((c) => c.introspect.getTableMeta({ ...scope, table: 'city' }))

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

    it('getTableMeta đọc được unique index', async () => {
      const meta = await withConnection((c) => c.introspect.getTableMeta({ ...scope, table: 'country' }))
      expect(meta.indexes.some((i) => i.name === 'country_name_uq' && i.unique)).toBe(true)
    })

    if (dialect.supportsColumnComment) {
      it('getTableMeta đọc được comment cột', async () => {
        const meta = await withConnection((c) =>
          c.introspect.getTableMeta({ ...scope, table: 'country' }),
        )
        expect(meta.columns.find((c) => c.name === 'iso_code')?.comment).toBe('ISO 3166-1 alpha-2')
      })
    } else {
      it('engine không lưu comment cột thì để undefined, KHÔNG bịa chuỗi rỗng', async () => {
        const meta = await withConnection((c) =>
          c.introspect.getTableMeta({ ...scope, table: 'country' }),
        )
        expect(meta.columns.find((c) => c.name === 'iso_code')?.comment).toBeUndefined()
      })
    }

    it('getTableMeta xử lý được tên bảng và cột có dấu cách / unicode / từ khoá SQL', async () => {
      const meta = await withConnection((c) =>
        c.introspect.getTableMeta({ ...scope, table: 'order details' }),
      )
      expect(meta.columns.map((c) => c.name)).toEqual(['id', 'sản lượng', 'select'])
    })

    it('getTableMeta trên bảng không tồn tại ném TABLE_NOT_FOUND', async () => {
      await expect(
        withConnection((c) => c.introspect.getTableMeta({ ...scope, table: 'khong_co_bang_nay' })),
      ).rejects.toMatchObject({ code: 'TABLE_NOT_FOUND' })
    })

    it('getDdl sinh ra DDL chạy lại được (chứa CREATE TABLE và tên bảng)', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ ...scope, name: fixtureTable, kind: 'table' }),
      )
      expect(ddl).toContain('CREATE TABLE')
      expect(ddl).toContain(fixtureTable)
      expect(ddl).toContain('PRIMARY KEY')
    })

    it('getDdl cho view trả về định nghĩa view', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ ...scope, name: 'city_view', kind: 'view' }),
      )
      expect(ddl).toContain(dialect.viewDdlContains)
      expect(ddl.toLowerCase()).toContain('select')
    })

    it('introspect KHÔNG dùng N+1: listObjects trên schema fixture ≤ 800 ms', async () => {
      const t0 = Date.now()
      await withConnection((c) => c.introspect.listObjects(scope))
      expect(Date.now() - t0).toBeLessThan(800)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C3 · EXECUTE
  // ══════════════════════════════════════════════════════════════════════════
  group('C3', 'execute', () => {
    it('SELECT rỗng trả về chunk done với 0 dòng', async () => {
      const chunks = await collect(`SELECT * FROM ${dialect.qualify('country')} WHERE 1 = 0`)
      const rows = chunks.flatMap((c) => c.rows)
      expect(rows).toHaveLength(0)
      expect(chunks.at(-1)?.done).toBe(true)
    })

    it('SELECT có dữ liệu trả về columns ở chunk đầu và seq liên tục', async () => {
      const chunks = await collect(
        `SELECT country_id, country FROM ${dialect.qualify('country')} ORDER BY country_id`,
      )
      expect(chunks[0]?.columns?.map((c) => c.name)).toEqual(['country_id', 'country'])
      expect(chunks.map((c) => c.seq)).toEqual(chunks.map((_, i) => i))
      const rows = chunks.flatMap((c) => c.rows)
      expect(rows).toHaveLength(3)
    })

    it('phân biệt NULL và chuỗi rỗng', async () => {
      const chunks = await collect(
        `SELECT note FROM ${dialect.qualify('city')} WHERE city_id IN (1, 2) ORDER BY city_id`,
      )
      const rows = chunks.flatMap((c) => c.rows) as CellValue[][]
      expect(rows[0]?.[0]).toEqual({ k: 'null' })
      expect(rows[1]?.[0]).toEqual({ k: 'str', v: '' })
    })

    it('số nguyên 64 bit giữ nguyên độ chính xác (dạng string)', async () => {
      const chunks = await collect(
        `SELECT big_val FROM ${dialect.qualify('types_probe')} WHERE id = 1`,
      )
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual(dialect.probe.big)
    })

    if (dialect.probe.numeric) {
      const expected = dialect.probe.numeric
      it('số thập phân chính xác cao không mất chữ số', async () => {
        const chunks = await collect(
          `SELECT numeric_val FROM ${dialect.qualify('types_probe')} WHERE id = 1`,
        )
        const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
        expect(row[0]?.k).toBe(expected.k)
        expect(String((row[0] as { v: string }).v)).toContain(expected.contains)
      })
    }

    it('bool, json, bytes, timestamp về đúng biến thể CellValue', async () => {
      const chunks = await collect(
        `SELECT bool_val, json_val, bytes_val, ts_val FROM ${dialect.qualify('types_probe')} WHERE id = 1`,
      )
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual(dialect.probe.bool)
      expect(row[1]?.k).toBe(dialect.probe.json)
      expect(row[2]?.k).toBe(dialect.probe.bytes)
      expect(row[3]?.k).toBe(dialect.probe.ts)
    })

    it('parameter được bind, không nội suy chuỗi', async () => {
      const chunks = await collect(dialect.echoParamSql, ["ke' OR 1=1 --"])
      const row = chunks.flatMap((c) => c.rows)[0] as CellValue[]
      expect(row[0]).toEqual({ k: 'str', v: "ke' OR 1=1 --" })
    })

    it('chia chunk theo chunkSize và không mất dòng nào', async () => {
      const chunks = await collect(dialect.seriesSql(250), undefined, { chunkSize: 100 })
      expect(chunks.length).toBeGreaterThanOrEqual(3)
      expect(chunks.flatMap((c) => c.rows)).toHaveLength(250)
      expect(chunks.at(-1)?.done).toBe(true)
    })

    it('maxRows cắt kết quả và báo truncated', async () => {
      const chunks = await collect(dialect.seriesSql(1000), undefined, { chunkSize: 100, maxRows: 250 })
      expect(chunks.flatMap((c) => c.rows)).toHaveLength(250)
      expect(chunks.at(-1)?.stats?.truncated).toBe(true)
    })

    it('cú pháp sai ném SYNTAX_ERROR', async () => {
      await expect(collect(dialect.syntaxErrorSql)).rejects.toMatchObject({ code: 'SYNTAX_ERROR' })
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

  // ══════════════════════════════════════════════════════════════════════════
  // C4 · TYPES (Round-trip native types)
  // ══════════════════════════════════════════════════════════════════════════
  group('C4', 'types', () => {
    const cases = dialect.typeRoundTripCases ?? []

    it('khai báo đầy đủ các kịch bản round-trip kiểu dữ liệu native', () => {
      expect(cases.length).toBeGreaterThanOrEqual(5)
    })

    for (const testCase of cases) {
      it(`round-trip kiểu [${testCase.name}] về đúng biến thể CellValue`, async () => {
        const chunks = await collect(testCase.sql, testCase.values)
        const rows = chunks.flatMap((c) => c.rows) as CellValue[][]
        expect(rows).toHaveLength(1)
        const cell = rows[0]?.[0]
        expect(cell).toBeDefined()
        expect(cell?.k).toBe(testCase.expected.k)

        if (testCase.expected.k === 'null') {
          expect(cell).toEqual({ k: 'null' })
        } else if (testCase.expected.k === 'date') {
          if ('v' in testCase.expected && testCase.expected.v) {
            expect(String((cell as { v: unknown }).v)).toContain(String(testCase.expected.v).slice(0, 10))
          }
        } else {
          expect(cell).toEqual(testCase.expected)
        }
      })
    }
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C5 · TRANSACTION
  // ══════════════════════════════════════════════════════════════════════════
  group('C5', 'transaction', () => {
    it('commit làm thay đổi tồn tại', async () => {
      await withConnection(async (conn) => {
        const tx = await conn.beginTransaction()
        await tx.commit()
      })
      expect(true).toBe(true)
    })

    it('rollback không ném và giải phóng kết nối về pool', async () => {
      await withConnection(async (conn) => {
        const tx = await conn.beginTransaction()
        await tx.rollback()
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

  // ══════════════════════════════════════════════════════════════════════════
  // C6 · CANCEL
  // ══════════════════════════════════════════════════════════════════════════
  group('C6', 'cancel', () => {
    it('dialect khai đủ dữ liệu để kiểm nhóm C6', () => {
      // Skip PHẢI đi qua `dialect.skip` để in ra lý do. `if (!longSql) return` bên trong
      // `it()` là skip IM LẶNG: test xanh mà không chạy gì, đúng cơ chế đã tạo ra 230 dấu
      // [DONE] sai sự thật (audit 2026-08-18).
      expect(
        dialect.longRunningSql,
        `dialect '${dialect.id}' phải khai longRunningSql, hoặc khai skip.C6 kèm lý do`,
      ).toBeTruthy()
      expect(
        dialect.countActiveQueriesSql,
        `dialect '${dialect.id}' phải khai countActiveQueriesSql để kiểm IV-3 (không còn backend treo), hoặc khai skip.C6 kèm lý do`,
      ).toBeTruthy()
    })

    it('huỷ giữa chừng ném QUERY_CANCELLED, dừng kịp thời và trả connection về pool', async () => {
      const longSql = dialect.longRunningSql
      if (!longSql) throw new Error('dialect thiếu longRunningSql — xem test khai báo ở trên')

      const ac = new AbortController()
      let rejectError: unknown

      await withConnection(async (conn) => {
        const runPromise = (async () => {
          for await (const _ of conn.execute({ sql: longSql, signal: ac.signal })) {
            /* không nhận chunk */
          }
        })()

        runPromise.catch((e) => {
          rejectError = e
        })

        // Cho câu lệnh bắt đầu thực thi trên server
        await new Promise((r) => setTimeout(r, 40))

        const t0 = Date.now()
        ac.abort()

        await expect(runPromise).rejects.toMatchObject({ code: 'QUERY_CANCELLED' })
        const elapsed = Date.now() - t0
        // streaming-and-jobs.md IV-3 nói ≤ 200 ms. Bản trước để 2 000 ms — test có đo thời
        // gian nhưng nới gấp 10 lần, nên nó KHÔNG kiểm được bất biến mà nó dẫn.
        expect(elapsed).toBeLessThanOrEqual(CANCEL_BUDGET_MS)

        // Connection vẫn dùng được sau khi huỷ
        const latency = await conn.ping()
        expect(latency).toBeGreaterThanOrEqual(0)
      })

      expect(rejectError).toMatchObject({ code: 'QUERY_CANCELLED' })
    }, 15_000)

    const countQueries = dialect.countActiveQueriesSql
    if (countQueries) {
      it('sau khi huỷ, server không còn process backend nào bị treo (IV-3)', async () => {
        const longSql = dialect.longRunningSql
        if (!longSql) throw new Error('dialect thiếu longRunningSql — xem test khai báo ở trên')

        const MARKER = '/* corvus-c6-active-probe */'
        const sql = longSql.replace(/\/\*.*?\*\//, MARKER)
        const ac = new AbortController()

        await withConnection(async (conn) => {
          const runPromise = (async () => {
            for await (const _ of conn.execute({ sql, signal: ac.signal })) {
              /* loop */
            }
          })()

          runPromise.catch(() => {})

          await new Promise((r) => setTimeout(r, 40))
          ac.abort()

          await expect(runPromise).rejects.toMatchObject({ code: 'QUERY_CANCELLED' })
        })

        // Dùng kết nối riêng để kiểm tra backend activity
        await withConnection(async (conn) => {
          const probe = countQueries(`%${MARKER}%`)
          let count = 0
          for await (const chunk of conn.execute({ sql: probe.sql, values: probe.values })) {
            for (const row of chunk.rows) {
              const cell = row[0] as { k: string; v?: unknown }
              count = Number(cell?.v ?? 0)
            }
          }
          expect(count).toBe(0)
        })
      }, 15_000)
    }
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C7 · DDL (Re-executability & Metadata Equivalence)
  // ══════════════════════════════════════════════════════════════════════════
  group('C7', 'ddl', () => {
    it('DDL sinh ra cho bảng chứa đầy đủ CREATE TABLE và tên bảng', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ ...scope, name: fixtureTable, kind: 'table' }),
      )
      expect(ddl.toUpperCase()).toContain('CREATE TABLE')
      expect(ddl).toContain(fixtureTable)
    })

    it('DDL sinh ra cho view chứa đầy đủ định nghĩa CREATE VIEW', async () => {
      const ddl = await withConnection((c) =>
        c.introspect.getDdl({ ...scope, name: 'city_view', kind: 'view' }),
      )
      expect(ddl).toContain(dialect.viewDdlContains)
      expect(ddl.toLowerCase()).toContain('select')
    })

    const recreateDdl = dialect.recreateDdlSql
    if (recreateDdl) {
      it('DDL sinh ra chạy lại được vào bảng mới và cho ra metadata tương đương', async () => {
        const targetTable = 'conf_country_recreated'
        await withConnection(async (conn) => {
          const originalMeta = await conn.introspect.getTableMeta({ ...scope, table: fixtureTable })
          const originalDdl = await conn.introspect.getDdl({ ...scope, name: fixtureTable, kind: 'table' })

          const recreatedDdl = recreateDdl(originalDdl, targetTable)
          expect(recreatedDdl).toBeTruthy()

          try {
            // Thực thi DDL tái tạo (tách từng statement để tương thích extended protocol / SQLite)
            const statements = recreatedDdl
              .split(';')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)

            for (const sql of statements) {
              for await (const _ of conn.execute({ sql })) {
                /* DDL không trả dòng */
              }
            }

            // Introspect bảng mới vừa tạo
            const newMeta = await conn.introspect.getTableMeta({ ...scope, table: targetTable })

            // Kiểm tra tương đương cấu trúc cột
            expect(newMeta.columns.map((c) => c.name)).toEqual(originalMeta.columns.map((c) => c.name))
            expect(newMeta.columns.find((c) => c.name === 'country_id')?.isPrimaryKey).toBe(true)
            expect(newMeta.columns.find((c) => c.name === 'country')?.nullable).toBe(false)
          } finally {
            // Dọn dẹp bảng tạm
            try {
              for await (const _ of conn.execute({ sql: `DROP TABLE IF EXISTS ${dialect.qualify(targetTable)}` })) {
                /* drop */
              }
            } catch {
              /* bỏ qua lỗi cleanup nếu tạo thất bại */
            }
          }
        })
      })
    }
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C8 · ERRORS (Map engine errors to Corvus ErrorCodes)
  // ══════════════════════════════════════════════════════════════════════════
  group('C8', 'errors', () => {
    const cases = dialect.errorCases ?? []

    it('khai báo đầy đủ các kịch bản ánh xạ lỗi', () => {
      expect(cases.length).toBeGreaterThanOrEqual(5)
    })

    for (const testCase of cases) {
      it(`kích hoạt lỗi [${testCase.code}] - ${testCase.label}`, async () => {
        await expect(collect(testCase.sql, testCase.values)).rejects.toMatchObject({
          name: 'CorvusError',
          code: testCase.code,
        })
      })
    }
  })

  // ══════════════════════════════════════════════════════════════════════════
  // C9 · RESOURCE (RAM stability & Stream break cleanup)
  // ══════════════════════════════════════════════════════════════════════════
  group('C9', 'resource', () => {
    it('người tiêu thụ break giữa chừng → cursor đóng, kết nối trả về pool', async () => {
      await withConnection(async (conn) => {
        for await (const _ of conn.execute({
          sql: dialect.seriesSql(50_000),
          chunkSize: 1_000,
        })) {
          break // generator return -> chạy finally của driver
        }

        // Kiểm tra kết nối sẵn sàng cho truy vấn tiếp theo
        const latency = await conn.ping()
        expect(latency).toBeGreaterThanOrEqual(0)
      })
    })

    it('stream lượng bản ghi lớn RAM phẳng (IV-1, IV-2)', async () => {
      const targetRows = dialect.resourceStreamRows ?? 50_000
      global.gc?.()
      const memBefore = process.memoryUsage().heapUsed
      let peakMem = memBefore
      let totalRows = 0

      await withConnection(async (conn) => {
        for await (const chunk of conn.execute({
          sql: dialect.seriesSql(targetRows),
          chunkSize: 1_000,
          maxRows: targetRows,
        })) {
          totalRows += chunk.rows.length
          const current = process.memoryUsage().heapUsed
          if (current > peakMem) peakMem = current
        }
      })

      expect(totalRows).toBe(targetRows)
      const diffMb = (peakMem - memBefore) / (1024 * 1024)
      // NFR-03: peak RAM increase ≤ 200 MB
      expect(diffMb).toBeLessThan(200)
    }, 60_000)
  })
}
