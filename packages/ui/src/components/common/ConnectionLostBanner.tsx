import { useState, useEffect } from 'react'

export interface ConnectionLostBannerProps {
  onReconnect?: () => void
}

export function ConnectionLostBanner({ onReconnect }: ConnectionLostBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(5)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    if (isReconnecting) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleReconnect()
          return 5
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isReconnecting])

  const handleReconnect = () => {
    setIsReconnecting(true)
    if (onReconnect) onReconnect()
    setTimeout(() => {
      setIsReconnecting(false)
      setSecondsLeft(5)
    }, 1200)
  }

  return (
    <div
      style={{
        height: 28,
        background: '#ef4444',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontSize: 11,
        fontWeight: 500,
        zIndex: 50,
      }}
    >
      <span>⚠️ Đã mất kết nối tới máy chủ cơ sở dữ liệu.</span>
      <span>
        {isReconnecting ? 'Đang thử kết nối lại…' : `Tự động thử lại sau ${secondsLeft}s`}
      </span>
      <button
        onClick={handleReconnect}
        disabled={isReconnecting}
        style={{
          height: 18,
          padding: '0 8px',
          background: 'rgba(255, 255, 255, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 3,
          color: '#ffffff',
          fontSize: 10,
          cursor: isReconnecting ? 'not-allowed' : 'pointer',
        }}
      >
        Kết nối ngay
      </button>
    </div>
  )
}
