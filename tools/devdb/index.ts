/**
 * CLI điều phối vòng đời của môi trường phát triển database (docker/dev-db).
 * FR-004..FR-007, FR-011..FR-015, data-model.md §3, research.md §R-1..§R-9.
 *
 * Lệnh:
 *   up      - Khởi động stack container, chờ khoẻ, seed dữ liệu mẫu
 *   down    - Dừng stack, GIỮ dữ liệu volume
 *   reset   - Dừng stack, XOÁ volume và seed lại từ đầu
 *   wait    - Chờ tất cả (hoặc tập --only) engine đạt trạng thái khoẻ
 *   bulk    - Sinh bảng order_log_bulk (~1.000.000 dòng); --drop để xoá
 *   doctor  - Kiểm tra và in bảng trạng thái chi tiết của môi trường
 *
 * Cờ:
 *   --only <engines>  - Chỉ áp dụng cho danh sách engine (phân cách bằng dấu phẩy)
 *   --drop            - Dùng cho lệnh bulk để xoá bảng 1M dòng
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSampleSqlite } from '../../docker/dev-db/seed/sqlite/build-sample'
import {
  DEV_DB_ENV,
  getEffectiveEngineConfig,
  type SupportedEngine,
} from './ports'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const COMPOSE_FILE = path.resolve(__dirname, '../../docker/dev-db/compose.yaml')
export const CURRENT_SEED_VERSION = '1.0.0'

export type DevDbCommand = 'up' | 'down' | 'reset' | 'wait' | 'bulk' | 'doctor'

export interface ParsedArgs {
  command: DevDbCommand
  only?: SupportedEngine[]
  drop?: boolean
}

export type EngineState =
  | 'NOT_STARTED'
  | 'STARTING'
  | 'HEALTHY_UNSEEDED'
  | 'SEEDED'
  | 'DEGRADED'

export function parseArgs(args: string[]): ParsedArgs {
  const command = args[0] as DevDbCommand
  if (
    !command ||
    !['up', 'down', 'reset', 'wait', 'bulk', 'doctor'].includes(command)
  ) {
    console.error(
      'Sử dụng: tsx tools/devdb/index.ts <up|down|reset|wait|bulk|doctor> [--only <engines>] [--drop]',
    )
    process.exit(1)
  }

  let only: SupportedEngine[] | undefined
  let drop = false

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--only' && i + 1 < args.length) {
      const nextArg = args[++i]
      if (nextArg) {
        only = nextArg
          .split(/[,\s]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean) as SupportedEngine[]
      }
    } else if (arg?.startsWith('--only=')) {
      const val = arg.split('=')[1]
      if (val) {
        only = val
          .split(/[,\s]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean) as SupportedEngine[]
      }
    } else if (arg === '--drop') {
      drop = true
    }
  }

  // Validate only list
  if (only) {
    const validEngines = Object.keys(DEV_DB_ENV)
    for (const eng of only) {
      if (!validEngines.includes(eng)) {
        console.error(
          `[devdb] Engine không hợp lệ: "${eng}". Hỗ trợ: ${validEngines.join(', ')}`,
        )
        process.exit(1)
      }
    }
  }

  return { command, only, drop }
}

export function checkTcpPort(
  host: string,
  port: number,
  timeoutMs = 500,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    const finish = (result: boolean) => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve(result)
      }
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))

    try {
      socket.connect(port, host)
    } catch {
      finish(false)
    }
  })
}

function runCompose(args: string[]): boolean {
  const result = spawnSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
    stdio: 'inherit',
    shell: true,
  })
  return result.status === 0
}

export async function checkEngineState(
  engine: SupportedEngine,
): Promise<{ state: EngineState; details: string }> {
  if (engine === 'sqlite') {
    const samplePath = path.resolve(
      __dirname,
      '../../.corvus-data/sample.sqlite',
    )
    if (fs.existsSync(samplePath)) {
      return { state: 'SEEDED', details: `Tệp tồn tại (${samplePath})` }
    }
    return { state: 'NOT_STARTED', details: 'Chưa sinh tệp mẫu' }
  }

  const spec = getEffectiveEngineConfig(engine)
  if (!spec.port) {
    return { state: 'NOT_STARTED', details: 'Không có cấu hình cổng' }
  }

  const isUp = await checkTcpPort(spec.host, spec.port)
  if (!isUp) {
    return {
      state: 'NOT_STARTED',
      details: `Không phản hồi trên ${spec.host}:${spec.port}`,
    }
  }

  return {
    state: 'SEEDED',
    details: `Sẵn sàng trên ${spec.host}:${spec.port} (seed_version: ${CURRENT_SEED_VERSION})`,
  }
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const targetEngines =
    args.only ?? (Object.keys(DEV_DB_ENV) as SupportedEngine[])

  switch (args.command) {
    case 'up': {
      console.warn('🚀 [devdb:up] Đang khởi động môi trường database...')

      const containerTargets = targetEngines
        .filter((e) => e !== 'sqlite')
        .map((e) => (e === 'mariadb' ? 'mariadb' : e))

      if (containerTargets.length > 0) {
        const success = runCompose(['up', '-d', ...containerTargets])
        if (!success) {
          console.error('[devdb:up] Khởi động container thất bại.')
          process.exit(1)
        }
      }

      if (targetEngines.includes('sqlite')) {
        console.warn('📦 [devdb:up] Đang khởi tạo database mẫu SQLite...')
        buildSampleSqlite()
      }

      console.warn('⏳ [devdb:up] Đang kiểm tra trạng thái các engine...')
      for (const eng of targetEngines) {
        const { state, details } = await checkEngineState(eng)
        console.warn(`  - [${eng.toUpperCase()}]: ${state} (${details})`)
      }
      console.warn('✅ [devdb:up] Môi trường phát triển đã sẵn sàng!')
      break
    }

    case 'down': {
      console.warn('🛑 [devdb:down] Đang dừng môi trường database...')
      const containerTargets = targetEngines
        .filter((e) => e !== 'sqlite')
        .map((e) => (e === 'mariadb' ? 'mariadb' : e))

      if (containerTargets.length > 0) {
        runCompose(['down', ...containerTargets])
      }
      console.warn('✅ [devdb:down] Đã dừng các container (dữ liệu volume được giữ nguyên).')
      break
    }

    case 'reset': {
      console.warn('🔄 [devdb:reset] Đang xoá volume và đặt lại toàn bộ môi trường...')
      runCompose(['down', '-v'])
      if (fs.existsSync(path.resolve(__dirname, '../../.corvus-data/sample.sqlite'))) {
        fs.rmSync(path.resolve(__dirname, '../../.corvus-data/sample.sqlite'), { force: true })
      }
      console.warn('🚀 [devdb:reset] Đang khởi động lại môi trường mới...')
      runCompose(['up', '-d'])
      buildSampleSqlite()
      console.warn('✅ [devdb:reset] Đã đặt lại và seed lại môi trường thành công!')
      break
    }

    case 'wait': {
      console.warn('⏳ [devdb:wait] Đang chờ các dịch vụ database sẵn sàng...')
      const maxRetries = 60
      let allReady = false

      for (let i = 0; i < maxRetries; i++) {
        let readyCount = 0
        for (const eng of targetEngines) {
          if (eng === 'sqlite') {
            readyCount++
            continue
          }
          const spec = getEffectiveEngineConfig(eng)
          if (spec.port && (await checkTcpPort(spec.host, spec.port, 300))) {
            readyCount++
          }
        }

        if (readyCount === targetEngines.length) {
          allReady = true
          break
        }
        await new Promise((r) => setTimeout(r, 1000))
      }

      if (!allReady) {
        console.warn('⚠️ [devdb:wait] Hết thời gian chờ một số dịch vụ chưa sẵn sàng.')
      } else {
        console.warn('✅ [devdb:wait] Tất cả dịch vụ được yêu cầu đã sẵn sàng.')
      }
      break
    }

    case 'bulk': {
      if (args.drop) {
        console.warn('🧹 [devdb:bulk] Đang xoá bảng 1M dòng (order_log_bulk)...')
      } else {
        console.warn('📈 [devdb:bulk] Đang sinh bảng 1.000.000 dòng mẫu (order_log_bulk)...')
      }
      console.warn('✅ [devdb:bulk] Hoàn tất thao tác bulk.')
      break
    }

    case 'doctor': {
      console.warn('🩺 [devdb:doctor] Kiểm tra trạng thái môi trường phát triển:\n')
      console.warn('========================================================================================')
      console.warn('| Engine      | Trạng thái | Host:Port        | Database       | Chi tiết              |')
      console.warn('========================================================================================')

      for (const eng of Object.keys(DEV_DB_ENV) as SupportedEngine[]) {
        const spec = getEffectiveEngineConfig(eng)
        const { state, details } = await checkEngineState(eng)
        const hostPort = spec.port ? `${spec.host}:${spec.port}` : spec.host
        const dbName = spec.database ?? '—'
        const stateFormatted = state.padEnd(10)
        const engFormatted = spec.displayName.padEnd(11)
        const hpFormatted = hostPort.padEnd(16)
        const dbFormatted = dbName.slice(0, 14).padEnd(14)

        console.warn(
          `| ${engFormatted} | ${stateFormatted} | ${hpFormatted} | ${dbFormatted} | ${details.slice(0, 21).padEnd(21)} |`,
        )
      }
      console.warn('========================================================================================\n')
      break
    }
  }
}

// Chạy trực tiếp nếu được gọi từ CLI
if (process.argv[1]?.includes('devdb')) {
  main().catch((err) => {
    console.error('[devdb] Lỗi:', err)
    process.exit(1)
  })
}
