import { describe, expect, it } from 'vitest'
import { commandRegistry } from '../commands/registry'
import type { Surface, TargetKind } from '../commands/types'
import { ContextMenu } from '../components/ContextMenu'
import { renderStudio } from './helpers/renderStudio'
import { INITIAL_ACTIVE_CONTEXT } from '../context/activeContext'

const ALL_11_SURFACES: Array<{ surface: Surface; targets: TargetKind[] }> = [
  { surface: 'ctx-nav', targets: ['connection', 'database', 'namespace', 'object-group', 'object', 'sub-element'] },
  { surface: 'ctx-object-list', targets: ['object', 'empty'] },
  { surface: 'ctx-data-grid', targets: ['cell', 'row-header', 'column-header', 'empty'] },
  { surface: 'ctx-sql-editor', targets: ['editor-selection', 'empty'] },
  { surface: 'ctx-query-builder', targets: ['canvas-node', 'canvas-edge', 'empty'] },
  { surface: 'ctx-er-diagram', targets: ['canvas-node', 'canvas-edge', 'empty'] },
  { surface: 'ctx-tab-bar', targets: ['tab'] },
  { surface: 'ctx-toolbar', targets: ['empty'] },
  { surface: 'ctx-snippet', targets: ['snippet', 'empty'] },
  { surface: 'ctx-job-list', targets: ['job', 'empty'] },
  { surface: 'ctx-diff', targets: ['diff-item', 'empty'] },
]

describe('Context Menu 11 Surfaces DOM Tests (T071 / FR-025B / I-10)', () => {
  it('toàn bộ 11 bề mặt có lệnh hợp lệ cho từng TargetKind và render được ContextMenu', () => {
    for (const { surface, targets } of ALL_11_SURFACES) {
      for (const targetKind of targets) {
        const cmds = commandRegistry.commandsFor(surface, targetKind)
        expect(cmds.length, `Surface "${surface}" mục tiêu "${targetKind}" không được rỗng`).toBeGreaterThan(0)

        // Khẳng định component ContextMenu mount được không crash
        const { unmount } = renderStudio(
          <ContextMenu
            x={100}
            y={100}
            surface={surface}
            targetKind={targetKind}
            activeContext={INITIAL_ACTIVE_CONTEXT}
            commandContext={{
              active: INITIAL_ACTIVE_CONTEXT,
              client: {} as any,
              openTab: () => {},
              openDialog: () => {},
            }}
            onClose={() => {}}
          />,
        )
        unmount()
      }
    }
  })
})
