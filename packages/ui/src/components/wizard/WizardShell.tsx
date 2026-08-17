import type { ReactNode } from 'react'

export interface WizardStep {
  id: string
  title: string
}

export interface WizardShellProps {
  title: string
  steps: WizardStep[]
  currentStepIndex: number
  onStepChange: (index: number) => void
  onCancel: () => void
  onFinish: () => void
  isFinishDisabled?: boolean
  children: ReactNode
}

export function WizardShell({
  title,
  steps,
  currentStepIndex,
  onStepChange,
  onCancel,
  onFinish,
  isFinishDisabled = false,
  children,
}: WizardShellProps) {
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--pane)',
        borderRadius: 8,
        border: '1px solid var(--border-strong)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text)',
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left step sidebar */}
        <div
          style={{
            width: 180,
            borderRight: '1px solid var(--border)',
            background: 'var(--pane2)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex
            const isCompleted = idx < currentStepIndex
            return (
              <div
                key={step.id}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : isCompleted ? 'var(--text)' : 'var(--text3)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    background: isActive ? 'var(--accent)' : isCompleted ? 'var(--border-strong)' : 'transparent',
                    color: isActive ? 'var(--on-accent)' : 'var(--text2)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span>{step.title}</span>
              </div>
            )
          })}
        </div>

        {/* Center content */}
        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>{children}</div>
      </div>

      {/* Bottom action bar */}
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            height: 26,
            padding: '0 12px',
            borderRadius: 4,
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: 11.5,
            cursor: 'pointer',
          }}
        >
          Huỷ
        </button>

        {!isFirstStep && (
          <button
            onClick={() => onStepChange(currentStepIndex - 1)}
            style={{
              height: 26,
              padding: '0 12px',
              borderRadius: 4,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            ‹ Quay lại
          </button>
        )}

        {isLastStep ? (
          <button
            onClick={onFinish}
            disabled={isFinishDisabled}
            style={{
              height: 26,
              padding: '0 14px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: isFinishDisabled ? 'not-allowed' : 'pointer',
              opacity: isFinishDisabled ? 0.5 : 1,
            }}
          >
            Bắt đầu
          </button>
        ) : (
          <button
            onClick={() => onStepChange(currentStepIndex + 1)}
            style={{
              height: 26,
              padding: '0 14px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tiếp tục ›
          </button>
        )}
      </div>
    </div>
  )
}
