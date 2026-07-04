import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/schema': 'http://localhost:5000',
      '/chat': 'http://localhost:5000',
      '/reset': 'http://localhost:5000',
      '/api-configs': 'http://localhost:5000',
      '/api/analytics/regression': 'http://localhost:5000'
    }
  }
})