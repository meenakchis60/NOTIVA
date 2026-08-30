import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      // Allows: import X from '@/components/...' anywhere in the project
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to Django dev server so cookies and CORS are transparent
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
