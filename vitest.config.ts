import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Configuración de Vitest: la de Vite más el almacenamiento web de pruebas
 * (ver `src/test/setupStorage.ts`, necesario con Node 22+).
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      setupFiles: ['./src/test/setupStorage.ts'],
    },
  }),
)
