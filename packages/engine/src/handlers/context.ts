import { corvusError } from '@corvus/contract'
import type { ConnectionProfile } from '@corvus/contract'
import { getDriver } from '@corvus/driver-core'
import type { DriverConnection, ResolvedProfile } from '@corvus/driver-core'
import type { SecretVault } from '@corvus/storage'
import type { SessionManager } from '../session'

/**
 * Nơi lưu profile kết nối. Tách thành interface để engine không phụ thuộc trực tiếp
 * vào `workspace.db` — test dùng bản in-memory, production dùng bản SQLite.
 */
export interface ConnectionStore {
  list(ownerId: string): Promise<ConnectionProfile[]>
  get(id: string): Promise<ConnectionProfile | undefined>
}

/** Mọi thứ handler cần để làm việc. Truyền một lần khi đăng ký handler. */
export interface HandlerDeps {
  sessions: SessionManager
  connections: ConnectionStore
  vault: SecretVault
}

/**
 * Mở (hoặc lấy lại) kết nối thật cho một profile.
 *
 * Secret chỉ rời vault ở đây để đi thẳng vào driver — không đi qua bất kỳ RPC result nào
 * (security.md §2, bất biến 1).
 */
export async function resolveConnection(
  deps: HandlerDeps,
  connectionId: string,
  ownerId: string,
): Promise<DriverConnection> {
  const existing = deps.sessions.getSession(connectionId)
  if (existing) {
    deps.sessions.touchSession(connectionId)
    return existing.connection
  }

  const profile = await deps.connections.get(connectionId)
  if (!profile) {
    throw corvusError('NOT_FOUND', `Không tìm thấy kết nối '${connectionId}'`)
  }

  const driver = getDriver(profile.driverId)
  if (!driver) {
    throw corvusError(
      'UNSUPPORTED_FEATURE',
      `Chưa hỗ trợ engine '${profile.driverId}'`,
      { i18nKey: 'error.driverNotRegistered' },
    )
  }

  const password = await deps.vault.get({
    kind: 'db-password',
    ownerId,
    connectionId,
  })

  const resolved: ResolvedProfile = { ...profile, password }
  const session = await deps.sessions.createSession(connectionId, driver, resolved)
  return session.connection
}

/**
 * Lấy profile đã lưu, ném NOT_FOUND nếu không có.
 *
 * Handler cần profile (không chỉ cần connection) để biết `readOnly` — bản trước chỉ có
 * `resolveConnection()` nên `query.execute` không có cách nào biết connection đang ở chế độ
 * chỉ đọc, và một `DELETE` đi qua trót lọt (security.md §5).
 */
export async function requireProfile(
  deps: HandlerDeps,
  connectionId: string,
): Promise<ConnectionProfile> {
  const profile = await deps.connections.get(connectionId)
  if (!profile) {
    throw corvusError('NOT_FOUND', `Không tìm thấy kết nối '${connectionId}'`)
  }
  return profile
}

/** Ghép profile chưa lưu (từ dialog "Test") thành ResolvedProfile để thử kết nối. */
export function draftToResolvedProfile(
  draft: Partial<ConnectionProfile> & { password?: string },
): ResolvedProfile {
  if (!draft.driverId) {
    throw corvusError('INVALID_INPUT', 'Thiếu driverId')
  }
  return {
    id: draft.id ?? 'draft',
    name: draft.name ?? 'draft',
    driverId: draft.driverId,
    host: draft.host,
    port: draft.port,
    database: draft.database,
    user: draft.user,
    ssl: draft.ssl,
    ssh: draft.ssh,
    readOnly: draft.readOnly,
    password: draft.password,
  }
}
