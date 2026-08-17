import { Modal } from './Modal'
import { useStudio } from '../../store/studio'
import type { Config, MonoKey, SettingsSection } from '../../types'

type BoolKey = {
  [K in keyof Config]: Config[K] extends boolean ? K : never
}[keyof Config]

type NumKey = {
  [K in keyof Config]: Config[K] extends number ? K : never
}[keyof Config]

type Row =
  | { kind: 'toggle'; label: string; hint: string; key: BoolKey }
  | { kind: 'seg'; label: string; hint: string; value: string; options: [string, string][]; pick: (v: string) => void }
  | { kind: 'num'; label: string; hint: string; key: NumKey; step: number; unit: string; min: number; max: number }
  | { kind: 'font'; label: string; hint: string }

const MONO_SAMPLE = 'SELECT 1 | 名前 abc .:iW'

export function SettingsDialog() {
  const { s, set, setCfg, t, tr } = useStudio()
  const close = () => set({ dialog: null })
  const cfg = s.cfg

  const sections: [SettingsSection, string][] = [
    ['general', tr('Chung', 'General')],
    ['appearance', tr('Hiển thị', 'Appearance')],
    ['editor', tr('Trình soạn SQL', 'SQL editor')],
    ['grid', tr('Lưới dữ liệu', 'Data grid')],
    ['conn', tr('Kết nối', 'Connections')],
    ['ai', tr('Trợ lý AI', 'AI assistant')],
  ]

  const monoFonts: [MonoKey, string, string][] = [
    ['plex', 'IBM Plex Mono', tr('Gọn, latin sắc nét; chữ Nhật dùng font hệ thống', 'Tight latin; Japanese falls back to the system font')],
    ['mplus', 'M PLUS 1 Code', tr('Chữ Nhật rộng đúng 2 ô latin — nên dùng khi có tiếng Nhật', 'Japanese glyphs are exactly 2 latin cells wide')],
    ['noto', 'Noto Sans Mono', tr('Phủ ký tự rộng, dấu chấm và w cùng bề rộng', 'Wide coverage; period and w share one cell')],
    ['jb', 'JetBrains Mono', tr('Chữ cao, dễ đọc ở cỡ nhỏ', 'Tall x-height, readable at small sizes')],
    ['system', tr('Font hệ thống', 'System monospace'), tr('Theo máy: SF Mono, Consolas, BIZ UDGothic', 'Per machine: SF Mono, Consolas, BIZ UDGothic')],
  ]

  const ROWS: Record<SettingsSection, Row[]> = {
    general: [
      {
        kind: 'seg',
        label: tr('Ngôn ngữ', 'Language'),
        hint: tr('Áp dụng ngay', 'Applies immediately'),
        value: s.lang,
        options: [['vi', 'VI'], ['en', 'EN'], ['ja', 'JA']],
        pick: (v) => set({ lang: v as typeof s.lang }),
      },
      {
        kind: 'seg',
        label: tr('Màn hình khi mở', 'View on startup'),
        hint: tr('Tab mở sẵn khi khởi động', 'Tab opened at launch'),
        value: cfg.startupView,
        options: [['objects', t.tabObjects], ['sql', 'SQL']],
        pick: (v) => setCfg('startupView', v as Config['startupView']),
      },
      {
        kind: 'toggle',
        label: tr('Xác nhận trước khi xoá', 'Confirm before delete'),
        hint: tr('Hỏi lại với DROP và DELETE', 'Ask again for DROP and DELETE'),
        key: 'confirmDelete',
      },
      {
        kind: 'num',
        label: tr('Thời gian chờ truy vấn', 'Query timeout'),
        hint: tr('Huỷ truy vấn quá hạn', 'Cancel long-running queries'),
        key: 'timeout',
        step: 5,
        unit: ' s',
        min: 5,
        max: 300,
      },
    ],
    appearance: [
      {
        kind: 'seg',
        label: tr('Chủ đề', 'Theme'),
        hint: '',
        value: s.theme,
        options: [['light', tr('Sáng', 'Light')], ['dark', tr('Tối', 'Dark')]],
        pick: (v) => set({ theme: v as 'light' | 'dark' }),
      },
      {
        kind: 'seg',
        label: tr('Mật độ dòng', 'Row density'),
        hint: tr('Chiều cao dòng trong lưới và cây', 'Row height in grids and tree'),
        value: cfg.density,
        options: [['compact', tr('Gọn', 'Compact')], ['comfortable', tr('Thoáng', 'Comfortable')]],
        pick: (v) => setCfg('density', v as Config['density']),
      },
      { kind: 'num', label: tr('Cỡ chữ mã', 'Code font size'), hint: 'IBM Plex Mono', key: 'fontSize', step: 0.5, unit: ' px', min: 10, max: 18 },
    ],
    editor: [
      { kind: 'font', label: tr('Font hiển thị mã', 'Code font'), hint: tr('Dùng cho SQL, DDL, tên cột và lưới dữ liệu', 'Used for SQL, DDL, column names and the data grid') },
      { kind: 'toggle', label: tr('Hiện số dòng', 'Show line numbers'), hint: '', key: 'showLineNos' },
      {
        kind: 'toggle',
        label: tr('Từ khoá viết hoa', 'Uppercase keywords'),
        hint: tr('Tự chuẩn hoá khi định dạng', 'Normalised when formatting'),
        key: 'sqlUpper',
      },
      {
        kind: 'seg',
        label: tr('Bộ phím tắt', 'Keymap'),
        hint: '',
        value: cfg.keymap,
        options: [['default', 'Default'], ['vim', 'Vim']],
        pick: (v) => setCfg('keymap', v as Config['keymap']),
      },
    ],
    grid: [
      {
        kind: 'toggle',
        label: tr('Tự động ghi (auto commit)', 'Auto commit'),
        hint: tr('Tắt để gom thay đổi thành transaction', 'Off batches edits into a transaction'),
        key: 'autoCommit',
      },
      { kind: 'num', label: tr('Số dòng mỗi trang', 'Rows per page'), hint: '', key: 'rowLimit', step: 500, unit: '', min: 100, max: 10000 },
      {
        kind: 'seg',
        label: tr('Hiển thị NULL', 'NULL display'),
        hint: '',
        value: cfg.gridNull,
        options: [['highlight', tr('Tô nền', 'Highlight')], ['plain', tr('Chữ thường', 'Plain')]],
        pick: (v) => setCfg('gridNull', v as Config['gridNull']),
      },
    ],
    conn: [
      {
        kind: 'toggle',
        label: tr('Mặc định dùng SSL/TLS', 'Default to SSL/TLS'),
        hint: tr('Áp dụng cho kết nối mới', 'Applied to new connections'),
        key: 'sslDefault',
      },
      {
        kind: 'toggle',
        label: tr('Tự cập nhật', 'Auto update'),
        hint: tr('Tải bản mới ở chế độ nền', 'Download new builds in background'),
        key: 'autoUpdate',
      },
    ],
    ai: [
      {
        kind: 'seg',
        label: tr('Mô hình', 'Model'),
        hint: '',
        value: cfg.aiModel,
        options: [['Claude Sonnet', 'Sonnet'], ['Claude Opus', 'Opus']],
        pick: (v) => setCfg('aiModel', v),
      },
      {
        kind: 'toggle',
        label: tr('Cho phép đọc schema', 'Allow schema access'),
        hint: tr('Không gửi dữ liệu dòng', 'Row data is never sent'),
        key: 'aiSchemaAccess',
      },
    ],
  }

  const rows = ROWS[s.setSection]

  return (
    <Modal onClose={close} surface={{ width: 700, height: 460, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontWeight: 600,
        }}
      >
        {t.settings}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ width: 168, flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--pane2)', padding: '6px 0' }}>
          {sections.map(([key, label]) => {
            const on = s.setSection === key
            return (
              <div
                key={key}
                className="hv-pane"
                onClick={() => set({ setSection: key })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 28,
                  padding: '0 14px',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  background: on ? 'var(--pane)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: on ? 600 : 400,
                  borderLeft: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '12px 16px' }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--grid-line)' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{r.hint}</div>
              </div>

              {r.kind === 'toggle' && (
                <div
                  onClick={() => setCfg(r.key, !cfg[r.key])}
                  style={{
                    width: 34,
                    height: 19,
                    borderRadius: 10,
                    flex: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    background: cfg[r.key] ? 'var(--accent)' : 'var(--border-strong)',
                    transition: 'background .15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: cfg[r.key] ? 17 : 2,
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left .15s',
                    }}
                  />
                </div>
              )}

              {r.kind === 'seg' && (
                <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 5, overflow: 'hidden', flex: 'none' }}>
                  {r.options.map(([value, label]) => {
                    const on = r.value === value
                    return (
                      <div
                        key={value}
                        onClick={() => r.pick(value)}
                        style={{
                          height: 22,
                          padding: '0 10px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: on ? 600 : 400,
                          background: on ? 'var(--accent-soft)' : 'transparent',
                          color: on ? 'var(--accent)' : 'var(--text2)',
                        }}
                      >
                        {label}
                      </div>
                    )
                  })}
                </div>
              )}

              {r.kind === 'num' && (
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 5, overflow: 'hidden', flex: 'none' }}>
                  <div
                    className="hv-accent"
                    onClick={() => setCfg(r.key, Math.max(r.min, Math.round((cfg[r.key] - r.step) * 10) / 10))}
                    style={{
                      width: 24,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text2)',
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    −
                  </div>
                  <div style={{ minWidth: 74, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                    {cfg[r.key]}
                    {r.unit}
                  </div>
                  <div
                    className="hv-accent"
                    onClick={() => setCfg(r.key, Math.min(r.max, Math.round((cfg[r.key] + r.step) * 10) / 10))}
                    style={{
                      width: 24,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text2)',
                      borderLeft: '1px solid var(--border)',
                    }}
                  >
                    +
                  </div>
                </div>
              )}

              {r.kind === 'font' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 320, flex: 'none' }}>
                  {monoFonts.map(([key, name, note]) => {
                    const on = cfg.mono === key
                    return (
                      <div
                        key={key}
                        className="hv-border-accent"
                        onClick={() => setCfg('mono', key)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          padding: '6px 9px',
                          borderRadius: 5,
                          cursor: 'pointer',
                          border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                          background: on ? 'var(--accent-soft)' : 'var(--pane)',
                        }}
                      >
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? 'var(--accent)' : 'var(--text)' }}>{name}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{note}</span>
                        <span
                          style={{
                            marginTop: 3,
                            fontFamily: `"${key === 'system' ? 'ui-monospace' : name}", monospace`,
                            fontSize: 11.5,
                            color: 'var(--text2)',
                            letterSpacing: 0,
                          }}
                        >
                          {MONO_SAMPLE}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
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
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{t.settingsHint}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div
            onClick={close}
            style={{
              height: 26,
              padding: '0 11px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            {t.cancel}
          </div>
          <div
            onClick={close}
            style={{
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
            {t.save}
          </div>
        </div>
      </div>
    </Modal>
  )
}
