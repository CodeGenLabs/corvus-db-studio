import { TABLES } from '../data/schema'
import { useStudio } from '../store/studio'

const COLS = '1fr 110px 130px 110px 110px 150px'

export function ObjectsView() {
  const { s, set, t, row } = useStudio()

  return (
    <div>
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
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)' }}>{t.cName}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cRows}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cDataLen}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)' }}>{t.cEngine}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cAutoInc}</div>
        <div style={{ padding: '5px 10px' }}>{t.cModified}</div>
      </div>

      {TABLES.map((r) => {
        const sel = s.selTable === r[0]
        return (
          <div
            key={r[0]}
            className="hv-row"
            onClick={() => set({ selTable: r[0] })}
            style={row({
              display: 'grid',
              gridTemplateColumns: COLS,
              background: sel ? 'var(--sel)' : 'transparent',
              cursor: 'pointer',
            })}
          >
            <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              <span
                style={{
                  width: 11,
                  height: 9,
                  flex: 'none',
                  border: '1px solid var(--accent)',
                  borderTopWidth: 3,
                  borderRadius: 1.5,
                }}
              />
              <span
                style={{
                  fontWeight: sel ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r[0]}
              </span>
            </div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r[1]}</div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r[2]}</div>
            <div style={{ padding: '0 10px', color: 'var(--text2)' }}>{r[3]}</div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r[4]}</div>
            <div style={{ padding: '0 10px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r[5]}</div>
          </div>
        )
      })}
    </div>
  )
}
