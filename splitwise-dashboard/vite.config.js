import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/splitwise-api': {
        target: 'https://secure.splitwise.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/splitwise-api/, '/api'),
      },
    },
  },
})
