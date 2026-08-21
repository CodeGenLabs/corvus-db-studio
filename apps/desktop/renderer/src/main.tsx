import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CorvusApp } from '@corvus/ui'
import { createIpcTransport, type CorvusBridgeApi } from '@corvus/transport-ipc'
import '@corvus/ui/styles/theme.css'

const corvusWindow = typeof window !== 'undefined' ? (window as unknown as { corvus?: CorvusBridgeApi }) : undefined
if (!corvusWindow?.corvus) {
  throw new Error('Electron preload bridge (window.corvus) is missing.')
}
const transport = createIpcTransport(corvusWindow.corvus)

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <CorvusApp transport={transport} />
    </StrictMode>,
  )
}
