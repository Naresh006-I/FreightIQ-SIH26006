import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev proxy — only used locally
    proxy: mode === 'development' ? {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    } : {}
  }
}))
