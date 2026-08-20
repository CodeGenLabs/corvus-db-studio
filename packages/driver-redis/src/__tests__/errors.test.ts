import { describe, expect, it } from 'vitest'
import { toCorvusError } from '../errors'

describe('Redis Error Mapping', () => {
  it('ánh xạ lỗi NOAUTH / WRONGPASS -> UNAUTHORIZED', () => {
    const err1 = toCorvusError(new Error('NOAUTH Authentication required.'))
    const err2 = toCorvusError(new Error('WRONGPASS invalid password'))
    expect(err1.code).toBe('UNAUTHORIZED')
    expect(err2.code).toBe('UNAUTHORIZED')
  })

  it('ánh xạ lỗi NOPERM -> FORBIDDEN', () => {
    const err = toCorvusError(new Error('NOPERM User has no permissions to run the command'))
    expect(err.code).toBe('FORBIDDEN')
  })

  it('ánh xạ lỗi WRONGTYPE -> INVALID_INPUT', () => {
    const err = toCorvusError(new Error('WRONGTYPE Operation against a key holding the wrong kind of value'))
    expect(err.code).toBe('INVALID_INPUT')
  })

  it('ánh xạ lỗi READONLY -> READ_ONLY', () => {
    const err = toCorvusError(new Error('READONLY You can\'t write against a read only replica.'))
    expect(err.code).toBe('READ_ONLY')
  })
})
