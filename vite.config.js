import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/wisp/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/topo': {
        target: 'https://api.opentopodata.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/topo/, ''),
      },
    },
  },
})
