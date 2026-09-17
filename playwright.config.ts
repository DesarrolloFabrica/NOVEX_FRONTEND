import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  outputDir: 'test-results/playwright',
  reporter: [['list']],
  use: {
    // Permite apuntar a un servidor de desarrollo ya levantado en otro puerto.
    // Sin esto, `reuseExistingServer` reutiliza lo que haya en 4173 aunque sea
    // una build de `vite preview` anterior a los cambios que se están probando.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173',
    browserName: 'chromium',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER
    ? undefined
    : {
        command:
          'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173/red-impacto',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
