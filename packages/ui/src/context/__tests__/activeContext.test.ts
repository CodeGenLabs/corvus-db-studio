import { describe, expect, it } from 'vitest'
import {
  INITIAL_ACTIVE_CONTEXT,
  createSelection,
  transitionConnectionState,
  type ActiveContext,
} from '../activeContext'

describe('ActiveContext Invariants A-1 to A-8 (contracts/active-context.md §5)', () => {
  it('A-1 · Khởi điểm an toàn: connectionId null, capabilities null, connectionState closed', () => {
    expect(INITIAL_ACTIVE_CONTEXT.connectionId).toBeNull()
    expect(INITIAL_ACTIVE_CONTEXT.capabilities).toBeNull()
    expect(INITIAL_ACTIVE_CONTEXT.connectionState).toBe('closed')
    expect(INITIAL_ACTIVE_CONTEXT.selection.targets).toEqual([])
    expect(INITIAL_ACTIVE_CONTEXT.lastError).toBeNull()
  })

  it('A-2 · Chuyển trạng thái sang opening khi bắt đầu mở', () => {
    const next = transitionConnectionState('closed', 'start-open')
    expect(next).toBe('opening')
  })

  it('A-3 · Chuyển trạng thái sang open khi mở thành công', () => {
    const next = transitionConnectionState('opening', 'open-success')
    expect(next).toBe('open')
  })

  it('A-4 · Chuyển trạng thái sang error khi mở thất bại', () => {
    const next = transitionConnectionState('opening', 'open-error')
    expect(next).toBe('error')
  })

  it('A-5 · Chuyển trạng thái sang closed khi đóng kết nối', () => {
    const fromOpen = transitionConnectionState('open', 'close')
    expect(fromOpen).toBe('closed')

    const fromError = transitionConnectionState('error', 'close')
    expect(fromError).toBe('closed')
  })

  it('A-6 · createSelection tạo đúng đối tượng ObjectSelection với primaryTarget và kind', () => {
    const singleSel = createSelection(['employees'], 'table', 'employees')
    expect(singleSel.targets).toEqual(['employees'])
    expect(singleSel.objectKind).toBe('table')
    expect(singleSel.primaryTarget).toBe('employees')

    const multiSel = createSelection(['t1', 't2', 't3'], 'table')
    expect(multiSel.targets).toEqual(['t1', 't2', 't3'])
    expect(multiSel.primaryTarget).toBe('t1')
  })

  it('A-7 · ActiveContext chứa đầy đủ trường để chrome không cần hardcode', () => {
    const ctx: ActiveContext = {
      connectionId: 'conn-pg',
      connectionName: 'PostgreSQL Local Dev',
      driverId: 'postgres',
      serverVersion: 'PostgreSQL 16.2',
      serverEncoding: 'UTF8',
      database: 'corvus_dev',
      namespace: 'public',
      selection: createSelection(['users'], 'table', 'users'),
      capabilities: null,
      connectionState: 'open',
      lastError: null,
    }

    expect(ctx.connectionName).toBe('PostgreSQL Local Dev')
    expect(ctx.serverVersion).toBe('PostgreSQL 16.2')
    expect(ctx.serverEncoding).toBe('UTF8')
    expect(ctx.database).toBe('corvus_dev')
    expect(ctx.namespace).toBe('public')
  })

  it('A-8 · RedactedError có cấu trúc an toàn không chứa vết ngăn xếp hay mật khẩu thô', () => {
    const ctxWithError: ActiveContext = {
      ...INITIAL_ACTIVE_CONTEXT,
      connectionState: 'error',
      lastError: {
        messageKey: 'navLoadFailed',
        detail: 'Connection refused on 127.0.0.1:5432',
        retryable: true,
      },
    }

    expect(ctxWithError.lastError?.messageKey).toBe('navLoadFailed')
    expect(ctxWithError.lastError?.detail).not.toMatch(/password|secret|trace/i)
    expect(ctxWithError.lastError?.retryable).toBe(true)
  })
})
