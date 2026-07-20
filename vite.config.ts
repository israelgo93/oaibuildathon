import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // El dev server de Vite no ejecuta las Vercel Functions de `api/`; solo se
    // proxyan las dos lecturas publicas hacia produccion para ver datos reales.
    // Ninguna mutacion local llega a produccion.
    proxy: {
      '/api/showcase': {
        target: 'https://oaibuildathon.vercel.app',
        changeOrigin: true,
      },
      '/api/public-config': {
        target: 'https://oaibuildathon.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
