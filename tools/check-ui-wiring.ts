/**
 * Cổng kiểm tra độ phủ đấu nối giao diện (UI Wiring Ratchet) — contracts/command-registry.md §6.
 *
 * Kiểm tra:
 *   1. UI_WIRING_DEBT <= MAX_UI_WIRING_DEBT (Khởi điểm: 46, chỉ được giảm)
 *   2. SURFACE_DEBT <= MAX_SURFACE_DEBT     (Khởi điểm: 11, chỉ được giảm)
 *   3. Mọi RPC method trong cmd.rpc phải tồn tại trong @corvus/contract
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { METHODS } from '../packages/contract/src/index'
import { commandRegistry } from '../packages/ui/src/commands/registry'
import type { Surface } from '../packages/ui/src/commands/types'

// Khởi điểm nợ tối đa cho phép (ratchet: chỉ được giảm khi hoàn thành US4 và US2)
const MAX_UI_WIRING_DEBT = 46
const MAX_SURFACE_DEBT = 11

const CTX_SURFACES: Surface[] = [
  'ctx-nav',
  'ctx-object-list',
  'ctx-data-grid',
  'ctx-sql-editor',
  'ctx-query-builder',
  'ctx-er-diagram',
  'ctx-tab-bar',
  'ctx-toolbar',
  'ctx-snippet',
  'ctx-job-list',
  'ctx-diff',
]

const totalMethods = Object.keys(METHODS).length
if (totalMethods === 0) {
  console.error('[check-ui-wiring] Không tìm thấy method nào trong @corvus/contract')
  process.exit(1)
}

// 1. Quét source packages/ui để tìm các method trong @corvus/contract được gọi trong UI
function walk(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((e) => {
      const p = join(dir, e)
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') || p.endsWith('.tsx') ? [p] : []
    })
  } catch {
    return []
  }
}

const uiSrc = resolve(process.cwd(), 'packages/ui/src')
const uiFiles = walk(uiSrc)
const wiredInUiCode = new Set<string>()
const methodKeys = Object.keys(METHODS)

for (const file of uiFiles) {
  const content = readFileSync(file, 'utf-8')
  for (const method of methodKeys) {
    if (
      content.includes(`'${method}'`) ||
      content.includes(`"${method}"`) ||
      content.includes(`\`${method}\``)
    ) {
      wiredInUiCode.add(method)
    }
  }
}

// 2. Thu thập RPC methods được đăng ký trong CommandRegistry
const wiredInRegistry = new Set<string>()
const registeredCommands = commandRegistry.all()

for (const cmd of registeredCommands) {
  for (const rpc of cmd.rpc) {
    if (rpc in METHODS) {
      wiredInRegistry.add(rpc)
    } else {
      console.error(`[check-ui-wiring] Lỗi: Command "${cmd.id}" khai báo rpc "${rpc}" không tồn tại trong @corvus/contract`)
      process.exit(1)
    }
  }
}

const allWiredMethods = new Set([...wiredInUiCode, ...wiredInRegistry])
const currentWiringDebt = totalMethods - allWiredMethods.size

// 3. Tính SURFACE_DEBT (số bề mặt context menu chưa có lệnh nào)
let coveredSurfaces = 0
for (const surface of CTX_SURFACES) {
  const cmds = commandRegistry.commandsFor(surface)
  if (cmds.length > 0) {
    coveredSurfaces++
  }
}
const currentSurfaceDebt = CTX_SURFACES.length - coveredSurfaces

console.log('🔍 Kiểm tra độ phủ đấu nối giao diện (UI Wiring Ratchet):')
console.log(`  - Tổng số RPC methods: ${totalMethods}`)
console.log(`  - Số methods đã nối UI: ${allWiredMethods.size} (${wiredInRegistry.size} qua Registry, ${wiredInUiCode.size} trong code UI)`)
console.log(`  - UI_WIRING_DEBT: ${currentWiringDebt} (Giới hạn tối đa: ${MAX_UI_WIRING_DEBT})`)
console.log(`  - SURFACE_DEBT: ${currentSurfaceDebt}/${CTX_SURFACES.length} (Giới hạn tối đa: ${MAX_SURFACE_DEBT})`)

let failed = false

if (currentWiringDebt > MAX_UI_WIRING_DEBT) {
  console.error(`❌ [check-ui-wiring] THẤT BẠI: UI_WIRING_DEBT (${currentWiringDebt}) vượt quá giới hạn ratchet (${MAX_UI_WIRING_DEBT})!`)
  failed = true
}

if (currentSurfaceDebt > MAX_SURFACE_DEBT) {
  console.error(`❌ [check-ui-wiring] THẤT BẠI: SURFACE_DEBT (${currentSurfaceDebt}) vượt quá giới hạn ratchet (${MAX_SURFACE_DEBT})!`)
  failed = true
}

if (failed) {
  process.exit(1)
}

console.log('✅ UI Wiring Ratchet đạt yêu cầu.')
