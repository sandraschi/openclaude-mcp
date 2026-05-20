import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 10933,
    strictPort: true,
    host: true,
    proxy: {
      '/tools': 'http://localhost:10932',
      '/api': 'http://localhost:10932',
      '/sse': 'http://localhost:10932',
    },
  },
})
