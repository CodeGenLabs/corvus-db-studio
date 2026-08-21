import type { CSSProperties } from 'react'
import { useStudio } from '../store/studio'

const DEFAULT_DIFF: [string, string, string, string, string, string][] = []

const COLS = '30px 90px 1fr 1fr 70px 150px'
const MARK_COLOR: Record<string, string> = { '~': 'var(--amber)', '+': 'var(--green)', '−': 'var(--red)' }
const ROW_TINT: Record<string, string> = {
  '~': 'var(--pane)',
  '+': 'rgba(44,117,73,.10)',
  '−': 'rgba(169,53,38,.10)',
}

/** Cells that carry a `before → after` pair get the "changed" treatment. */
function cellSt(v: string): CSSProperties {
  const changed = v.includes('→')
  return {
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    borderRight: '1px solid var(--grid-line)',
    fontFamily: changed ? 'var(--mono)' : 'inherit',
    fontSize: changed ? 11 : 12,
    color: changed ? 'var(--amber)' : 'var(--text)',
    background: changed ? 'rgba(156,114,7,.10)' : 'transparent',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}

const PILL: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 20,
  padding: '0 8px',
  borderRadius: 10,
  background: 'var(--accent-soft)',
  fontWeight: 600,
  fontSize: 11,
}

const GHOST_BTN: CSSProperties = {
  height: 20,
  padding: '0 9px',
  display: 'flex',
  alignItems: 'center',
  border: '1px solid var(--border-strong)',
  borderRadius: 5,
  color: 'var(--text2)',
  cursor: 'pointer',
  fontSize: 11,
}

export function CompareView() {
  const { s, set, t, rowH } = useStudio()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 'none',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          display: 'flex',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            flex: 1,
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            padding: '8px 10px',
            background: 'var(--pane)',
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              color: 'var(--text3)',
              marginBottom: 4,
            }}
          >
            {t.snapA}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: 'var(--text2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            SELECT * FROM customer WHERE store_id = 1
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>12:04:31 · 599 rows · 5 cols</div>
        </div>

        <div
          style={{ width: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 16 }}
        >
          ⇄
        </div>

        <div style={{ flex: 1, border: '1px solid var(--accent)', borderRadius: 6, padding: '8px 10px', background: 'var(--pane)' }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 4,
            }}
          >
            {t.snapB}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: 'var(--text2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            — after UPDATE / INSERT / DELETE batch
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>12:05:02 · 599 rows · 5 cols</div>
        </div>
      </div>

      <div
        style={{
          flex: 'none',
          height: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ ...PILL, color: 'var(--green)' }}>+1 {t.added}</div>
        <div style={{ ...PILL, color: 'var(--red)' }}>−1 {t.removed}</div>
        <div style={{ ...PILL, color: 'var(--amber)' }}>~3 {t.changed}</div>
        <div style={{ color: 'var(--text3)', fontSize: 11 }}>596 {t.unchanged}</div>
        <div
          onClick={() => set((p) => ({ diffOnly: !p.diffOnly }))}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 20,
            padding: '0 8px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid ' + (s.diffOnly ? 'var(--accent)' : 'var(--border-strong)'),
            color: s.diffOnly ? 'var(--accent)' : 'var(--text2)',
            background: s.diffOnly ? 'var(--accent-soft)' : 'transparent',
          }}
        >
          {t.diffOnly}
        </div>
        <div className="hv-accent-border" style={{ ...GHOST_BTN, marginLeft: 'auto' }}>
          {t.exportDiff}
        </div>
        <div className="hv-accent-border" style={GHOST_BTN}>
          {t.genRollback}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: COLS,
            background: 'var(--pane2)',
            borderBottom: '1px solid var(--border-strong)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          <div style={{ padding: '5px 6px', borderRight: '1px solid var(--grid-line)' }} />
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>customer_id</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>first_name</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>email</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>active</div>
          <div style={{ padding: '5px 8px' }}>last_update</div>
        </div>

        {DEFAULT_DIFF.map((d) => (
          <div
            key={d[0] + d[1]}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              height: rowH + 3,
              borderBottom: '1px solid var(--grid-line)',
              background: ROW_TINT[d[0]],
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                color: MARK_COLOR[d[0]],
                borderRight: '1px solid var(--grid-line)',
              }}
            >
              {d[0]}
            </div>
            <div
              style={{
                padding: '0 8px',
                fontFamily: 'var(--mono)',
                borderRight: '1px solid var(--grid-line)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {d[1]}
            </div>
            <div style={cellSt(d[2])}>{d[2]}</div>
            <div style={cellSt(d[3])}>{d[3]}</div>
            <div style={cellSt(d[4])}>{d[4]}</div>
            <div style={{ ...cellSt(d[5]), borderRight: 'none' }}>{d[5]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
