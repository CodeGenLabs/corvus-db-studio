import { describe, expect, it } from 'vitest'
import type { ConnectionProfile } from '@corvus/contract'
import { openInMemoryWorkspace } from '../open'

const profile: ConnectionProfile = {
  id: 'c1',
  name: 'Prod PG',
  driverId: 'postgres',
  host: 'db.internal',
  port: 5432,
  database: 'app',
  user: 'corvus',
  readOnly: true,
}

describe('WorkspaceStorage trên SQLite thật', () => {
  it('migration chạy được và tạo đủ bảng', () => {
    const ws = openInMemoryWorkspace()
    try {
      const tables = ws.db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all() as Array<{ name: string }>
      const names = tables.map((t) => t.name)
      expect(names).toContain('connection')
      expect(names).toContain('setting')
      expect(names).toContain('schema_migration')
    } finally {
      ws.close()
    }
  })

  it('round-trip connection profile', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.upsertConnection('owner-1', profile)
      const got = ws.storage.getConnection('c1')
      expect(got).toMatchObject({
        id: 'c1',
        name: 'Prod PG',
        driverId: 'postgres',
        host: 'db.internal',
        port: 5432,
        readOnly: true,
      })
      expect(ws.storage.listConnections('owner-1')).toHaveLength(1)
    } finally {
      ws.close()
    }
  })

  it('upsert cập nhật thay vì tạo bản ghi thứ hai', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.upsertConnection('owner-1', profile)
      ws.storage.upsertConnection('owner-1', { ...profile, name: 'Đổi tên' })
      const all = ws.storage.listConnections('owner-1')
      expect(all).toHaveLength(1)
      expect(all[0]?.name).toBe('Đổi tên')
    } finally {
      ws.close()
    }
  })

  it('tự động tạo vgroup khi lưu connection có group', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.upsertConnection('owner-1', {
        ...profile,
        id: 'c-with-group',
        group: 'Docker Dev Stack',
      })
      const got = ws.storage.getConnection('c-with-group')
      expect(got?.group).toBe('Docker Dev Stack')
      const list = ws.storage.listConnections('owner-1')
      expect(list.find((c) => c.id === 'c-with-group')?.group).toBe('Docker Dev Stack')
    } finally {
      ws.close()
    }
  })

  it('KHÔNG bao giờ ghi mật khẩu vào workspace.db', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      const withSecrets = {
        ...profile,
        password: 'SENTINEL_PASSWORD_MUST_NOT_PERSIST',
        passphrase: 'SENTINEL_PASSPHRASE',
        privateKey: 'SENTINEL_KEY',
      } as ConnectionProfile
      ws.storage.upsertConnection('owner-1', withSecrets)

      // Quét toàn bộ nội dung bảng, không chỉ trường ta nghĩ tới.
      const rows = ws.db.prepare('SELECT * FROM connection').all()
      const dump = JSON.stringify(rows)
      expect(dump).not.toContain('SENTINEL_PASSWORD_MUST_NOT_PERSIST')
      expect(dump).not.toContain('SENTINEL_PASSPHRASE')
      expect(dump).not.toContain('SENTINEL_KEY')
    } finally {
      ws.close()
    }
  })

  it('deleteConnection trả về true/false đúng', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.upsertConnection('owner-1', profile)
      expect(ws.storage.deleteConnection('c1')).toBe(true)
      expect(ws.storage.deleteConnection('c1')).toBe(false)
      expect(ws.storage.getConnection('c1')).toBeUndefined()
    } finally {
      ws.close()
    }
  })

  it('setting round-trip và trả default khi chưa có', () => {
    const ws = openInMemoryWorkspace()
    try {
      expect(ws.storage.getSetting('owner-1', 'theme', 'light')).toBe('light')
      ws.storage.setSetting('owner-1', 'theme', 'dark')
      expect(ws.storage.getSetting('owner-1', 'theme', 'light')).toBe('dark')
    } finally {
      ws.close()
    }
  })

  it('migration idempotent: gọi initialize lần hai không lỗi và giữ dữ liệu', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.upsertConnection('owner-1', profile)
      expect(() => ws.storage.initialize()).not.toThrow()
      expect(ws.storage.getConnection('c1')).toBeDefined()
    } finally {
      ws.close()
    }
  })

  it('upsertConnection với owner không tồn tại báo lỗi CÓ NGHĨA, không phải SqliteError thô', () => {
    const ws = openInMemoryWorkspace()
    try {
      expect(() => ws.storage.upsertConnection('owner-khong-ton-tai', profile)).toThrowError(
        /owner .* chưa tồn tại/,
      )
    } finally {
      ws.close()
    }
  })

  it('ensureUser idempotent và ensureLocalOwner tạo owner mặc định', () => {
    const ws = openInMemoryWorkspace()
    try {
      ws.storage.ensureUser('owner-1')
      ws.storage.ensureUser('owner-1')
      const id = ws.storage.ensureLocalOwner()
      expect(id).toBe('local-owner')
      const rows = ws.db.prepare('SELECT id FROM app_user ORDER BY id').all() as Array<{ id: string }>
      expect(rows.map((r) => r.id)).toEqual(['local-owner', 'owner-1'])
    } finally {
      ws.close()
    }
  })
})
