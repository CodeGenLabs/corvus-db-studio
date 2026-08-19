import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER = process.env.CORVUS_SERVER_URL ?? 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 la port mac dinh cua vite, khop voi tai lieu (README, monorepo.md).
    port: Number(process.env.CORVUS_WEB_PORT ?? 5173),
    strictPort: false,
    host: '127.0.0.1',
    // Client goi /rpc va /ws duong dan tuong doi (khong hard-code host) -> dev phai proxy
    // sang server. Nho vay production chi can serve SPA cung origin voi server, khong CORS.
    proxy: {
      '/rpc': { target: SERVER, changeOrigin: true },
      '/ws': { target: SERVER, ws: true, changeOrigin: true },
    },
  },
})
