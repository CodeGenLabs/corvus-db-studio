import type { CSSProperties, ReactNode } from 'react'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** Extra styling for the dialog surface (width, height…). */
  surface?: CSSProperties
  zIndex?: number
  align?: 'center' | 'top'
}

export function Modal({ onClose, children, surface, zIndex = 60, align = 'center' }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(12,14,15,.42)',
        display: 'flex',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        paddingTop: align === 'top' ? 120 : undefined,
        zIndex,
      }}
    >
      <div
        className="pop-in-slow"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          ...surface,
        }}
      >
        {children}
      </div>
    </div>
  )
}
