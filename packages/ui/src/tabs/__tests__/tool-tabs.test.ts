import { describe, expect, it } from 'vitest'
import {
  isSameTabIdentity,
  tabIdentityKey,
  tabTitleOf,
  type ToolTabIdentity,
} from '../tabIdentity'
import {
  closeTabInState,
  openTabInState,
  updateTabInState,
  type TabsState,
} from '../useTabs'

describe('Independent Tool Tabs (T055/T056 / US6 / Invariant IV-G)', () => {
  it('nhiều phiên SQL song song: hai ToolTabIdentity khác seq là hai tab độc lập', () => {
    const sql1: ToolTabIdentity = {
      type: 'tool',
      toolKind: 'sql',
      seq: 1,
      connectionId: 'conn-1',
    }
    const sql2: ToolTabIdentity = {
      type: 'tool',
      toolKind: 'sql',
      seq: 2,
      connectionId: 'conn-1',
    }

    expect(isSameTabIdentity(sql1, sql2)).toBe(false)
    expect(tabIdentityKey(sql1)).not.toBe(tabIdentityKey(sql2))
    expect(tabTitleOf(sql1)).toBe('SQL Query')
    expect(tabTitleOf(sql2)).toBe('SQL Query #2')
  })

  it('mở công cụ khi chưa chọn đối tượng nào hoạt động bình thường', () => {
    let state: TabsState = { tabs: [], activeTabId: null }
    const backupIdentity: ToolTabIdentity = {
      type: 'tool',
      toolKind: 'backup',
      seq: 1,
    }
    const res = openTabInState(state, backupIdentity)
    state = res.nextState

    expect(state.tabs.length).toBe(1)
    expect(state.activeTabId).toBe(tabIdentityKey(backupIdentity))
  })

  it('đổi lựa chọn và chuyển tab không làm mất trạng thái dirty của tab công cụ', () => {
    let state: TabsState = { tabs: [], activeTabId: null }
    const sql1: ToolTabIdentity = { type: 'tool', toolKind: 'sql', seq: 1 }
    const sql2: ToolTabIdentity = { type: 'tool', toolKind: 'sql', seq: 2 }

    state = openTabInState(state, sql1).nextState
    state = openTabInState(state, sql2).nextState

    const tab1Id = state.tabs[0]?.id ?? ''
    state = updateTabInState(state, tab1Id, { dirty: true })

    // Chuyển focus sang tab 2
    state = { ...state, activeTabId: state.tabs[1]?.id ?? '' }
    expect(state.tabs[0]?.dirty).toBe(true)

    // Đóng tab 2
    state = closeTabInState(state, state.tabs[1]?.id ?? '').nextState
    expect(state.tabs.length).toBe(1)
    expect(state.tabs[0]?.dirty).toBe(true)
  })
})
