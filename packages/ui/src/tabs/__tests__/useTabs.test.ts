import { describe, expect, it } from 'vitest'
import {
  closeTabInState,
  openTabInState,
  updateTabInState,
  type TabsState,
} from '../useTabs'
import type { ObjectTabIdentity } from '../tabIdentity'

describe('Tabs state transitions (T044/T045 / SC-011 / Invariant IV-G)', () => {
  it('mở 5 đối tượng khác nhau tạo ra đúng 5 tab (SC-011)', () => {
    let state: TabsState = { tabs: [], activeTabId: null }
    const tableNames = ['actor', 'film', 'customer', 'payment', 'rental']

    for (const name of tableNames) {
      const identity: ObjectTabIdentity = {
        type: 'object',
        contentKind: 'data',
        connectionId: 'conn-1',
        database: 'sakila',
        objectKind: 'table',
        name,
      }
      const res = openTabInState(state, identity)
      state = res.nextState
      expect(res.isNew).toBe(true)
    }

    expect(state.tabs.length).toBe(5)
    expect(state.activeTabId).toContain('rental')
  })

  it('chọn lại đối tượng đã mở không tăng số tab, chỉ chuyển tiêu điểm (Invariant IV-F)', () => {
    let state: TabsState = { tabs: [], activeTabId: null }
    const actorIdentity: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'sakila',
      objectKind: 'table',
      name: 'actor',
    }
    const filmIdentity: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'sakila',
      objectKind: 'table',
      name: 'film',
    }

    state = openTabInState(state, actorIdentity).nextState
    state = openTabInState(state, filmIdentity).nextState
    expect(state.tabs.length).toBe(2)
    expect(state.activeTabId).toContain('film')

    // Chọn lại actor
    const res = openTabInState(state, actorIdentity)
    state = res.nextState
    expect(res.isNew).toBe(false)
    expect(state.tabs.length).toBe(2)
    expect(state.activeTabId).toContain('actor')
  })

  it('đóng một tab chuyển active sang tab lân cận và không ảnh hưởng tab khác (Invariant IV-G)', () => {
    let state: TabsState = { tabs: [], activeTabId: null }
    const t1: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      objectKind: 'table',
      name: 't1',
    }
    const t2: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      objectKind: 'table',
      name: 't2',
    }
    const t3: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      objectKind: 'table',
      name: 't3',
    }

    state = openTabInState(state, t1).nextState
    state = openTabInState(state, t2).nextState
    state = openTabInState(state, t3).nextState

    // Đánh dấu t1 dirty
    const t1Id = state.tabs[0]?.id ?? ''
    state = updateTabInState(state, t1Id, { dirty: true })

    // Đóng t2 (ở giữa)
    const t2Id = state.tabs[1]?.id ?? ''
    state = closeTabInState(state, t2Id).nextState

    expect(state.tabs.length).toBe(2)
    expect(state.tabs[0]?.dirty).toBe(true) // t1 vẫn dirty
    expect(state.tabs.map((t) => t.identity.type === 'object' ? t.identity.name : '')).toEqual(['t1', 't3'])
  })
})
