import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Browser talks to Vite (:5173). Vite forwards /api to Spring (:8080).
// Same-origin from the browser's point of view — no CORS needed in local dev.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['epubjs'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
