import { Cmt, Kw, Num, Str } from '../components/code'
import { RESULTS } from '../data/schema'
import { useStudio } from '../store/studio'

const RESULT_COLS = '34px 1fr 120px 130px 130px'

export function SqlView() {
  const { s, t, row, setView } = useStudio()
  const goCompare = setView('compare')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 30,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <div
          onClick={goCompare}
          style={{
            height: 21,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ▶ {t.run}
        </div>
        <div
          className="hv-accent-border"
          style={{
            height: 21,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 5,
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          {t.explain}
        </div>
        <div
          className="hv-accent-border"
          style={{
            height: 21,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 5,
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          {t.beautify}
        </div>
        <div
          className="hv-accent-soft-bg"
          onClick={goCompare}
          style={{
            height: 21,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ⇄ {t.captureSnap}
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
          sakila · 24 ms · 16 rows
        </span>
      </div>

      <div
        style={{
          flex: 'none',
          height: 260,
          display: 'flex',
          borderBottom: '1px solid var(--border-strong)',
          background: 'var(--pane)',
        }}
      >
        {s.cfg.showLineNos && (
          <div
            style={{
              width: 40,
              flex: 'none',
              padding: '10px 0',
              textAlign: 'right',
              borderRight: '1px solid var(--grid-line)',
              color: 'var(--text3)',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              lineHeight: 1.7,
              background: 'var(--pane2)',
            }}
          >
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} style={{ paddingRight: 8 }}>
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            fontFamily: 'var(--mono)',
            fontSize: s.cfg.fontSize + 'px',
            lineHeight: 1.7,
            whiteSpace: 'pre',
            overflow: 'auto',
          }}
        >
          <Cmt>-- revenue by country, snapshot A</Cmt>
          {'\n'}
          <Kw>SELECT</Kw> co.country,{'\n       '}
          <Kw>COUNT</Kw>(<Kw>DISTINCT</Kw> ci.city_id) <Kw>AS</Kw> cities,{'\n       '}
          <Kw>COUNT</Kw>(<Kw>DISTINCT</Kw> cu.customer_id) <Kw>AS</Kw> customers,{'\n       '}
          <Kw>SUM</Kw>(p.amount) <Kw>AS</Kw> revenue{'\n'}
          <Kw>FROM</Kw> country co{'\n'}
          <Kw>JOIN</Kw> city ci    <Kw>ON</Kw> ci.country_id = co.country_id{'\n'}
          <Kw>JOIN</Kw> address a  <Kw>ON</Kw> a.city_id = ci.city_id{'\n'}
          <Kw>JOIN</Kw> customer cu <Kw>ON</Kw> cu.address_id = a.address_id{'\n'}
          <Kw>JOIN</Kw> payment p  <Kw>ON</Kw> p.customer_id = cu.customer_id{'\n'}
          <Kw>WHERE</Kw> cu.active = <Num>1</Num> <Kw>AND</Kw> co.country &lt;&gt; <Str>''</Str>
          {'\n'}
          <Kw>GROUP BY</Kw> co.country{'\n'}
          <Kw>HAVING</Kw> revenue &gt; <Num>1000</Num>
          {'\n'}
          <Kw>ORDER BY</Kw> revenue <Kw>DESC</Kw> <Kw>LIMIT</Kw> <Num>20</Num>;
        </div>
      </div>

      <div
        style={{
          height: 26,
          flex: 'none',
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 11,
        }}
      >
        <div
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            borderRight: '1px solid var(--border)',
            background: 'var(--pane)',
            color: 'var(--accent)',
            fontWeight: 600,
            borderBottom: '2px solid var(--accent)',
          }}
        >
          {t.result} 1
        </div>
        <div
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            borderRight: '1px solid var(--border)',
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          {t.messages}
        </div>
        <div
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            borderRight: '1px solid var(--border)',
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          {t.profile}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            display: 'grid',
            gridTemplateColumns: RESULT_COLS,
            background: 'var(--pane2)',
            borderBottom: '1px solid var(--border-strong)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          <div style={{ padding: '5px 6px', borderRight: '1px solid var(--grid-line)' }} />
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>country</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>cities</div>
          <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>customers</div>
          <div style={{ padding: '5px 8px', textAlign: 'right' }}>revenue</div>
        </div>

        {RESULTS.map((q, i) => (
          <div
            key={q[0]}
            className="hv-row"
            style={row({
              display: 'grid',
              gridTemplateColumns: RESULT_COLS,
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
            <div style={{ padding: '0 8px', borderRight: '1px solid var(--grid-line)' }}>{q[0]}</div>
            <div style={{ padding: '0 8px', textAlign: 'right', fontFamily: 'var(--mono)', borderRight: '1px solid var(--grid-line)' }}>{q[1]}</div>
            <div style={{ padding: '0 8px', textAlign: 'right', fontFamily: 'var(--mono)', borderRight: '1px solid var(--grid-line)' }}>{q[2]}</div>
            <div style={{ padding: '0 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{q[3]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
