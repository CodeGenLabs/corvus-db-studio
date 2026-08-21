import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { MockModeBanner } from '../MockModeBanner'
import App from '../../App'
import { createMockTransport } from '@corvus/transport-mock'

describe('MockModeBanner coverage (T043a / SC-003)', () => {
  it('render MockModeBanner độc lập chứa đầy đủ badge, thông điệp và gợi ý pnpm dev:db', () => {
    const html = renderToStaticMarkup(React.createElement(MockModeBanner))
    expect(html).toContain('data-testid="mock-mode-banner"')
    expect(html).toContain('Mock Mode')
    expect(html).toContain('MÔI TRƯỜNG DỮ LIỆU GIẢ LẬP — KHÔNG KẾT NỐI DATABASE THẬT')
    expect(html).toContain('pnpm dev:db')
  })

  it('App với isMockMode=true hiển thị MockModeBanner', () => {
    const transport = createMockTransport()
    const html = renderToStaticMarkup(React.createElement(App, { transport, isMockMode: true }))
    expect(html).toContain('data-testid="mock-mode-banner"')
    expect(html).toContain('MÔI TRƯỜNG DỮ LIỆU GIẢ LẬP')
  })

  it('App với isMockMode=false hoặc undefined không hiển thị MockModeBanner', () => {
    const transport = createMockTransport()
    const html1 = renderToStaticMarkup(React.createElement(App, { transport, isMockMode: false }))
    expect(html1).not.toContain('data-testid="mock-mode-banner"')

    const html2 = renderToStaticMarkup(React.createElement(App, { transport }))
    expect(html2).not.toContain('data-testid="mock-mode-banner"')
  })
})
