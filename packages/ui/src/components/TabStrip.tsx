import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from './useContextMenu'
import { ContextMenu } from './ContextMenu'
import type { Tab } from '../tabs'
import type { DialogId } from '@corvus/contract'

function colorForTab(tab: Tab): string {
  if (tab.identity.type === 'object') {
    switch (tab.identity.contentKind) {
      case 'data':
        return 'var(--amber, #f59e0b)'
      case 'design':
        return 'var(--accent, #3b82f6)'
      case 'definition':
        return 'var(--teal, #14b8a6)'
      case 'er':
        return 'var(--green, #10b981)'
      case 'objectList':
        return 'var(--purple, #8b5cf6)'
      default:
        return 'var(--accent, #3b82f6)'
    }
  }
  switch (tab.identity.toolKind) {
    case 'sql':
      return 'var(--coral, #f97316)'
    case 'compare':
      return 'var(--red, #ef4444)'
    case 'backup':
      return 'var(--coral, #f97316)'
    case 'jobs':
      return 'var(--text3, #6b7280)'
    case 'monitor':
      return 'var(--green, #10b981)'
    default:
      return 'var(--accent, #3b82f6)'
  }
}

export function TabStrip() {
  const { s, set, focusTab, closeTab, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-tab-bar')

  const handleNewSqlTab = () => {
    const existingSqlTabs = s.tabs.filter(
      (t) => t.identity.type === 'tool' && t.identity.toolKind === 'sql',
    )
    const nextSeq = existingSqlTabs.length + 1
    openTab({
      type: 'tool',
      toolKind: 'sql',
      seq: nextSeq,
    })
  }

  const handleClose = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation()
    if (tab.dirty) {
      const ok = window.confirm(
        `Tab "${tab.title}" có thay đổi chưa lưu. Bạn có chắc muốn đóng không?`,
      )
      if (!ok) return
    }
    closeTab(tab.id)
  }

  return (
    <div
      data-testid="tab-strip"
      onContextMenu={(e) => openContextMenu(e, 'tab')}
      onKeyDown={(e) => handleKeyDown(e, 'tab')}
      style={{
        height: 30,
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--pane2)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {s.tabs.map((tab) => {
        const active = s.activeTabId === tab.id
        const color = colorForTab(tab)

        return (
          <div
            key={tab.id}
            className="hv-text"
            onClick={() => focusTab(tab.id)}
            onContextMenu={(e) => {
              e.stopPropagation()
              focusTab(tab.id)
              openContextMenu(e, 'tab')
            }}
            data-testid={`tab-${tab.id}`}
            title={tab.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 9px',
              maxWidth: 180,
              minWidth: 0,
              flexShrink: 1,
              cursor: 'pointer',
              borderRight: '1px solid var(--border)',
              fontSize: 11.5,
              background: active ? 'var(--pane)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text2)',
              boxShadow: active ? 'inset 0 2px 0 var(--accent)' : 'none',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                flex: 'none',
                background: color,
              }}
            />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontStyle: tab.missing ? 'italic' : 'normal',
                opacity: tab.missing ? 0.7 : 1,
              }}
            >
              {tab.dirty ? `${tab.title} *` : tab.title}
            </span>
            <span
              onClick={(e) => handleClose(e, tab)}
              title="Đóng tab"
              style={{
                color: 'var(--text3)',
                fontSize: 13,
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              ×
            </span>
          </div>
        )
      })}

      <div
        className="hv-accent"
        onClick={handleNewSqlTab}
        title="Mở trình soạn SQL mới"
        style={{
          width: 28,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          userSelect: 'none',
        }}
      >
        +
      </div>

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-tab-bar"
          targetKind={menuState.targetKind}
          activeContext={ctx}
          commandContext={{
            active: ctx,
            client,
            openTab,
            openDialog: (d) => set({ dialog: d as DialogId }),
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
