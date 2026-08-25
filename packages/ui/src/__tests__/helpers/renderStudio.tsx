import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { StudioProvider } from '../../store/studio'
import type { Transport } from '@corvus/contract'
import { createHttpTransport } from '@corvus/transport-http'

export type EngineFamily = 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'oracle' | 'sqlite' | 'mongodb' | 'redis'

export interface RenderStudioOptions extends Omit<RenderOptions, 'wrapper'> {
  engine?: EngineFamily
  transport?: Transport
}

export function createTestTransport(_engine: EngineFamily = 'postgres'): Transport {
  const port = Number(process.env.CORVUS_PORT || 8080)
  const host = process.env.CORVUS_HOST || '127.0.0.1'
  return createHttpTransport({ baseUrl: `http://${host}:${port}` })
}

export function renderStudio(
  ui: ReactElement,
  options?: RenderStudioOptions,
): RenderResult & { transport: Transport } {
  const { engine = 'postgres', transport = createTestTransport(engine), ...renderOptions } = options ?? {}

  function Wrapper({ children }: { children: ReactNode }) {
    return <StudioProvider transport={transport}>{children}</StudioProvider>
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions })
  return {
    ...result,
    transport,
  }
}
