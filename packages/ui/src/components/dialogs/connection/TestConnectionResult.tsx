export interface TestResultData {
  ok: boolean
  version?: string
  latencyMs?: number
  error?: string
}

interface TestConnectionResultProps {
  loading: boolean
  result: TestResultData | null
}

export function TestConnectionResult({ loading, result }: TestConnectionResultProps) {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--accent)',
        }}
      >
        <span>Đang kiểm tra kết nối...</span>
      </div>
    )
  }

  if (!result) return null

  if (result.ok) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 4,
          background: 'rgba(74, 222, 128, 0.15)',
          color: '#4ade80',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        <span>✓ Đã kết nối thành công</span>
        {result.version && <span>· {result.version}</span>}
        {result.latencyMs !== undefined && <span>· {result.latencyMs} ms</span>}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 4,
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        fontSize: 11,
      }}
    >
      <span>✕ Kết nối thất bại: {result.error || 'Unknown error'}</span>
    </div>
  )
}
