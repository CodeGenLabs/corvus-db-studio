import path from 'node:path'
import { registerDriver, driverRegistry } from '@corvus/driver-core'
import { postgresDriver } from '@corvus/driver-postgres'
import { sqliteDriver } from '@corvus/driver-sqlite'
import { mysqlDriver } from '@corvus/driver-mysql'
import { mssqlDriver } from '@corvus/driver-mssql'
import { oracleDriver } from '@corvus/driver-oracle'
import { mongoDriver } from '@corvus/driver-mongodb'
import { redisDriver } from '@corvus/driver-redis'
import {
  EngineRouter,
  SessionManager,
  registerHandlers,
  type ConnectionStore,
} from '@corvus/engine'
import { EnvelopeVault, openWorkspace, type SecretVault, type WorkspaceStorage } from '@corvus/storage'

/**
 * Dựng engine thật cho bản web: workspace SQLite + vault + driver + router có handler.
 *
 * Trước đây `apps/web/server` dùng một `mockRouter` trả `{ok:true, method, params}` với
 * comment "until @corvus/engine is linked in T-018" (audit 2026-08-18). Đây là phần nối thật.
 */
export interface BuiltEngine {
  router: EngineRouter
  sessions: SessionManager
  storage: WorkspaceStorage
  ownerId: string
  close(): Promise<void>
}

function resolveMasterKey(): string {
  const key = process.env.CORVUS_MASTER_KEY
  if (key) return key

  if (process.env.NODE_ENV === 'production') {
    // packaging-release.md §3: production PHẢI có master key. Tự sinh khoá tạm sẽ làm
    // mất toàn bộ secret ở lần restart sau — hỏng âm thầm, tệ hơn là không chạy.
    throw new Error(
      'Thiếu CORVUS_MASTER_KEY. Server từ chối khởi động để không làm mất secret ở lần restart sau.',
    )
  }
  // Dev: khoá cố định, KHÔNG dùng cho dữ liệu thật.
  return '0'.repeat(64)
}

export function buildEngine(): BuiltEngine {
  const dataDir = process.env.CORVUS_DATA_DIR ?? path.join(process.cwd(), '.corvus-data')
  const workspace = openWorkspace({ path: path.join(dataDir, 'workspace.db') })

  // Bản web sẽ có nhiều user (SPEC-15 FR-15.32); tới khi có đăng nhập thì dùng owner cục bộ.
  const ownerId = workspace.storage.ensureLocalOwner()

  if (!driverRegistry.has('postgres')) registerDriver(postgresDriver)
  if (!driverRegistry.has('sqlite')) registerDriver(sqliteDriver)
  if (!driverRegistry.has('mysql')) registerDriver(mysqlDriver)
  if (!driverRegistry.has('mssql')) registerDriver(mssqlDriver)
  if (!driverRegistry.has('oracle')) registerDriver(oracleDriver)
  if (!driverRegistry.has('mongodb')) registerDriver(mongoDriver)
  if (!driverRegistry.has('redis')) registerDriver(redisDriver)

  // PHẢI truyền db: không có nó EnvelopeVault chỉ giữ trong RAM và secret mất sau mỗi
  // lần restart — hỏng âm thầm, người dùng phải nhập lại mật khẩu mà không hiểu vì sao.
  const vault: SecretVault = new EnvelopeVault(resolveMasterKey(), workspace.db)

  const connections: ConnectionStore = {
    async list(owner) {
      return workspace.storage.listConnections(owner)
    },
    async get(id) {
      return workspace.storage.getConnection(id)
    },
  }

  const sessions = new SessionManager()
  const router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })

  return {
    router,
    sessions,
    storage: workspace.storage,
    ownerId,
    close: async () => {
      await sessions.closeAll()
      workspace.close()
    },
  }
}
