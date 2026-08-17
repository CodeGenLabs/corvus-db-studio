import { Modal } from './Modal'
import { DB_USERS } from '../../data/schema'
import { useStudio } from '../../store/studio'

const COLS = '1fr 130px 150px 140px 150px'

export function UsersDialog() {
  const { s, set, t, rowH } = useStudio()
  const close = () => set({ dialog: null })

  return (
    <Modal onClose={close} surface={{ width: 720, height: 440, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ fontWeight: 600 }}>{t.usersTitle}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>6 · sakila @ Local Dev</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <div
            style={{
              height: 24,
              padding: '0 11px',
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
            {t.usersNew}
          </div>
          <div
            className="hv-accent-border"
            style={{
              height: 24,
              padding: '0 11px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              color: 'var(--text2)',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            {t.usersRoles}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          height: 24,
          flex: 'none',
          alignItems: 'center',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '.3px',
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }}
      >
        <div style={{ padding: '0 10px' }}>{t.usersUser}</div>
        <div style={{ padding: '0 10px' }}>{t.usersHost}</div>
        <div style={{ padding: '0 10px' }}>{t.usersRole}</div>
        <div style={{ padding: '0 10px' }}>{t.usersLast}</div>
        <div style={{ padding: '0 10px' }}>{t.usersState}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {DB_USERS.map((u, i) => {
          const color = u[4] === 'active' ? 'var(--green)' : u[4] === 'locked' ? 'var(--amber)' : 'var(--red)'
          return (
            <div
              key={u[0]}
              className="hv-row"
              onClick={() => set({ userSel: u[0] })}
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                height: rowH + 5,
                alignItems: 'center',
                cursor: 'pointer',
                borderBottom: '1px solid var(--grid-line)',
                background: s.userSel === u[0] ? 'var(--accent-soft)' : i % 2 ? 'var(--row-alt)' : 'transparent',
              }}
            >
              <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    flex: 'none',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  {u[0].slice(0, 2).toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>{u[0]}</span>
              </div>
              <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{u[1]}</div>
              <div style={{ padding: '0 10px', color: 'var(--text2)' }}>{u[2]}</div>
              <div style={{ padding: '0 10px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{u[3]}</div>
              <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 17,
                    padding: '0 7px',
                    borderRadius: 9,
                    fontSize: 10,
                    fontWeight: 600,
                    color,
                    border: '1px solid ' + color + '55',
                  }}
                >
                  {u[4]}
                </span>
                <span style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>{t.usersEdit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{t.usersHint}</span>
        <div
          onClick={close}
          style={{
            marginLeft: 'auto',
            height: 26,
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.close}
        </div>
      </div>
    </Modal>
  )
}
