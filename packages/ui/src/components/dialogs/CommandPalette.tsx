import { useState, useEffect, useRef } from 'react'
import { SearchIcon } from '../SearchIcon'
import { useStudio, useClient } from '../../store/studio'
import { useActiveContext } from '../../context/useActiveContext'
import { commandsFor } from '../../commands/registry'
import { evaluate } from '../../commands/availability'
import { useQuery } from '@tanstack/react-query'
import type { ObjectKind, DialogId } from '@corvus/contract'

interface PaletteItem {
  id: string
  label: string
  category: 'Views' | 'Tables' | 'Actions' | 'Tools'
  shortcut?: string
  disabled?: boolean
  action: () => void
}

export function CommandPalette() {
  const { set, t, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = () => set({ showPalette: false })

  const { data: objects = [] } = useQuery({
    queryKey: ['introspect', ctx.connectionId, ctx.database, ctx.namespace, 'objects'],
    queryFn: async () => {
      if (!ctx.connectionId) return []
      const res = await client.request<Array<{ name: string; kind: ObjectKind }>>('introspect.objects', {
        connectionId: ctx.connectionId,
        database: ctx.database ?? undefined,
        schema: ctx.namespace ?? undefined,
      })
      return Array.isArray(res) ? res : []
    },
    enabled: !!ctx.connectionId && ctx.connectionState === 'open',
  })

  const registryCommands = commandsFor('command-palette', 'empty')
  const commandItems: PaletteItem[] = registryCommands
    .filter((cmd) => evaluate(cmd, ctx).state !== 'hidden')
    .map((cmd) => {
      const verdict = evaluate(cmd, ctx)
      const label = t[cmd.labelKey] ?? cmd.id
      return {
        id: cmd.id,
        label,
        category: cmd.id.startsWith('view.') ? 'Views' : 'Actions',
        disabled: verdict.state === 'disabled',
        action: () => {
          if (verdict.state === 'enabled') {
            void cmd.run({
              active: ctx,
              client,
              openTab,
              openDialog: (d) => set({ dialog: d as DialogId }),
            })
            close()
          }
        },
      }
    })

  const objectItems: PaletteItem[] = objects.map((obj) => ({
    id: `obj-${obj.kind}-${obj.name}`,
    label: `${obj.name} (${obj.kind}${ctx.database ? ` in ${ctx.database}` : ''})`,
    category: 'Tables',
    action: () => {
      if (ctx.connectionId) {
        openTab({
          type: 'object',
          contentKind: 'data',
          connectionId: ctx.connectionId,
          database: ctx.database ?? undefined,
          namespace: ctx.namespace ?? undefined,
          objectKind: obj.kind,
          name: obj.name,
        })
      }
      close()
    },
  }))

  const allItems: PaletteItem[] = [...commandItems, ...objectItems]

  const filtered = allItems.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase()),
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(12,14,15,.42)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
        zIndex: 30,
      }}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderBottom: '1px solid var(--border)' }}>
          <SearchIcon size={15} stroke="var(--text3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.paletteHint}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ maxHeight: 320, overflow: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px 20px', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
              Không tìm thấy lệnh hoặc đối tượng phù hợp
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 32,
                    padding: '0 14px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text)',
                    fontSize: 11.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      padding: '2px 5px',
                      borderRadius: 3,
                      background: 'var(--pane2)',
                      color: 'var(--text3)',
                      fontWeight: 600,
                    }}
                  >
                    {item.category}
                  </span>
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{item.label}</span>
                  {item.shortcut && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: 'var(--text3)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                      }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
