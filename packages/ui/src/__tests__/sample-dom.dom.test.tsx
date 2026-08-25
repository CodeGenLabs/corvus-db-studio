import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Tăng
      </button>
    </div>
  )
}

describe('Phase 1 DOM Test Environment Check', () => {
  it('chạy trong jsdom và userEvent.click tương tác DOM thành công', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    const countEl = screen.getByTestId('count')
    expect(countEl.textContent).toBe('0')

    const button = screen.getByRole('button', { name: /Tăng/i })
    await user.click(button)

    expect(countEl.textContent).toBe('1')
  })
})
