import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import type { CorvusAppProps } from '../App'
import { useClient } from '../store/studio'

describe('no-mock-default (FR-011, SC-002)', () => {
  it('useClient ném lỗi rõ ràng khi gọi ngoài StudioProvider hoặc không có transport', () => {
    function TestComp() {
      useClient()
      return React.createElement('div', null, 'test')
    }

    expect(() => {
      renderToStaticMarkup(React.createElement(TestComp))
    }).toThrow(/useClient must be used within a StudioProvider with a valid transport/)
  })

  it('CorvusAppProps bắt buộc transport', () => {
    // Type checking verification: transport cannot be omitted
    type HasRequiredTransport<T> = 'transport' extends keyof T
      ? undefined extends T['transport']
        ? false
        : true
      : false

    const isRequired: HasRequiredTransport<CorvusAppProps> = true
    expect(isRequired).toBe(true)
  })
})
