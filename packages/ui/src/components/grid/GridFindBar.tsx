import { useState } from 'react'

export interface GridFindBarProps {
  onSearch: (text: string, matchCase: boolean) => void
  onClose: () => void
  totalMatches?: number
  currentMatchIndex?: number
  onNextMatch?: () => void
  onPrevMatch?: () => void
}

export function GridFindBar({
  onSearch,
  onClose,
  totalMatches = 0,
  currentMatchIndex = 0,
  onNextMatch,
  onPrevMatch,
}: GridFindBarProps) {
  const [searchText, setSearchText] = useState('')
  const [matchCase, setMatchCase] = useState(false)

  const handleTextChange = (val: string) => {
    setSearchText(val)
    onSearch(val, matchCase)
  }

  return (
    <div
      style={{
        height: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        background: 'var(--pane)',
        borderBottom: '1px solid var(--border-strong)',
        fontSize: 11,
        zIndex: 10,
      }}
    >
      <span style={{ color: 'var(--text3)' }}>🔍 Tìm trong bảng:</span>
      <input
        autoFocus
        value={searchText}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNextMatch?.()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Tìm kiếm dữ liệu ô…"
        style={{
          width: 180,
          height: 20,
          padding: '0 6px',
          background: 'var(--pane2)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--text)',
          fontSize: 11,
        }}
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text2)' }}>
        <input
          type="checkbox"
          checked={matchCase}
          onChange={(e) => {
            setMatchCase(e.target.checked)
            onSearch(searchText, e.target.checked)
          }}
        />
        <span>Aa</span>
      </label>

      {searchText && (
        <span style={{ color: 'var(--text3)', fontSize: 10.5, marginLeft: 4 }}>
          {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0 kết quả'}
        </span>
      )}

      <button
        onClick={onPrevMatch}
        disabled={totalMatches === 0}
        style={{
          height: 20,
          padding: '0 5px',
          border: '1px solid var(--border)',
          background: 'transparent',
          borderRadius: 3,
          color: 'var(--text)',
          cursor: totalMatches === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        ▲
      </button>

      <button
        onClick={onNextMatch}
        disabled={totalMatches === 0}
        style={{
          height: 20,
          padding: '0 5px',
          border: '1px solid var(--border)',
          background: 'transparent',
          borderRadius: 3,
          color: 'var(--text)',
          cursor: totalMatches === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        ▼
      </button>

      <button
        onClick={onClose}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--text3)',
          cursor: 'pointer',
          marginLeft: 'auto',
          fontSize: 11,
        }}
      >
        ✕
      </button>
    </div>
  )
}
