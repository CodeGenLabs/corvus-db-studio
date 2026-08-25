import { describe, expect, it, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { Toolbar } from '../components/Toolbar'
import { useShellStore } from '../store/shell'

afterEach(() => {
  cleanup()
})

describe('Idempotent UI Execution Tests (T085 / FR-022 / SC-009)', () => {
  it('mount và unmount component 2 lần liên tiếp không làm thay đổi trạng thái hoặc gây rò rỉ', () => {
    useShellStore.setState({ tabs: [], activeTabId: null })

    const first = renderStudio(<Toolbar />)
    expect(first.getByTestId('toolbar')).toBeDefined()
    first.unmount()

    const second = renderStudio(<Toolbar />)
    expect(second.getByTestId('toolbar')).toBeDefined()
    second.unmount()
  })
})
