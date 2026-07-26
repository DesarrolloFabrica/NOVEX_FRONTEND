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
  // Preoptimiza jspdf al iniciar el servidor para evitar un full reload
  // la primera vez que el usuario exporta un PDF (eso borraba la sesión en memoria).
  optimizeDeps: {
    include: ['jspdf'],
  },
})
