import { create } from 'zustand'

export interface FocusModeState {
  isFocusMode: boolean
  toggleFocusMode: () => void
  setFocusMode: (enabled: boolean) => void
}

export const useFocusMode = create<FocusModeState>((set) => ({
  isFocusMode: false,
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
}))
