import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CorvusApp } from '@corvus/ui'
import { createIpcTransport, type CorvusBridgeApi } from '@corvus/transport-ipc'
import '@corvus/ui/styles/theme.css'

const corvusWindow = typeof window !== 'undefined' ? (window as unknown as { corvus?: CorvusBridgeApi }) : undefined
const transport = corvusWindow?.corvus ? createIpcTransport(corvusWindow.corvus) : undefined

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <CorvusApp transport={transport} />
    </StrictMode>,
  )
}
