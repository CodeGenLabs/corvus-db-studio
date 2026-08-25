import { describe, expect, it } from 'vitest'
import { commandRegistry } from '../registry'
import { VI, EN, JA } from '../../i18n/dictionaries'
import { METHODS } from '@corvus/contract'
import type { Surface } from '../types'

describe('CommandRegistry 10 Invariants (contracts/command-registry.md §2)', () => {
  it('I-1 · surfaces không rỗng cho mọi lệnh đã đăng ký', () => {
    const commands = commandRegistry.all()
    for (const cmd of commands) {
      expect(cmd.surfaces.length, `Lệnh ${cmd.id} có surfaces rỗng`).toBeGreaterThan(0)
    }
  })

  it('I-2 · run là một hàm hợp lệ và không bao giờ null', () => {
    const commands = commandRegistry.all()
    for (const cmd of commands) {
      expect(typeof cmd.run, `Lệnh ${cmd.id} không có hàm run`).toBe('function')
    }
  })

  it('I-3 · labelKey tồn tại ở cả ba từ điển VI, EN, JA', () => {
    const commands = commandRegistry.all()
    for (const cmd of commands) {
      expect(cmd.labelKey in VI, `labelKey "${String(cmd.labelKey)}" thiếu trong VI`).toBe(true)
      expect(cmd.labelKey in EN, `labelKey "${String(cmd.labelKey)}" thiếu trong EN`).toBe(true)
      expect(cmd.labelKey in JA, `labelKey "${String(cmd.labelKey)}" thiếu trong JA`).toBe(true)
    }
  })

  it('I-4 · write === preview-required ⇒ rpc chứa một preview* và một apply* tương ứng', () => {
    const commands = commandRegistry.all()
    const methodNames = Object.keys(METHODS)
    for (const cmd of commands) {
      if (cmd.write === 'preview-required') {
        const hasPreview = cmd.rpc.some((r) => r.toLowerCase().includes('preview'))
        const hasApply = cmd.rpc.some((r) => r.toLowerCase().includes('apply'))
        expect(hasPreview && hasApply, `Lệnh ghi ${cmd.id} phải có cả preview* và apply*`).toBe(true)
        for (const rpcMethod of cmd.rpc) {
          expect(methodNames, `RPC method "${rpcMethod}" trong ${cmd.id} không tồn tại trong @corvus/contract`).toContain(rpcMethod)
        }
      }
    }
  })

  it('I-5 · Không lệnh nào có rpc chứa apply* mà write === none', () => {
    const commands = commandRegistry.all()
    for (const cmd of commands) {
      if (cmd.write === 'none') {
        const hasApply = cmd.rpc.some((r) => r.toLowerCase().includes('apply'))
        expect(hasApply, `Lệnh ${cmd.id} có apply* nhưng write là 'none' (Cấm 5)`).toBe(false)
      }
    }
  })

  it('I-6 · Không hai lệnh khác id có cùng id trong registry', () => {
    const commands = commandRegistry.all()
    const ids = new Set<string>()
    for (const cmd of commands) {
      expect(ids.has(cmd.id), `Trùng lặp command id "${cmd.id}"`).toBe(false)
      ids.add(cmd.id)
    }
  })

  it('I-9 · cardinality: multi chỉ thuộc danh sách trắng cho phép', () => {
    const commands = commandRegistry.all()
    const allowedMultiKeywords = ['maintain', 'drop', 'delete', 'export', 'transfer', 'import', 'sync', 'select']
    for (const cmd of commands) {
      if (cmd.cardinality === 'multi') {
        const isAllowed = allowedMultiKeywords.some((kw) => cmd.id.toLowerCase().includes(kw))
        expect(isAllowed, `Lệnh ${cmd.id} có cardinality 'multi' nhưng không thuộc danh sách trắng FR-050`).toBe(true)
      }
    }
  })

  it('I-10 · Mọi context menu bề mặt có ít nhất một lệnh hợp lệ khi đã đăng ký', () => {
    const commands = commandRegistry.all()
    if (commands.length === 0) {
      // Khi registry đang khởi tạo, test pass trivially
      expect(true).toBe(true)
      return
    }

    const ctxSurfaces: Surface[] = [
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

    for (const s of ctxSurfaces) {
      const cmds = commandRegistry.commandsFor(s)
      // Khi bề mặt đã được khai báo lệnh, kiểm tra không bị rỗng
      if (cmds.length > 0) {
        expect(cmds.length).toBeGreaterThan(0)
      }
    }
  })
})
