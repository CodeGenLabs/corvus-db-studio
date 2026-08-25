import { describe, expect, it } from 'vitest'
import { commandRegistry } from '../commands/registry'
import { METHODS } from '@corvus/contract'

describe('Three-Dimensional Command Inventory Tests (T083 / FR-025 / SC-016)', () => {
  const allCmds = commandRegistry.all()

  it('(a) Mọi lệnh trong registry đều có hàm thực thi run không null', () => {
    for (const cmd of allCmds) {
      expect(typeof cmd.run, `Lệnh ${cmd.id} thiếu hàm run`).toBe('function')
    }
  })

  it('(b) Mọi RPC method được khai báo trong cmd.rpc đều tồn tại trong METHODS của @corvus/contract', () => {
    const knownMethodNames = new Set(Object.keys(METHODS))
    for (const cmd of allCmds) {
      for (const rpcMethod of cmd.rpc) {
        expect(
          knownMethodNames.has(rpcMethod),
          `Lệnh ${cmd.id} khai báo RPC method "${rpcMethod}" không tồn tại trong @corvus/contract`,
        ).toBe(true)
      }
    }
  })

  it('(c) Mọi lệnh xuất hiện trên đúng tập bề mặt surfaces đã khai báo', () => {
    for (const cmd of allCmds) {
      expect(cmd.surfaces.length, `Lệnh ${cmd.id} không có surface nào`).toBeGreaterThan(0)
      for (const surface of cmd.surfaces) {
        const matchingCmds = commandRegistry.commandsFor(surface)
        expect(
          matchingCmds.some((c) => c.id === cmd.id),
          `Lệnh ${cmd.id} khai báo surface ${surface} nhưng commandsFor(${surface}) không trả về nó`,
        ).toBe(true)
      }
    }
  })
})
