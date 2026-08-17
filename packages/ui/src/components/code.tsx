import type { ReactNode } from 'react'

/** SQL keyword. */
export const Kw = ({ children }: { children: ReactNode }) => (
  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{children}</span>
)

/** String literal. */
export const Str = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--coral)' }}>{children}</span>

/** Comment. */
export const Cmt = ({ children }: { children: ReactNode }) => (
  <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>{children}</span>
)

/** Numeric literal. */
export const Num = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--amber)' }}>{children}</span>
