import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CorvusApp } from '@corvus/ui'
import { createHttpTransport } from '@corvus/transport-http'
import '@corvus/ui/styles/theme.css'

const transport = createHttpTransport({ baseUrl: '/rpc', wsUrl: '/ws' })

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <CorvusApp transport={transport} />
    </StrictMode>,
  )
}
