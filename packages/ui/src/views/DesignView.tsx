import type { CSSProperties } from 'react'
import { DESIGN, fieldsFor } from '../data/schema'
import { useStudio } from '../store/studio'

const COLS = '30px 1fr 150px 90px 80px 60px 60px 1fr'

const FIELD_BOX: CSSProperties = {
  height: 20,
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  background: 'var(--pane)',
  fontFamily: 'var(--mono)',
  fontSize: 11,
  padding: '0 6px',
  display: 'flex',
  alignItems: 'center',
}

const SUB_TAB: CSSProperties = {
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--text2)',
  borderRight: '1px solid var(--border)',
  cursor: 'pointer',
}

export function DesignView() {
  const { s, set, t, row } = useStudio()

  const rows: string[][] =
    s.selTable === 'country'
      ? DESIGN
      : fieldsFor(s.selTable).map((f) => [f.name, f.type, f.len, f.def, f.notNull ? '✓' : '', f.key, ''])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fName}</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fType}</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.fLength}</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fDefault}</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'center' }}>{t.fNotNull}</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'center' }}>{t.fKey}</div>
          <div style={{ padding: '5px 8px' }}>{t.fComment}</div>
        </div>

        {rows.map((g, i) => {
          const sel = s.selField === g[0]
          return (
            <div
              key={g[0]}
              className="hv-row"
              onClick={() => set({ selField: g[0] })}
              style={row({
                display: 'grid',
                gridTemplateColumns: COLS,
                background: sel ? 'var(--sel)' : 'transparent',
                cursor: 'pointer',
              })}
            >
              <div
                style={{
                  padding: '0 6px',
                  textAlign: 'right',
                  color: 'var(--text3)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10.5,
                  borderRight: '1px solid var(--grid-line)',
                }}
              >
                {i + 1}
              </div>
              <div style={{ padding: '0 8px', fontFamily: 'var(--mono)', borderRight: '1px solid var(--grid-line)' }}>{g[0]}</div>
              <div style={{ padding: '0 8px', fontFamily: 'var(--mono)', color: 'var(--text2)', borderRight: '1px solid var(--grid-line)' }}>{g[1]}</div>
              <div style={{ padding: '0 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)', borderRight: '1px solid var(--grid-line)' }}>{g[2]}</div>
              <div style={{ padding: '0 8px', fontFamily: 'var(--mono)', color: 'var(--text3)', borderRight: '1px solid var(--grid-line)' }}>{g[3]}</div>
              <div style={{ padding: '0 8px', textAlign: 'center', color: 'var(--accent)', borderRight: '1px solid var(--grid-line)' }}>{g[4]}</div>
              <div style={{ padding: '0 8px', textAlign: 'center', color: 'var(--amber)', borderRight: '1px solid var(--grid-line)' }}>{g[5]}</div>
              <div style={{ padding: '0 8px', color: 'var(--text3)' }}>{g[6]}</div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          flex: 'none',
          height: 128,
          borderTop: '1px solid var(--border-strong)',
          background: 'var(--pane2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 26, flex: 'none', display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
          <div
            style={{
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--pane)',
              color: 'var(--accent)',
              fontWeight: 600,
              borderRight: '1px solid var(--border)',
              borderBottom: '2px solid var(--accent)',
            }}
          >
            {t.fields}
          </div>
          <div style={SUB_TAB}>{t.indexes}</div>
          <div style={SUB_TAB}>{t.foreignKeys}</div>
          <div style={SUB_TAB}>{t.triggers}</div>
          <div style={SUB_TAB}>{t.options}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
            <div
              style={{
                height: 20,
                padding: '0 9px',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                borderRadius: 5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.save}
            </div>
            <div
              style={{
                height: 20,
                padding: '0 9px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                color: 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              {t.previewSql}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px 18px',
            padding: '10px 14px',
            alignContent: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{t.fDefault}</span>
            <span style={{ ...FIELD_BOX, color: 'var(--text3)' }}>NULL</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Character set</span>
            <span style={FIELD_BOX}>utf8mb4</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Collation</span>
            <span style={FIELD_BOX}>utf8mb4_0900_ai_ci</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{t.fComment}</span>
            <span style={{ ...FIELD_BOX, fontFamily: 'inherit', color: 'var(--text3)' }}>ISO country name</span>
          </div>
        </div>
      </div>
    </div>
  )
}
