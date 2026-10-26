import { resolve } from 'node:path'
import { defineConfig } from 'playwright/test'

/**
 * E2E contra backend real y base de datos de prueba. No usa mocks de API.
 * Lo levanta e2e-real/run.mjs, que prepara la base de prueba y exporta el entorno.
 * No ejecutar directamente contra producción: las variables TEST_DB_* deben apuntar
 * a una base cuyo nombre contenga "test".
 */
const backendRoot = resolve(import.meta.dirname, '../NOVEX_BACKEND')
const frontendRoot = import.meta.dirname

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results/playwright-e2e-real',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'npx ts-node -P tsconfig.typeorm.json test/e2e-support/gemini-stub.ts',
      cwd: backendRoot,
      url: 'http://127.0.0.1:4010/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node dist/main.js',
      cwd: backendRoot,
      url: 'http://127.0.0.1:3001/health/ready',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
      cwd: frontendRoot,
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
