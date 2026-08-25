import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TitleBar } from '../TitleBar'
import { StudioProvider } from '../../store/studio'
import type { Transport } from '@corvus/contract'

const dummyTransport: Transport = {
  status: 'ready',
  request: async <TResult = unknown>() => ({} as TResult),
  stream() {
    return (async function* () {})()
  },
  subscribe() {
    return () => {}
  },
  onStatusChange() {
    return () => {}
  },
}

describe('TitleBar Window Controls', () => {
  it('renders titlebar with drag region and window control buttons', () => {
    const html = renderToStaticMarkup(
      <StudioProvider transport={dummyTransport}>
        <TitleBar />
      </StudioProvider>,
    )
    expect(html).toContain('Corvus DB Studio')
    expect(html).toContain('title="Minimize"')
    expect(html).toContain('title="Maximize"')
    expect(html).toContain('title="Close"')
  })
})