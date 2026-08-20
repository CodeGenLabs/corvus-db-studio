import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DriverConnection, ResolvedProfile } from '@corvus/driver-core'
import { sqliteDriver } from './index'

/**
 * Hai lỗi tìm ra khi rà soát 2026-08-19, ghim lại bằng test:
 *
 *  1. `capabilities.objects.trigger` và `.index` khai `true` nhưng `listObjects` lọc
 *     `type IN ('table','view')` → UI hiện nhánh "Triggers" rồi luôn rỗng, kể cả trên
 *     database có trigger thật.
 *  2. `opts.database` được nhận rồi **bỏ qua hoàn toàn** trong khi `listDatabases()` trả về
 *     cả tệp đã `ATTACH` → metadata của database thứ hai bị lấy từ `main`. Nếu hai database
 *     có bảng trùng tên, người dùng sửa dữ liệu dựa trên lược đồ của bảng KHÁC.
 *
 * Cả bộ này dùng MỘT kết nối duy nhất: `ATTACH` chỉ tồn tại trong phạm vi một kết nối, mở
 * kết nối mới là mất. Đó cũng chính là lý do `opts.database` chỉ có nghĩa trong một session.
 */
const mainFile = path.join(os.tmpdir(), `corvus-scope-main-${process.pid}.db`)
const otherFile = path.join(os.tmpdir(), `corvus-scope-other-${process.pid}.db`)

const scopeProfile: ResolvedProfile = {
  id: 'scope',
  name: 'scope',
  driverId: 'sqlite',
  database: mainFile,
}

let conn: DriverConnection

async function run(sql: string): Promise<void> {
  for await (const _ of conn.execute({ sql })) {
    /* DDL không trả dòng nào */
  }
}

beforeAll(async () => {
  for (const f of [mainFile, otherFile]) {
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, '')
  }

  conn = await sqliteDriver.connect(scopeProfile)

  // Đường dẫn Windows dùng dấu gạch chéo ngược; đổi sang '/' để không phải escape trong SQL.
  const attachPath = otherFile.split(String.fromCharCode(92)).join('/')

  for (const sql of [
    'CREATE TABLE hang_hoa (id INTEGER PRIMARY KEY, ten TEXT)',
    'CREATE INDEX hang_hoa_ten_idx ON hang_hoa (ten)',
    'CREATE TRIGGER hang_hoa_ghi_log AFTER INSERT ON hang_hoa BEGIN SELECT 1; END',
    'CREATE VIEW hang_hoa_view AS SELECT id FROM hang_hoa',
    `ATTACH DATABASE '${attachPath}' AS kho_phu`,
    // CÙNG TÊN BẢNG nhưng khác cột — đây đúng là cái bẫy mà bản cũ mắc phải.
    'CREATE TABLE kho_phu.hang_hoa (ma_khac INTEGER PRIMARY KEY, gia REAL, ghi_chu TEXT)',
  ]) {
    await run(sql)
  }
})

afterAll(async () => {
  await conn?.close()
  for (const f of [mainFile, otherFile]) fs.rmSync(f, { force: true })
})

describe('driver-sqlite · liệt kê trigger và index', () => {
  it('listObjects trả về trigger — capability objects.trigger không còn là lời hứa rỗng', async () => {
    const triggers = await conn.introspect.listObjects({ kind: 'trigger' })
    expect(triggers.map((o) => o.name)).toEqual(['hang_hoa_ghi_log'])
  })

  it('listObjects trả về index của người dùng, KHÔNG trả index ngầm sqlite_*', async () => {
    const indexes = await conn.introspect.listObjects({ kind: 'index' })
    expect(indexes.map((o) => o.name)).toContain('hang_hoa_ten_idx')
    expect(indexes.some((o) => o.name.startsWith('sqlite_'))).toBe(false)
  })

  it('mọi kind khai `true` trong capability đều liệt kê được', async () => {
    // Chống hồi quy cho đúng loại lỗi đã tìm ra: khai capability mà hiện thực không có.
    const kinds = new Set((await conn.introspect.listObjects({})).map((o) => o.kind))
    for (const kind of ['table', 'view', 'trigger', 'index'] as const) {
      if (conn.capabilities.objects[kind]) {
        expect(kinds.has(kind), `capability objects.${kind} = true nhưng listObjects không trả`).toBe(
          true,
        )
      }
    }
  })
})

describe('driver-sqlite · phạm vi database (ATTACH)', () => {
  it('listDatabases thấy database đã ATTACH', async () => {
    expect(await conn.introspect.listDatabases()).toEqual(
      expect.arrayContaining(['main', 'kho_phu']),
    )
  })

  it('getTableMeta đọc ĐÚNG database được yêu cầu, không lấy bảng trùng tên ở main', async () => {
    const inMain = await conn.introspect.getTableMeta({ table: 'hang_hoa' })
    const inOther = await conn.introspect.getTableMeta({ database: 'kho_phu', table: 'hang_hoa' })

    expect(inMain.columns.map((c) => c.name)).toEqual(['id', 'ten'])
    // Nếu `opts.database` bị bỏ qua (bản cũ), dòng dưới trả về ['id','ten'] — nghĩa là người
    // dùng sẽ sửa dữ liệu của kho_phu dựa trên lược đồ của main.
    expect(inOther.columns.map((c) => c.name)).toEqual(['ma_khac', 'gia', 'ghi_chu'])
  })

  it('listObjects theo database chỉ trả object của database đó', async () => {
    const other = await conn.introspect.listObjects({ database: 'kho_phu' })
    expect(other.map((o) => o.name)).toEqual(['hang_hoa'])
    expect(other.some((o) => o.kind === 'trigger')).toBe(false)
  })

  it('getDdl theo database trả DDL của đúng bảng đó', async () => {
    const ddl = await conn.introspect.getDdl({
      database: 'kho_phu',
      name: 'hang_hoa',
      kind: 'table',
    })
    expect(ddl).toContain('ma_khac')
    expect(ddl).not.toContain('ten TEXT')
  })

  it('database không tồn tại → NOT_FOUND, KHÔNG âm thầm rơi về main', async () => {
    await expect(
      conn.introspect.getTableMeta({ database: 'khong_co', table: 'hang_hoa' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('tên database lạ không thoát ra thành SQL — allowlist chặn trước khi quote', async () => {
    await expect(
      conn.introspect.listObjects({ database: `main"; DROP TABLE hang_hoa; --` }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    // Bảng phải còn nguyên (TM-6: injection qua tên object).
    const tables = await conn.introspect.listObjects({ kind: 'table' })
    expect(tables.map((o) => o.name)).toContain('hang_hoa')
  })
})
