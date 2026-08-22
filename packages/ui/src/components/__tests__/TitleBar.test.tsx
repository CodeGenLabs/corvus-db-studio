import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { TitleBar } from '../TitleBar'

describe('TitleBar Window Controls', () => {
  it('renders titlebar with drag region and window control buttons', () => {
    const html = renderToStaticMarkup(React.createElement(TitleBar))
    expect(html).toContain('Corvus DB Studio')
    expect(html).toContain('title="Minimize"')
    expect(html).toContain('title="Maximize"')
    expect(html).toContain('title="Close"')
  })
})