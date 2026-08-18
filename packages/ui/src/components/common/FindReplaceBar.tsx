import { useState } from 'react'

export interface FindReplaceBarProps {
  onFindNext: (query: string, options: { matchCase: boolean; wholeWord: boolean; regex: boolean }) => void
  onFindPrev: (query: string, options: { matchCase: boolean; wholeWord: boolean; regex: boolean }) => void
  onReplace: (replaceWith: string) => void
  onReplaceAll: (query: string, replaceWith: string, options: { matchCase: boolean; wholeWord: boolean; regex: boolean }) => void
  onClose: () => void
}

export function FindReplaceBar({
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: FindReplaceBarProps) {
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [showReplace, setShowReplace] = useState(true)
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)

  const options = { matchCase, wholeWord, regex: useRegex }

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        right: 20,
        background: 'var(--pane)',
        border: '1px solid var(--border-strong)',
        borderRadius: 6,
        boxShadow: 'var(--shadow)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 20,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setShowReplace(!showReplace)}
          style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 10 }}
        >
          {showReplace ? '▼' : '▶'}
        </button>
        <input
          value={findQuery}
          onChange={(e) => setFindQuery(e.target.value)}
          placeholder="Tìm kiếm…"
          style={{
            height: 22,
            padding: '0 6px',
            background: 'var(--pane2)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text)',
            width: 150,
          }}
        />
        <button
          onClick={() => onFindPrev(findQuery, options)}
          style={{ height: 22, padding: '0 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', cursor: 'pointer' }}
        >
          ▲
        </button>
        <button
          onClick={() => onFindNext(findQuery, options)}
          style={{ height: 22, padding: '0 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', cursor: 'pointer' }}
        >
          ▼
        </button>
        <button
          onClick={() => setMatchCase(!matchCase)}
          style={{
            height: 22,
            padding: '0 5px',
            background: matchCase ? 'var(--accent-soft)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: matchCase ? 'var(--accent)' : 'var(--text3)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Khớp chữ hoa/thường (Match Case)"
        >
          Aa
        </button>
        <button
          onClick={() => setWholeWord(!wholeWord)}
          style={{
            height: 22,
            padding: '0 5px',
            background: wholeWord ? 'var(--accent-soft)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: wholeWord ? 'var(--accent)' : 'var(--text3)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Toàn bộ từ (Whole Word)"
        >
          \b
        </button>
        <button
          onClick={() => setUseRegex(!useRegex)}
          style={{
            height: 22,
            padding: '0 5px',
            background: useRegex ? 'var(--accent-soft)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: useRegex ? 'var(--accent)' : 'var(--text3)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Biểu thức chính quy (Regex)"
        >
          .*
        </button>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', marginLeft: 4 }}
        >
          ✕
        </button>
      </div>

      {showReplace && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14 }}>
          <input
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Thay thế bằng…"
            style={{
              height: 22,
              padding: '0 6px',
              background: 'var(--pane2)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text)',
              width: 150,
            }}
          />
          <button
            onClick={() => onReplace(replaceQuery)}
            style={{ height: 22, padding: '0 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', cursor: 'pointer' }}
          >
            Thay thế
          </button>
          <button
            onClick={() => onReplaceAll(findQuery, replaceQuery, options)}
            style={{ height: 22, padding: '0 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', cursor: 'pointer' }}
          >
            Tất cả
          </button>
        </div>
      )}
    </div>
  )
}
