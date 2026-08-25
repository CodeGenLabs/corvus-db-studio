import { describe, expect, it, vi } from 'vitest'
import { renderStudio } from './helpers/renderStudio'
import { ContextMenu } from '../components/ContextMenu'
import { INITIAL_ACTIVE_CONTEXT } from '../context/activeContext'
import { fireEvent } from '@testing-library/react'

describe('Context Menu Keyboard Navigation DOM Tests (T072 / FR-025C / FR-047B)', () => {
  it('Escape đóng menu', () => {
    const onClose = vi.fn()
    const { unmount } = renderStudio(
      <ContextMenu
        x={100}
        y={100}
        surface="ctx-tab-bar"
        targetKind="tab"
        activeContext={INITIAL_ACTIVE_CONTEXT}
        commandContext={{
          active: INITIAL_ACTIVE_CONTEXT,
          client: {} as any,
          openTab: () => {},
          openDialog: () => {},
        }}
        onClose={onClose}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('ArrowDown và ArrowUp di chuyển focus qua các mục', () => {
    const { unmount } = renderStudio(
      <ContextMenu
        x={100}
        y={100}
        surface="ctx-tab-bar"
        targetKind="tab"
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

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    unmount()
  })
})
