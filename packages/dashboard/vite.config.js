/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_URL || 'http://localhost:8787'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: mode === 'development' ? {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    }
  }
})
