import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CorvusApp } from '@corvus/ui'
import { createMockTransport } from '@corvus/transport-mock'
import '@corvus/ui/styles/theme.css'

const transport = createMockTransport()

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <CorvusApp transport={transport} isMockMode={true} />
    </StrictMode>,
  )
}
