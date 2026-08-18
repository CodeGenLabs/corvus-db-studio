import { create } from 'zustand'

export interface PaneState {
  isNavPaneVisible: boolean
  isInfoPaneVisible: boolean
  isMaximized: boolean
  toggleNavPane: () => void
  toggleInfoPane: () => void
  toggleMaximize: () => void
  restorePanes: () => void
}

export const usePaneState = create<PaneState>((set) => ({
  isNavPaneVisible: true,
  isInfoPaneVisible: true,
  isMaximized: false,
  toggleNavPane: () => set((state) => ({ isNavPaneVisible: !state.isNavPaneVisible })),
  toggleInfoPane: () => set((state) => ({ isInfoPaneVisible: !state.isInfoPaneVisible })),
  toggleMaximize: () =>
    set((state) => {
      const nextMaximized = !state.isMaximized
      return {
        isMaximized: nextMaximized,
        isNavPaneVisible: !nextMaximized,
        isInfoPaneVisible: !nextMaximized,
      }
    }),
  restorePanes: () => set({ isMaximized: false, isNavPaneVisible: true, isInfoPaneVisible: true }),
}))
