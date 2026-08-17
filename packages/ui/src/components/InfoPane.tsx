import { Fragment } from 'react'
import { Kw } from './code'
import { fieldsFor, TABLES } from '../data/schema'
import { useStudio } from '../store/studio'
import type { InfoTab, TableRow } from '../types'

const TABS: { k: InfoTab; icon: string }[] = [
  { k: 'info', icon: 'M8 1.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4 M8 7.2v4 M8 4.9h.01' },
  { k: 'ddl', icon: 'M5.6 4.4L2.6 8l3 3.6 M10.4 4.4l3 3.6-3 3.6 M9.2 3.2l-2.4 9.6' },
  { k: 'activity', icon: 'M1.8 8.6h2.6l1.5-4.4 2 8 1.8-5.2 1.2 3.2h3.3' },
  {
    k: 'ai',
    icon: 'M8 1.9l1.5 3.9 3.9 1.5-3.9 1.5L8 12.7 6.5 8.8 2.6 7.3l3.9-1.5z M12.6 11.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z',
  },
]

const EMPTY_META: TableRow = ['', '—', '—', 'InnoDB', '—', '—']

function DdlBlock({ table }: { table: string }) {
  const fields = fieldsFor(table)
  const pk = fields[0].name
  return (
    <>
      <Kw>CREATE TABLE</Kw> {'`' + table + '` (\n'}
      {fields.map((f, i) => (
        <Fragment key={f.name}>
          {'  `' + f.name + '` '}
          <Kw>{f.ddl}</Kw>
          {f.notNull ? (
            <>
              {' '}
              <Kw>NOT NULL</Kw>
            </>
          ) : (
            <>
              {' '}
              <Kw>DEFAULT NULL</Kw>
            </>
          )}
          {i === 0 ? (
            ' AUTO_INCREMENT'
          ) : f.name === 'last_update' ? (
            <>
              {' '}
              <Kw>DEFAULT</Kw> CURRENT_TIMESTAMP <Kw>ON UPDATE</Kw> CURRENT_TIMESTAMP
            </>
          ) : null}
          {',\n'}
        </Fragment>
      ))}
      {'  '}
      <Kw>PRIMARY KEY</Kw> {'(`' + pk + '`)'}
      {fields.length > 1 && (
        <>
          {',\n  '}
          <Kw>KEY</Kw> {'`idx_' + fields[1].name + '` (`' + fields[1].name + '`)'}
        </>
      )}
      {'\n) '}
      <Kw>ENGINE</Kw>=InnoDB <Kw>DEFAULT CHARSET</Kw>=utf8mb4;
    </>
  )
}

export function InfoPane() {
  const { s, set, t, tr, infoOpen, beginDrag } = useStudio()

  const meta = TABLES.find((r) => r[0] === s.selTable) ?? EMPTY_META
  const facts: [string, string][] = [
    [tr('Số dòng', 'Rows'), meta[1]],
    ['Engine', meta[3]],
    ['Auto increment', meta[4]],
    ['Row format', 'Dynamic'],
    [tr('Dung lượng', 'Data length'), meta[2]],
    ['Index length', '16 KB'],
    ['Collation', 'utf8mb4_0900_ai_ci'],
    [tr('Tạo lúc', 'Created'), '2020-05-26 16:39'],
    [tr('Sửa lúc', 'Modified'), meta[5]],
  ]

  const activities: [string, string][] =
    s.lang === 'vi'
      ? [
          ['UPDATE customer SET active = 0 WHERE customer_id = 33', '12:05:02'],
          ['INSERT INTO customer (600 rows → 599 + 1)', '12:05:02'],
          ['Chụp ảnh dữ liệu B cho phiên so sánh', '12:05:02'],
          ['Chụp ảnh dữ liệu A trước khi CRUD', '12:04:31'],
          ['Mở bảng country @sakila', '12:03:58'],
          ['Kết nối Local Dev thành công', '12:01:10'],
        ]
      : [
          ['UPDATE customer SET active = 0 WHERE customer_id = 33', '12:05:02'],
          ['INSERT INTO customer (600 rows → 599 + 1)', '12:05:02'],
          ['Captured snapshot B for compare session', '12:05:02'],
          ['Captured snapshot A before CRUD batch', '12:04:31'],
          ['Opened table country @sakila', '12:03:58'],
          ['Connected to Local Dev', '12:01:10'],
        ]

  const aiMsgs: [boolean, string][] =
    s.lang === 'vi'
      ? [
          [true, 'Vì sao 3 dòng customer thay đổi sau batch vừa rồi?'],
          [false, 'Batch gồm 1 UPDATE (active), 1 UPDATE email và 1 trigger cập nhật last_update. Cột active của customer_id 33 chuyển 1 → 0 nên khách này rơi khỏi báo cáo doanh thu.'],
          [true, 'Sinh SQL hoàn tác giúp tôi.'],
          [false, 'Đã tạo 3 câu UPDATE và 1 DELETE dựa trên ảnh chụp A. Mở tab So sánh để xem trước.'],
        ]
      : [
          [true, 'Why did 3 customer rows change after the last batch?'],
          [false, 'The batch ran one UPDATE on active, one on email, and a trigger touched last_update. customer_id 33 moved active 1 → 0, so it drops out of the revenue report.'],
          [true, 'Generate the rollback SQL.'],
          [false, 'Built 3 UPDATE statements and 1 DELETE from snapshot A. Open the Compare tab to preview them.'],
        ]

  const tabLabel: Record<InfoTab, string> = { info: t.iInfo, ddl: t.iDdl, activity: t.iActivity, ai: t.iAi }

  return (
    <>
      <div
        className="hv-accent-bg"
        onMouseDown={(e) => beginDrag(e, 'info')}
        style={{
          width: infoOpen ? 4 : 0,
          flex: 'none',
          cursor: 'col-resize',
          background: s.dragPane === 'info' ? 'var(--accent)' : 'transparent',
          zIndex: 5,
        }}
      />

      <div
        style={{
          width: infoOpen ? s.infoW : 0,
          flex: 'none',
          overflow: 'hidden',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--pane2)',
        }}
      >
        <div
          style={{
            height: 26,
            flex: 'none',
            display: 'flex',
            alignItems: 'stretch',
            borderBottom: '1px solid var(--border)',
            background: 'var(--pane2)',
          }}
        >
          {TABS.map((d) => {
            const active = s.infoTab === d.k
            return (
              <div
                key={d.k}
                className="hv-text"
                onClick={() => set({ infoTab: d.k })}
                title={tabLabel[d.k]}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: active ? 600 : 400,
                  borderBottom: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
                  background: active ? 'var(--pane)' : 'transparent',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={d.icon} />
                </svg>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {s.infoTab === 'info' && (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    background: 'var(--accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  T
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.selTable}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>{t.tableObj} · sakila</div>
                </div>
              </div>
              {facts.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '5px 0',
                    borderBottom: '1px solid var(--grid-line)',
                  }}
                >
                  <span style={{ color: 'var(--text3)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {s.infoTab === 'ddl' && (
            <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              <DdlBlock table={s.selTable} />
            </div>
          )}

          {s.infoTab === 'activity' && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map(([text, time], i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <span
                    style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flex: 'none' }}
                  />
                  <div>
                    <div style={{ fontSize: 11.5 }}>{text}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 10.5, fontFamily: 'var(--mono)' }}>{time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {s.infoTab === 'ai' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMsgs.map(([me, text], i) => (
                  <div
                    key={i}
                    style={{
                      maxWidth: '92%',
                      alignSelf: me ? 'flex-end' : 'flex-start',
                      padding: '7px 9px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      background: me ? 'var(--accent-soft)' : 'var(--pane2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
              <div style={{ flex: 'none', padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[t.aiChip1, t.aiChip2].map((chip) => (
                    <span
                      key={chip}
                      className="hv-accent-border"
                      style={{
                        height: 20,
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 10,
                        fontSize: 10.5,
                        color: 'var(--text2)',
                        cursor: 'pointer',
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    height: 26,
                    border: '1px solid var(--border-strong)',
                    borderRadius: 5,
                    background: 'var(--pane2)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    color: 'var(--text3)',
                    fontSize: 11,
                  }}
                >
                  {t.aiPlaceholder}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
