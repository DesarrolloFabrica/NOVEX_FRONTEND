// Ejecuta los E2E reales: prepara PostgreSQL de prueba, siembra datos, compila el
// backend y lanza Playwright. Todas las variables se fijan aquí; no se lee .env.
//
// Uso: node e2e-real/run.mjs            (desde NOVEX_FRONTEND)
// Requiere Docker. Crea (si no existe) un contenedor postgres:17-alpine desechable.

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const frontendRoot = resolve(import.meta.dirname, '..')
const backendRoot = resolve(frontendRoot, '../NOVEX_BACKEND')

const CONTAINER = 'novex-e2e-pg'
const PORT = '55433'

const testDb = {
  TEST_DB_HOST: 'localhost',
  TEST_DB_PORT: PORT,
  TEST_DB_USER: 'novex_e2e',
  TEST_DB_PASSWORD: 'novex_e2e',
  TEST_DB_NAME: 'novex_e2e_test',
}

if (!testDb.TEST_DB_NAME.includes('test')) {
  throw new Error('Abortado: la base de E2E debe tener "test" en el nombre.')
}

const env = {
  ...process.env,
  ...testDb,
  NODE_ENV: 'development',
  PORT: '3001',
  DB_CLOUD: 'false',
  DB_HOST_LOCAL: testDb.TEST_DB_HOST,
  DB_PORT_LOCAL: testDb.TEST_DB_PORT,
  DB_USERNAME_LOCAL: testDb.TEST_DB_USER,
  DB_PASSWORD_LOCAL: testDb.TEST_DB_PASSWORD,
  DB_DATABASE_LOCAL: testDb.TEST_DB_NAME,
  DB_SSL_LOCAL: 'false',
  DB_HOST: testDb.TEST_DB_HOST,
  DB_PORT: testDb.TEST_DB_PORT,
  DB_USERNAME: testDb.TEST_DB_USER,
  DB_PASSWORD: testDb.TEST_DB_PASSWORD,
  DB_DATABASE: testDb.TEST_DB_NAME,
  DB_SSL: 'false',
  DB_SYNCHRONIZE: 'false',
  JWT_SECRET: 'e2e-only-secret-0123456789abcdef0123456789',
  JWT_EXPIRES_IN: '1h',
  GOOGLE_CLIENT_ID: 'e2e-placeholder.apps.googleusercontent.com',
  ENABLE_EMAIL_LOGIN: 'true',
  GEMINI_API_KEY: 'e2e-test-key',
  GEMINI_BASE_URL: 'http://127.0.0.1:4010',
  GEMINI_TIMEOUT_MS: '60000',
  GEMINI_STUB_PORT: '4010',
  GEMINI_THROTTLE_LIMIT: '1000',
  // El frontend usa SIEMPRE el proxy local de Vite hacia 127.0.0.1:3001: estos
  // valores vacíos prevalecen sobre cualquier .env que apunte a otro backend.
  VITE_API_BASE_URL: '',
  VITE_API_URL: '',
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env,
    ...options,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function ensureContainer() {
  const inspect = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', CONTAINER], {
    shell: true,
    encoding: 'utf8',
  })
  if (inspect.status === 0) {
    if (inspect.stdout.trim() !== 'true') {
      run('docker', ['start', CONTAINER], { cwd: frontendRoot })
    }
    return
  }
  run(
    'docker',
    [
      'run', '-d', '--name', CONTAINER,
      '-e', `POSTGRES_USER=${testDb.TEST_DB_USER}`,
      '-e', `POSTGRES_PASSWORD=${testDb.TEST_DB_PASSWORD}`,
      '-e', `POSTGRES_DB=${testDb.TEST_DB_NAME}`,
      '-p', `${PORT}:5432`,
      'postgres:17-alpine',
    ],
    { cwd: frontendRoot },
  )
  // Espera a que el motor acepte conexiones.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const ready = spawnSync('docker', ['exec', CONTAINER, 'pg_isready', '-U', testDb.TEST_DB_USER], {
      shell: true,
    })
    if (ready.status === 0) return
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  }
  throw new Error('PostgreSQL de prueba no respondió a tiempo.')
}

ensureContainer()
run('npx', ['ts-node', '-P', 'tsconfig.typeorm.json', 'test/e2e-support/seed-e2e-database.ts'], {
  cwd: backendRoot,
})
run('npm', ['run', 'build'], { cwd: backendRoot })
run('npx', ['playwright', 'test', '-c', 'playwright.e2e-real.config.ts'], { cwd: frontendRoot })
