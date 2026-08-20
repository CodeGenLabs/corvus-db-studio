import { describe, expect, it } from 'vitest'
import { toCorvusError } from '../errors'

describe('MongoDB Error Mapping', () => {
  it('ánh xạ lỗi DuplicateKey (11000) -> DUPLICATE_KEY', () => {
    const err = toCorvusError({ code: 11000, message: 'E11000 duplicate key error collection' })
    expect(err.code).toBe('DUPLICATE_KEY')
  })

  it('ánh xạ lỗi Unauthorized (13) -> UNAUTHORIZED', () => {
    const err = toCorvusError({ code: 13, message: 'command find requires authentication' })
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('ánh xạ lỗi NamespaceNotFound (26) -> NOT_FOUND', () => {
    const err = toCorvusError({ code: 26, message: 'ns not found' })
    expect(err.code).toBe('NOT_FOUND')
  })

  it('ánh xạ lỗi MaxTimeMSExpired (50) -> QUERY_TIMEOUT', () => {
    const err = toCorvusError({ code: 50, message: 'operation exceeded time limit' })
    expect(err.code).toBe('QUERY_TIMEOUT')
  })

  it('ánh xạ lỗi Interrupted (11600) -> QUERY_CANCELLED', () => {
    const err = toCorvusError({ code: 11600, message: 'interrupted at shutdown' })
    expect(err.code).toBe('QUERY_CANCELLED')
  })
})
