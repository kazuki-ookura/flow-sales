import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/run-now': 'http://localhost:3000',
      '/approve': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/reject': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
