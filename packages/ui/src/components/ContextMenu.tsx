import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStudio } from '../store/studio'
import type { ActiveContext } from '../context/activeContext'
import type { CommandContext, Surface, TargetKind } from '../commands/types'
import { commandsFor } from '../commands/registry'
import { evaluate } from '../commands/availability'

export interface ContextMenuProps {
  readonly x: number
  readonly y: number
  readonly surface: Surface
  readonly targetKind: TargetKind
  readonly activeContext: ActiveContext
  readonly commandContext: CommandContext
  readonly onClose: () => void
}

export function ContextMenu({
  x,
  y,
  surface,
  targetKind,
  activeContext,
  commandContext,
  onClose,
}: ContextMenuProps) {
  const { t } = useStudio()
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x, y })
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Lấy các lệnh cho bề mặt và mục tiêu theo thứ tự khai báo
  const rawCommands = commandsFor(surface, targetKind)

  // Đánh giá từng lệnh theo hàm evaluate duy nhất (FR-046)
  // Trên bề mặt context menu, state === 'hidden' (engine-unsupported) sẽ không được render (FR-046B)
  const evaluatedItems = rawCommands
    .map((cmd) => {
      const verdict = evaluate(cmd, activeContext)
      return { cmd, verdict }
    })
    .filter((item) => item.verdict.state !== 'hidden')

  // Tự điều chỉnh toạ độ để không tràn màn hình (FR-047)
  useLayoutEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const padding = 8
    let nextX = x
    let nextY = y

    if (x + rect.width > window.innerWidth - padding) {
      nextX = Math.max(padding, window.innerWidth - rect.width - padding)
    }
    if (y + rect.height > window.innerHeight - padding) {
      nextY = Math.max(padding, window.innerHeight - rect.height - padding)
    }

    setPos({ x: nextX, y: nextY })
  }, [x, y, evaluatedItems.length])

  // Đóng khi click ngoài hoặc nhấn Escape (FR-047)
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          let next = prev + 1
          while (next < evaluatedItems.length && evaluatedItems[next].verdict.state === 'disabled') {
            next++
          }
          return next < evaluatedItems.length ? next : prev
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          let next = prev - 1
          while (next >= 0 && evaluatedItems[next].verdict.state === 'disabled') {
            next--
          }
          return next >= 0 ? next : prev
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < evaluatedItems.length) {
          const item = evaluatedItems[focusedIndex]
          if (item.verdict.state === 'enabled') {
            onClose()
            void item.cmd.run(commandContext)
          }
        }
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, evaluatedItems, focusedIndex, commandContext])

  if (evaluatedItems.length === 0) {
    return null
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      data-testid="context-menu"
      data-surface={surface}
      data-target={targetKind}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        minWidth: 180,
        maxWidth: 320,
        background: 'var(--pane)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm, 6px)',
        boxShadow: 'var(--shadow)',
        padding: '4px 0',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {evaluatedItems.map(({ cmd, verdict }, index) => {
        const isEnabled = verdict.state === 'enabled'
        const isFocused = index === focusedIndex
        const label = t[cmd.labelKey] ?? cmd.id
        const disabledReasonKey = verdict.state === 'disabled' ? `disabled.${verdict.reason}` : null
        const disabledHint = disabledReasonKey ? (t as Record<string, string>)[disabledReasonKey] : undefined

        return (
          <button
            key={cmd.id}
            type="button"
            role="menuitem"
            data-testid={`menuitem-${cmd.id}`}
            disabled={!isEnabled}
            title={disabledHint}
            onClick={() => {
              if (isEnabled) {
                onClose()
                void cmd.run(commandContext)
              }
            }}
            onMouseEnter={() => {
              if (isEnabled) setFocusedIndex(index)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 12px',
              border: 'none',
              background: isFocused && isEnabled ? 'var(--accent-soft)' : 'transparent',
              color: isEnabled ? (isFocused ? 'var(--accent)' : 'var(--text)') : 'var(--text3)',
              cursor: isEnabled ? 'pointer' : 'not-allowed',
              fontSize: 12.5,
              textAlign: 'left',
              outline: 'none',
            }}
          >
            <span>{label}</span>
            {disabledHint && (
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.6,
                  marginLeft: 8,
                }}
              >
                ({disabledHint})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
