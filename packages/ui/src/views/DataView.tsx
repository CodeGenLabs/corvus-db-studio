import { datasetFor, fieldsFor } from '../data/schema'
import { useStudio } from '../store/studio'

export function DataView() {
  const { s, t, row } = useStudio()
  const ds = datasetFor(s.selTable)
  const colTypes = fieldsFor(s.selTable)
  const gridTpl = '34px ' + ds.widths.join(' ')

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: gridTpl,
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text2)',
        }}
      >
        <div style={{ padding: '5px 6px', borderRight: '1px solid var(--grid-line)' }} />
        {ds.cols.map((c, i) => (
          <div
            key={c}
            style={{
              padding: '4px 8px 3px',
              borderRight: i === ds.cols.length - 1 ? 'none' : '1px solid var(--grid-line)',
              textAlign: ds.align[i] === 'r' ? 'right' : 'left',
              overflow: 'hidden',
            }}
          >
            <span>{c}</span>
            <span
              style={{
                display: 'block',
                marginTop: 1,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 400,
                color: 'var(--text3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {(colTypes[i]?.ddl ?? 'varchar(50)').toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {ds.rows.map((r, i) => (
        <div
          key={i}
          className="hv-row"
          style={row({
            display: 'grid',
            gridTemplateColumns: gridTpl,
            background: i % 2 ? 'var(--row-alt)' : 'transparent',
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
          {r.map((v, j) => (
            <div
              key={j}
              style={{
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: ds.align[j] === 'r' ? 'flex-end' : 'flex-start',
                borderRight: j === r.length - 1 ? 'none' : '1px solid var(--grid-line)',
                fontFamily: ds.align[j] === 't' ? 'inherit' : 'var(--mono)',
                color: ds.align[j] === 't' ? 'var(--text)' : 'var(--text2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {v}
            </div>
          ))}
        </div>
      ))}

      <div
        style={{
          height: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 10px',
          borderTop: '1px solid var(--border)',
          color: 'var(--text2)',
          fontSize: 11,
          background: 'var(--pane2)',
        }}
      >
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>◀ ▶</span>
        <span style={{ fontFamily: 'var(--mono)' }}>{`1 – ${ds.rows.length} / ${ds.total}`}</span>
        <span style={{ color: 'var(--text3)' }}>{t.editHint}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 600 }}>{t.noPending}</span>
      </div>
    </div>
  )
}
