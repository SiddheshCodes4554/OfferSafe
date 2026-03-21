import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/.env']
    },
    proxy: {
      '/analyze-text': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/verify-company': 'http://localhost:8000',
    },
  },
})

