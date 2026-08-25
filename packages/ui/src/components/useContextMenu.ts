import { useCallback, useState, type MouseEvent, type KeyboardEvent } from 'react'
import type { Surface, TargetKind } from '../commands/types'

export interface ContextMenuState {
  readonly isOpen: boolean
  readonly x: number
  readonly y: number
  readonly surface: Surface
  readonly targetKind: TargetKind
}

export function useContextMenu(surface: Surface) {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null)

  const openContextMenu = useCallback(
    (e: MouseEvent, targetKind: TargetKind) => {
      e.preventDefault()
      e.stopPropagation()
      setMenuState({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        surface,
        targetKind,
      })
    },
    [surface],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, targetKind: TargetKind) => {
      // Bắt Shift+F10 hoặc phím Menu (ContextMenu key) theo FR-047B
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault()
        e.stopPropagation()
        const targetEl = e.currentTarget as HTMLElement
        const rect = targetEl.getBoundingClientRect()
        setMenuState({
          isOpen: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          surface,
          targetKind,
        })
      }
    },
    [surface],
  )

  const closeContextMenu = useCallback(() => {
    setMenuState(null)
  }, [])

  return {
    menuState,
    openContextMenu,
    handleKeyDown,
    closeContextMenu,
  }
}
