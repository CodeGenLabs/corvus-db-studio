import { CorvusApp } from '@corvus/ui'
import { createHttpTransport } from '@corvus/transport-http'

const transport = createHttpTransport({ baseUrl: '/rpc', wsUrl: '/ws' })

export default function App() {
  return <CorvusApp transport={transport} />
}
