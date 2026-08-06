import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Mantiene las llamadas locales en el mismo origen del navegador. Vite
      // reenvía la API a Nest y evita que CORS o un preflight oculten el error.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  // Preoptimiza jspdf al iniciar el servidor para evitar un full reload
  // la primera vez que el usuario exporta un PDF (eso borraba la sesión en memoria).
  optimizeDeps: {
    include: ['jspdf'],
  },
})
