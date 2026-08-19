import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 la port mac dinh cua vite, khop voi tai lieu (README, monorepo.md).
    // Doi bang CORVUS_WEB_PORT khi can. strictPort=false de vite tu nhay port khac
    // neu port dang bi chiem, thay vi crash.
    port: Number(process.env.CORVUS_WEB_PORT ?? 5173),
    strictPort: false,
    host: '127.0.0.1',
  },
})
