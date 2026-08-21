import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TableMeta } from '@corvus/contract'
import { useStudio, useClient } from '../store/studio'

const ADD_BTN: CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px dashed var(--border-strong)',
  borderRadius: 4,
  color: 'var(--accent)',
  cursor: 'pointer',
  fontSize: 11.5,
  flex: 'none',
}

function inputSt(w: string, mono: boolean): CSSProperties {
  return {
    height: 24,
    width: w,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 8px',
    border: '1px solid var(--border-strong)',
    borderRadius: 4,
    background: 'var(--pane)',
    fontSize: 11.5,
    fontFamily: mono ? 'var(--mono)' : 'inherit',
    color: 'var(--text)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  }
}

/** Renders the WHERE clause the builder rows currently describe. */
function whereClause(crit: { join: string; field: string; op: string; value: string }[], empty: string): string {
  if (!crit.length) return empty
  return crit
    .map((c, i) => (i === 0 ? '' : c.join + ' ') + '`' + c.field + '` ' + c.op + ' ' + (/^[0-9.]+$/.test(c.value) ? c.value : "'" + c.value + "'"))
    .join('\n')
}

export function FilterPanel() {
  const { s, set, t, tr, filterCriteria, sortCriteria, activeTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'
  const schema = tab?.identity.type === 'object' ? tab.identity.namespace : undefined
  const database = tab?.identity.type === 'object' ? tab.identity.database : undefined

  const { data: tableMeta } = useQuery({
    queryKey: ['tableMeta', connectionId, s.selTable],
    queryFn: () =>
      client.request<TableMeta>('introspect.tableMeta', {
        connectionId,
        database,
        schema,
        table: s.selTable,
      }),
    enabled: !!s.selTable,
  })

  const firstField = tableMeta?.columns?.[0]?.name ?? 'id'
  const whereText = whereClause(filterCriteria, tr('-- chưa có điều kiện', '-- no criteria'))
  const orderText = sortCriteria.length
    ? ' ORDER BY ' + sortCriteria.map((x) => x.field + ' ' + x.dir).join(', ')
    : ''
  const preview =
    'SELECT * FROM `' +
    s.selTable +
    '`' +
    (filterCriteria.length ? ' WHERE ' + whereText.replace(/\n/g, ' ') : '') +
    orderText

  return (
    <div style={{ flex: 'none', borderBottom: '1px solid var(--border-strong)', background: 'var(--pane2)' }}>
      <div
        style={{
          height: 26,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}
        >
          {t.flFilter}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {(['builder', 'text'] as const).map((mode) => {
            const on = s.flMode === mode
            return (
              <div
                key={mode}
                onClick={() => set({ flMode: mode })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11.5 }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: on ? 'var(--accent)' : 'transparent',
                    }}
                  />
                </span>
                <span style={{ color: on ? 'var(--accent)' : 'var(--text2)', fontWeight: on ? 600 : 400 }}>
                  {mode === 'builder' ? 'Builder' : 'Text'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.flMode === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filterCriteria.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 56,
                    flex: 'none',
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: i === 0 ? 'var(--text3)' : 'var(--coral)',
                    textAlign: 'right',
                    cursor: i === 0 ? 'default' : 'pointer',
                  }}
                >
                  {i === 0 ? 'WHERE' : c.join}
                </span>
                <div style={inputSt('180px', true)}>
                  {c.field}
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>▾</span>
                </div>
                <div style={inputSt('104px', true)}>
                  {c.op}
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>▾</span>
                </div>
                <div style={{ ...inputSt('220px', true), cursor: 'text' }}>{c.value}</div>
                <div
                  className="hv-red-pane"
                  onClick={() => set({ flCrit: filterCriteria.filter((_, j) => j !== i) })}
                  style={{
                    width: 22,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text3)',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  ×
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                onClick={() =>
                  set({ flCrit: filterCriteria.concat([{ join: 'AND', field: firstField, op: '=', value: '' }]) })
                }
                style={ADD_BTN}
              >
                +
              </div>
              <div
                onClick={() =>
                  set({
                    flCrit: filterCriteria.concat([
                      { join: 'AND (', field: firstField, op: 'IN', value: '(1, 2, 3)' },
                    ]),
                  })
                }
                style={ADD_BTN}
              >
                ( )
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {tr('Nhấn “+” để thêm điều kiện, “( )” để thêm nhóm', 'Click “+” to add criteria, “( )” to add a group')}
              </span>
            </div>
          </div>
        )}

        {s.flMode === 'text' && (
          <div
            style={{
              minHeight: 62,
              padding: '8px 10px',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              background: 'var(--pane)',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {whereText}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 2, borderTop: '1px solid var(--grid-line)' }}>
          <span
            style={{
              width: 62,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.4px',
              textTransform: 'uppercase',
              color: 'var(--text3)',
              paddingTop: 7,
            }}
          >
            {t.flSort}
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 7, flexWrap: 'wrap' }}>
            {sortCriteria.map((sc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={inputSt('180px', true)}>
                  {sc.field}
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>▾</span>
                </div>
                <div
                  onClick={() =>
                    set({
                      flSort: sortCriteria.map((x, j) =>
                        j === i ? { field: x.field, dir: x.dir === 'ASC' ? 'DESC' : 'ASC' } : x,
                      ),
                    })
                  }
                  style={{
                    height: 24,
                    padding: '0 9px',
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    background: 'var(--pane)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  {sc.dir}
                </div>
                <div
                  className="hv-red"
                  onClick={() => set({ flSort: sortCriteria.filter((_, j) => j !== i) })}
                  style={{
                    width: 22,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text3)',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </div>
              </div>
            ))}
            <div
              onClick={() => set({ flSort: sortCriteria.concat([{ field: firstField, dir: 'ASC' }]) })}
              style={ADD_BTN}
            >
              +
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <div
            onClick={() => set({ view: 'data' })}
            style={{
              height: 26,
              flex: 'none',
              whiteSpace: 'nowrap',
              padding: '0 13px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 5,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontWeight: 600,
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            {t.flApply}
          </div>
          <div
            className="hv-accent-border"
            onClick={() => set({ flCrit: [], flSort: [] })}
            style={{
              height: 26,
              flex: 'none',
              whiteSpace: 'nowrap',
              padding: '0 11px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              color: 'var(--text2)',
              cursor: 'pointer',
              fontSize: 11.5,
            }}
          >
            {t.flClear}
          </div>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'right',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--text3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview}
          </span>
        </div>
      </div>
    </div>
  )
}
