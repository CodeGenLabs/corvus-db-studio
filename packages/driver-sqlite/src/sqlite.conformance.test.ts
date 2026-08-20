import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SQLITE_CONFORMANCE, SQLITE_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import type { ResolvedProfile } from '@corvus/driver-core'
import { sqliteDriver } from './index'

/**
 * Conformance THẬT cho driver-sqlite.
 *
 * Khác PostgreSQL: bộ này chạy trong `pnpm test` bình thường, KHÔNG cần Docker. Đó là lý do
 * SQLite được chọn làm engine thứ hai (driver-roadmap.md §3) — mọi lần chạy test đều kiểm
 * lại rằng SPI thật sự trung lập engine, không phải "PostgreSQL với vài lớp bọc".
 */
const dbFile = path.join(os.tmpdir(), `corvus-conf-sqlite-${process.pid}.db`)

const profile: ResolvedProfile = {
  id: 'conf-sqlite',
  name: 'conformance sqlite',
  driverId: 'sqlite',
  database: dbFile,
}

beforeAll(async () => {
  fs.rmSync(dbFile, { force: true })
  // Tệp rỗng LÀ một database SQLite hợp lệ (không có bảng nào). Nhờ vậy fixture dựng được
  // hoàn toàn qua driver, không cần import better-sqlite3 ở đây — và cũng không phải nới
  // `fileMustExist`, cái đang bảo vệ người dùng khỏi việc gõ sai đường dẫn.
  fs.writeFileSync(dbFile, '')

  const conn = await sqliteDriver.connect(profile)
  try {
    for (const sql of SQLITE_SETUP_SQL) {
      for await (const _ of conn.execute({ sql })) {
        /* DDL/INSERT không trả dòng nào */
      }
    }
  } finally {
    await conn.close()
  }
})

afterAll(() => {
  fs.rmSync(dbFile, { force: true })
})

runConformanceSuite(sqliteDriver, { profile, dialect: SQLITE_CONFORMANCE })

/**
 * Những gì chỉ SQLite mới có, không nằm trong bộ chung.
 */
describe('driver-sqlite · hành vi riêng của engine', () => {
  async function withConnection<T>(fn: (c: Awaited<ReturnType<typeof sqliteDriver.connect>>) => Promise<T>, p = profile): Promise<T> {
    const conn = await sqliteDriver.connect(p)
    try {
      return await fn(conn)
    } finally {
      await conn.close()
    }
  }

  it('capability được mở theo phiên bản SQLite thật, không dùng bảng tĩnh', async () => {
    const { caps, version } = await withConnection(async (c) => ({
      caps: c.capabilities,
      version: c.serverVersion,
    }))
    // Mọi bản SQLite còn được dùng đều ≥ 3.35, nên ba cờ này phải BẬT — nếu chúng vẫn tắt
    // thì narrowSqliteCapabilities không được gọi.
    expect(version.major).toBe(3)
    expect(caps.sql.cte).toBe(true)
    expect(caps.sql.windowFunctions).toBe(true)
    expect(caps.sql.upsert).toBe('on-conflict')
  })

  it('KHÔNG khai khống huỷ statement: cancelStatement là false', async () => {
    const caps = await withConnection(async (c) => c.capabilities)
    // better-sqlite3 đồng bộ, không có interrupt(). Khai true sẽ làm UI hiện nút Stop
    // không có tác dụng gì giữa lúc người dùng đang chờ một query nặng.
    expect(caps.exec.cancelStatement).toBe(false)
    expect(caps.exec.multipleStatements).toBe(false)
  })

  it('không đổi journal_mode của tệp người dùng', async () => {
    const mode = await withConnection(async (c) => {
      const chunks = []
      for await (const chunk of c.execute({ sql: 'PRAGMA journal_mode' })) chunks.push(chunk)
      return chunks.flatMap((ch) => ch.rows)[0]
    })
    // WAL ghi vĩnh viễn vào tệp và sinh thêm -wal/-shm. Công cụ quản trị không được tự đổi
    // cấu hình tệp mà người ta chỉ mở ra để xem.
    expect(JSON.stringify(mode).toLowerCase()).toContain('delete')
  })

  it('kiểm khoá ngoại ĐANG BẬT trên kết nối', async () => {
    // Đo trực tiếp cờ, không suy từ hành vi. Thí nghiệm 2026-08-19: xoá hẳn
    // `db.pragma('foreign_keys = ON')` khỏi driver mà 87 test vẫn xanh — vì `better-sqlite3`
    // TỰ bật foreign_keys khi mở (đo được: `[{"foreign_keys":1}]`). Nghĩa là test cũ chứng
    // minh hành vi của thư viện, không phải của code ta, và comment "SQLite mặc định TẮT"
    // đúng với thư viện C nhưng sai với better-sqlite3.
    const flag = await withConnection(async (c) => {
      const chunks = []
      for await (const chunk of c.execute({ sql: 'PRAGMA foreign_keys' })) chunks.push(chunk)
      return chunks.flatMap((ch) => ch.rows)[0]
    })
    expect(JSON.stringify(flag)).toContain('1')
  })

  it('vi phạm khoá ngoại cho ra FOREIGN_KEY_VIOLATION', async () => {
    await expect(
      withConnection(async (c) => {
        for await (const _ of c.execute({
          sql: `INSERT INTO city (city_id, country_id, city) VALUES (999, 12345, 'không có nước này')`,
        })) {
          /* chờ lỗi */
        }
      }),
    ).rejects.toMatchObject({ code: 'FOREIGN_KEY_VIOLATION' })
  })

  it('vi phạm unique index cho ra DUPLICATE_KEY, không phải lỗi chung', async () => {
    await expect(
      withConnection(async (c) => {
        for await (const _ of c.execute({
          sql: `INSERT INTO country (country_id, country) VALUES (99, 'Việt Nam')`,
        })) {
          /* chờ lỗi */
        }
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_KEY' })
  })

  it('câu lệnh ghi trả affectedRows và rollback được (DDL trong transaction)', async () => {
    await withConnection(async (c) => {
      const tx = await c.beginTransaction()
      for await (const _ of c.execute({ sql: `CREATE TABLE tmp_rollback (x INTEGER)` })) {
        /* DDL */
      }
      await tx.rollback()

      // Điểm mạnh thật của SQLite: DDL nằm trong transaction, rollback là bảng biến mất.
      const objects = await c.introspect.listObjects({})
      expect(objects.map((o) => o.name)).not.toContain('tmp_rollback')
    })
  })

  it('chế độ chỉ đọc: chặn ở GUARD của driver, không phải chỉ nhờ cờ của SQLite', async () => {
    // Bản test trước chỉ khẳng định `code === 'READ_ONLY'`, mà cờ `readonly` lúc mở tệp cũng
    // cho ra đúng mã đó — nên xoá hẳn guard trong `execute()` mà test vẫn xanh (thí nghiệm
    // 2026-08-19). Khẳng định theo THÔNG BÁO để ghim đúng lớp mình viết.
    await expect(
      withConnection(
        async (c) => {
          for await (const _ of c.execute({ sql: `DELETE FROM country WHERE country_id = 3` })) {
            /* chờ lỗi */
          }
        },
        { ...profile, readOnly: true },
      ),
    ).rejects.toMatchObject({
      code: 'READ_ONLY',
      message: expect.stringContaining('chế độ chỉ đọc'),
    })
  })

  it('chế độ chỉ đọc: lớp thứ hai (cờ readonly của tệp) chặn cả câu lệnh ghi TRẢ VỀ DÒNG', async () => {
    // `INSERT … RETURNING` có `stmt.reader === true` nên guard của driver KHÔNG thấy nó —
    // đây chính là chỗ chứng minh lớp thứ hai tồn tại và cần thiết.
    await expect(
      withConnection(
        async (c) => {
          for await (const _ of c.execute({
            sql: `INSERT INTO country (country_id, country) VALUES (500, 'Test') RETURNING country_id`,
          })) {
            /* chờ lỗi từ chính SQLite */
          }
        },
        { ...profile, readOnly: true },
      ),
    ).rejects.toMatchObject({ code: 'READ_ONLY' })
  })

  it('cột NUMERIC bị SQLite hạ thành REAL → trả {k:num}, KHÔNG giả vờ chính xác', async () => {
    const cell = await withConnection(async (c) => {
      const chunks = []
      for await (const ch of c.execute({ sql: `SELECT numeric_val FROM types_probe WHERE id = 1` })) {
        chunks.push(ch)
      }
      return chunks.flatMap((ch) => ch.rows)[0]
    })

    // Giới hạn THẬT của engine, không phải lỗi driver: affinity NUMERIC của SQLite đổi
    // '12345678901234567890.0123456789' sang REAL ngay lúc INSERT, nên chữ số đã mất trước
    // khi driver thấy giá trị. Trả {k:'big'} lúc này sẽ nói với UI rằng giá trị chính xác,
    // và người dùng có thể ra quyết định trên một con số đã bị làm tròn.
    // Muốn số thập phân chính xác trên SQLite thì phải lưu ở cột TEXT.
    const value = (cell as Array<{ k: string; v: unknown }>)[0]
    expect(value?.k).toBe('num')
    expect(String(value?.v)).not.toContain('12345678901234567890')
  })

  it('bảng nội bộ sqlite_* không lọt vào danh sách object', async () => {
    const objects = await withConnection((c) => c.introspect.listObjects({}))
    expect(objects.some((o) => o.name.startsWith('sqlite_'))).toBe(false)
  })

  it('listDatabases trả về main (từ pragma_database_list), không trả temp', async () => {
    const dbs = await withConnection((c) => c.introspect.listDatabases())
    expect(dbs).toContain('main')
    expect(dbs).not.toContain('temp')
  })

  it('INTEGER PRIMARY KEY AUTOINCREMENT được nhận là khoá chính tự tăng', async () => {
    const meta = await withConnection((c) => c.introspect.getTableMeta({ table: 'country' }))
    const pk = meta.columns.find((col) => col.name === 'country_id')
    expect(pk?.isPrimaryKey).toBe(true)
    // SQLite không tạo index riêng cho INTEGER PRIMARY KEY; nếu không bù thì mọi bảng dùng
    // khoá tự tăng đều báo "không có primary key".
    expect(pk?.isAutoIncrement).toBe(true)
    expect(meta.indexes.some((i) => i.primary)).toBe(true)
  })

  it('mở tệp không tồn tại KHÔNG tạo tệp mới', async () => {
    const missing = path.join(os.tmpdir(), `corvus-khong-ton-tai-${process.pid}.db`)
    fs.rmSync(missing, { force: true })
    await expect(sqliteDriver.connect({ ...profile, database: missing })).rejects.toMatchObject({
      name: 'CorvusError',
    })
    // Gõ sai đường dẫn phải là lỗi, không phải "tạo im lặng một database rỗng" rồi để
    // người dùng tưởng dữ liệu của mình biến mất.
    expect(fs.existsSync(missing)).toBe(false)
  })
})

/**
 * Hai lỗi tìm ra khi rà soát 2026-08-19, ghim lại bằng test:
 *  - `objects.trigger` / `objects.index` khai `true` nhưng `listObjects` lọc
 *    `type IN ('table','view')` → nhánh Triggers trong UI luôn rỗng
 *  - `opts.database` được nhận rồi bỏ qua hoàn toàn, trong khi `listDatabases()` trả về cả
 *    tệp đã ATTACH → metadata của database khác bị lấy từ `main`
 */
