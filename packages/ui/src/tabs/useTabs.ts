import {
  isSameTabIdentity,
  tabIdentityKey,
  tabTitleOf,
  type Tab,
  type TabIdentity,
} from './tabIdentity'

export interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
}

/**
 * Mở một tab mới hoặc chuyển tiêu điểm tới tab đã có (Bất biến IV-F / SC-011).
 *
 * @param state Trạng thái tabs hiện tại
 * @param identity Danh tính tab cần mở
 * @param options Tuỳ chọn tiêu đề tuỳ biến
 * @returns State mới và tab được chọn
 */
export function openTabInState(
  state: TabsState,
  identity: TabIdentity,
  options?: { title?: string },
): { nextState: TabsState; tab: Tab; isNew: boolean } {
  const existing = state.tabs.find((t) => isSameTabIdentity(t.identity, identity))
  if (existing) {
    return {
      nextState: {
        ...state,
        activeTabId: existing.id,
      },
      tab: existing,
      isNew: false,
    }
  }

  const id = tabIdentityKey(identity)
  const newTab: Tab = {
    id,
    identity,
    title: options?.title ?? tabTitleOf(identity),
  }

  return {
    nextState: {
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    },
    tab: newTab,
    isNew: true,
  }
}

/**
 * Đóng một tab khỏi state.
 *
 * @param state Trạng thái tabs hiện tại
 * @param tabId ID của tab cần đóng
 * @returns State mới sau khi đóng
 */
export function closeTabInState(
  state: TabsState,
  tabId: string,
): { nextState: TabsState; closedTab?: Tab } {
  const targetIndex = state.tabs.findIndex((t) => t.id === tabId)
  if (targetIndex === -1) {
    return { nextState: state }
  }

  const closedTab = state.tabs[targetIndex]
  const nextTabs = state.tabs.filter((t) => t.id !== tabId)

  let nextActiveId = state.activeTabId
  if (state.activeTabId === tabId) {
    if (nextTabs.length === 0) {
      nextActiveId = null
    } else if (targetIndex < nextTabs.length) {
      nextActiveId = nextTabs[targetIndex]?.id ?? null
    } else {
      nextActiveId = nextTabs[nextTabs.length - 1]?.id ?? null
    }
  }

  return {
    nextState: {
      tabs: nextTabs,
      activeTabId: nextActiveId,
    },
    closedTab,
  }
}

/**
 * Cập nhật cờ dirty / missing cho một tab.
 */
export function updateTabInState(
  state: TabsState,
  tabId: string,
  patch: Partial<Pick<Tab, 'dirty' | 'missing' | 'title'>>,
): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
  }
}
