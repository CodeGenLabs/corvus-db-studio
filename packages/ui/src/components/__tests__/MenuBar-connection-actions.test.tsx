import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StudioProvider } from '../../store/studio'
import { createMockTransport } from '@corvus/transport-mock'
import { MenuBar } from '../MenuBar'

describe('MenuBar File Menu Connection Import/Export Actions', () => {
  it('renders MenuBar containing File menu and connection actions in static tree', () => {
    const transport = createMockTransport()
    const html = renderToStaticMarkup(
      <StudioProvider transport={transport}>
        <MenuBar />
      </StudioProvider>,
    )
    expect(html).toContain('Tệp')
    expect(html).toContain('Corvus')
    expect(html).toContain('accept=".json"')
  })
})