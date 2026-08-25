import { describe, expect, it } from 'vitest'
import { commandRegistry } from '../commands/registry'
import { METHODS } from '@corvus/contract'

describe('Preview Token Security & Invariant Tests (T084 / Rule 5 / ADR-0010)', () => {
  const allCmds = commandRegistry.all()

  it('Không lệnh nào có write === "none" mà khai báo apply* RPC', () => {
    for (const cmd of allCmds) {
      if (cmd.write === 'none') {
        const hasApply = cmd.rpc.some((r) => r.toLowerCase().includes('apply'))
        expect(hasApply, `Lệnh ghi không an toàn: ${cmd.id} có write === 'none' nhưng chứa apply RPC`).toBe(false)
      }
    }
  })

  it('Lệnh có write === "preview-required" phải khai báo cả preview và apply RPC methods hợp lệ', () => {
    const knownMethods = new Set(Object.keys(METHODS))
    for (const cmd of allCmds) {
      if (cmd.write === 'preview-required') {
        const hasPreview = cmd.rpc.some((r) => r.toLowerCase().includes('preview'))
        const hasApply = cmd.rpc.some((r) => r.toLowerCase().includes('apply'))

        expect(hasPreview, `Lệnh ${cmd.id} có write: preview-required nhưng thiếu preview RPC`).toBe(true)
        expect(hasApply, `Lệnh ${cmd.id} có write: preview-required nhưng thiếu apply RPC`).toBe(true)

        for (const r of cmd.rpc) {
          expect(knownMethods.has(r), `RPC method ${r} của ${cmd.id} không tồn tại trong @corvus/contract`).toBe(true)
        }
      }
    }
  })
})
