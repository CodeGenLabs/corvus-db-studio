import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isMock = mode === 'mock' || process.env.MOCK === 'true'

  return {
    plugins: [
      react(),
      {
        name: 'mock-entry-transform',
        transformIndexHtml(html) {
          if (isMock) {
            return html.replace('/src/main.tsx', '/src/main.mock.tsx')
          }
          return html
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/rpc': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:3000',
          ws: true,
        },
      },
    },
  }
})
