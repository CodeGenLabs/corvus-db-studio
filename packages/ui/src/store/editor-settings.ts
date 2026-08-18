import { create } from 'zustand'

export interface EditorSettingsState {
  wordWrap: boolean
  lineNumbers: boolean
  fontSize: number // Zoom: 10 to 24px
  tabSize: number
  autoCloseBrackets: boolean
  highlightActiveLine: boolean
  setWordWrap: (enabled: boolean) => void
  setLineNumbers: (enabled: boolean) => void
  setFontSize: (size: number) => void
  setTabSize: (size: number) => void
  setAutoCloseBrackets: (enabled: boolean) => void
  setHighlightActiveLine: (enabled: boolean) => void
}

export const useEditorSettings = create<EditorSettingsState>((set) => ({
  wordWrap: true,
  lineNumbers: true,
  fontSize: 13,
  tabSize: 2,
  autoCloseBrackets: true,
  highlightActiveLine: true,
  setWordWrap: (wordWrap) => set({ wordWrap }),
  setLineNumbers: (lineNumbers) => set({ lineNumbers }),
  setFontSize: (fontSize) => set({ fontSize: Math.max(10, Math.min(24, fontSize)) }),
  setTabSize: (tabSize) => set({ tabSize }),
  setAutoCloseBrackets: (autoCloseBrackets) => set({ autoCloseBrackets }),
  setHighlightActiveLine: (highlightActiveLine) => set({ highlightActiveLine }),
}))
