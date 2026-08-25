import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from './useContextMenu'
import { ContextMenu } from './ContextMenu'
import type { View } from '../types'
import type { DialogId } from '@corvus/contract'

interface Item {
  key: string
  label: string
  d: string[]
  onClick: () => void
  /** View that renders this item as active. */
  activeFor?: View
  disabled?: boolean
  disabledReason?: string
}

export function Toolbar() {
  const { s, set, t, setView, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-toolbar')
  const view = s.view
  const caps = ctx.capabilities

  const noConnReason = t['disabled.no-connection']
  const noCapReason = t['disabled.engine-unsupported']

  const tableDisabled = !ctx.connectionId || caps === null || !caps.objects?.table
  const viewDisabled = !ctx.connectionId || caps === null || !caps.objects?.view
  const fnDisabled = !ctx.connectionId || caps === null || (!caps.objects?.function && !caps.objects?.procedure)
  const userDisabled = !ctx.connectionId || caps === null || !caps.tools?.userManagement
  const bkDisabled = !ctx.connectionId
  const modelDisabled = !ctx.connectionId || caps === null || !caps.objects?.table

  const capReason = !ctx.connectionId ? noConnReason : caps === null ? t['disabled.capabilities-unknown'] : noCapReason

  const items: Item[] = [
    { key: 'conn', label: t.tbConnection, d: ['M7 3v5M13 3v5', 'M4 8h12v3a6 6 0 01-12 0z', 'M10 17v-3'], onClick: () => set({ showConn: true }) },
    {
      key: 'newq',
      label: t.tbNewQuery,
      d: ['M5 3h7l3 3v11H5z', 'M8 10h5M8 13h4'],
      onClick: () => {
        const sqlCount = s.tabs.filter((t) => t.identity.type === 'tool' && t.identity.toolKind === 'sql').length
        openTab({ type: 'tool', toolKind: 'sql', seq: sqlCount + 1 })
      },
    },
    {
      key: 'table',
      label: t.tbTable,
      d: ['M3 4h14v12H3z', 'M3 8h14M8 8v8M12 8v8'],
      onClick: () => {
        set({ selectedObjectKind: 'table' })
        setView('objects')()
      },
      activeFor: 'objects',
      disabled: tableDisabled,
      disabledReason: capReason,
    },
    {
      key: 'view',
      label: t.tbView,
      d: ['M2 10s3-4 8-4 8 4 8 4-3 4-8 4-8-4-8-4z', 'M10 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z'],
      onClick: () => {
        set({ selectedObjectKind: 'view' })
        setView('objects')()
      },
      disabled: viewDisabled,
      disabledReason: capReason,
    },
    {
      key: 'fn',
      label: t.tbFunction,
      d: ['M12 4h-1a2 2 0 00-2 2v8a2 2 0 01-2 2H6', 'M6 10h6'],
      onClick: () => {
        set({ selectedObjectKind: 'function' })
        setView('objects')()
      },
      disabled: fnDisabled,
      disabledReason: capReason,
    },
    {
      key: 'user',
      label: t.tbUser,
      d: ['M10 4a3 3 0 100 6 3 3 0 000-6z', 'M4 17c0-3 2.7-5 6-5s6 2 6 5'],
      onClick: () => set({ dialog: 'users' }),
      disabled: userDisabled,
      disabledReason: capReason,
    },
    {
      key: 'sql',
      label: t.tbQuery,
      d: ['M4 5h12v10H4z', 'M6.5 8l2 2-2 2M10.5 12h3'],
      onClick: () => {
        const sqlCount = s.tabs.filter((t) => t.identity.type === 'tool' && t.identity.toolKind === 'sql').length
        openTab({ type: 'tool', toolKind: 'sql', seq: sqlCount + 1 })
      },
      activeFor: 'sql',
    },
    {
      key: 'bk',
      label: t.tbBackup,
      d: ['M10 3v8M7 8l3 3 3-3', 'M4 14v3h12v-3'],
      onClick: () => openTab({ type: 'tool', toolKind: 'backup', seq: 1 }),
      disabled: bkDisabled,
      disabledReason: noConnReason,
    },
    {
      key: 'auto',
      label: t.tbAutomation,
      d: [
        'M10 7.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z',
        'M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4',
      ],
      onClick: () => openTab({ type: 'tool', toolKind: 'jobs', seq: 1 }),
      activeFor: 'jobs',
    },
    {
      key: 'model',
      label: t.tbModel,
      d: ['M3 4h5v4H3zM12 12h5v4h-5z', 'M5.5 8v4h9'],
      onClick: setView('er'),
      activeFor: 'er',
      disabled: modelDisabled,
      disabledReason: !ctx.connectionId ? noConnReason : noCapReason,
    },
    {
      key: 'cmp',
      label: t.tbCompare,
      d: ['M3 7h9l-2.5-2.5M17 13H8l2.5 2.5'],
      onClick: () => openTab({ type: 'tool', toolKind: 'compare', seq: 1 }),
      activeFor: 'compare',
    },
  ]

  return (
    <div
      data-testid="toolbar"
      onContextMenu={(e) => openContextMenu(e, 'empty')}
      onKeyDown={(e) => handleKeyDown(e, 'empty')}
      style={{
        height: 62,
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 8px',
        background: 'var(--pane)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {items.map((it) => {
        const active = it.activeFor === view
        const isDisabled = it.disabled === true
        return (
          <button
            key={it.key}
            data-testid={`toolbar-${it.key}`}
            className={isDisabled ? undefined : 'hv-accent-soft'}
            onClick={isDisabled ? undefined : it.onClick}
            disabled={isDisabled}
            title={isDisabled ? it.disabledReason : undefined}
            style={{
              width: 62,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              margin: '5px 1px',
              borderRadius: 6,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              color: active ? 'var(--accent)' : 'var(--text2)',
              background: active ? 'var(--accent-soft)' : 'transparent',
              border: 'none',
              opacity: isDisabled ? 0.45 : 1,
              outline: 'none',
            }}
          >
            <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width={21}
                height={21}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.35}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {it.d.map((p, i) => (
                  <path key={i} d={p} />
                ))}
              </svg>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '.1px', whiteSpace: 'nowrap' }}>{it.label}</div>
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <div
        data-testid="toolbar-connection-status"
        style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4 }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
            color: 'var(--text3)',
            fontSize: 10.5,
          }}
        >
          {ctx.connectionState === 'open' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                {t.connected}
              </div>
              <div data-testid="toolbar-server-info" style={{ fontFamily: 'var(--mono)' }}>
                {[ctx.driverId?.toUpperCase(), ctx.serverVersion, ctx.serverEncoding].filter(Boolean).join(' · ')}
              </div>
            </>
          ) : ctx.connectionState === 'opening' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              {t.loading}
            </div>
          ) : ctx.connectionState === 'error' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
              {t.navLoadFailed}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)' }} />
              {t.navEmpty}
            </div>
          )}
        </div>
      </div>

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-toolbar"
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
