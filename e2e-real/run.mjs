// Ejecuta los E2E reales con PostgreSQL efímero, prepara datos, compila el
// backend y lanza Playwright. La autorización y DB_* viven solo en los hijos.
//
// Uso: node e2e-real/run.mjs (desde NOVEX_FRONTEND). Requiere Docker.

import { randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const frontendRoot = resolve(import.meta.dirname, '..')
const backendRoot = resolve(frontendRoot, '../NOVEX_BACKEND')
const suffix = `${Date.now()}_${process.pid}`
const container = `novex-e2e-${randomUUID().replaceAll('-', '')}`
const testDb = {
  host: '127.0.0.1',
  user: 'novex_e2e',
  password: randomBytes(24).toString('base64url'),
  name: `novex_e2e_${suffix}`,
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}`)
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `${command} falló`)
  }
  return result.stdout.trim()
}

function buildChildEnv(port) {
  const dbPort = String(port)
  const childEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3001',
    DB_CLOUD: 'false',
    DB_HOST_LOCAL: testDb.host,
    DB_PORT_LOCAL: dbPort,
    DB_USERNAME_LOCAL: testDb.user,
    DB_PASSWORD_LOCAL: testDb.password,
    DB_DATABASE_LOCAL: testDb.name,
    DB_SSL_LOCAL: 'false',
    DB_HOST: testDb.host,
    DB_PORT: dbPort,
    DB_USERNAME: testDb.user,
    DB_PASSWORD: testDb.password,
    DB_DATABASE: testDb.name,
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
    VITE_API_BASE_URL: '',
    VITE_API_URL: '',
  }
  for (const key of [
    'NOVEX_DESTRUCTIVE_TESTS',
    'NOVEX_TEST_DB_HOST',
    'NOVEX_TEST_DB_PORT',
    'NOVEX_TEST_DB_NAME',
    'TEST_DB_HOST',
    'TEST_DB_PORT',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD',
    'TEST_DB_NAME',
  ]) {
    delete childEnv[key]
  }
  return childEnv
}

function startDisposableContainer(onStarted) {
  run('docker', [
    'run', '-d', '--rm', '--name', container,
    '--tmpfs', '/var/lib/postgresql/data',
    '-e', `POSTGRES_USER=${testDb.user}`,
    '-e', `POSTGRES_PASSWORD=${testDb.password}`,
    '-e', `POSTGRES_DB=${testDb.name}`,
    '-p', '127.0.0.1::5432',
    'postgres:17-alpine',
  ])
  onStarted()

  const binding = capture('docker', ['port', container, '5432/tcp'])
  const match = binding.match(/^127\.0\.0\.1:(\d+)$/m)
  if (!match) throw new Error(`Docker publicó un destino inesperado: ${binding}`)
  const port = Number(match[1])

  let ready = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync('docker', [
      'exec', container, 'pg_isready', '-U', testDb.user, '-d', testDb.name,
    ])
    if (result.status === 0) {
      ready = true
      break
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  }
  if (!ready) throw new Error('PostgreSQL de prueba no respondió a tiempo.')

  run('docker', [
    'exec', container, 'psql', '-U', testDb.user, '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-c',
    `COMMENT ON DATABASE ${testDb.name} IS 'novex:disposable-test-db'`,
  ])

  return { port, env: buildChildEnv(port) }
}

function main() {
  let containerStarted = false
  try {
    const isolated = startDisposableContainer(() => {
      containerStarted = true
    })

    const seedEnv = {
      ...isolated.env,
      TEST_DB_HOST: testDb.host,
      TEST_DB_PORT: String(isolated.port),
      TEST_DB_USER: testDb.user,
      TEST_DB_PASSWORD: testDb.password,
      TEST_DB_NAME: testDb.name,
      NOVEX_DESTRUCTIVE_TESTS: '1',
      NOVEX_TEST_DB_HOST: testDb.host,
      NOVEX_TEST_DB_PORT: String(isolated.port),
      NOVEX_TEST_DB_NAME: testDb.name,
    }
    const playwrightEnv = {
      ...isolated.env,
      TEST_DB_HOST: testDb.host,
      TEST_DB_PORT: String(isolated.port),
      TEST_DB_USER: testDb.user,
      TEST_DB_PASSWORD: testDb.password,
      TEST_DB_NAME: testDb.name,
    }
    run('npx', ['ts-node', '-P', 'tsconfig.typeorm.json', 'test/e2e-support/seed-e2e-database.ts'], {
      cwd: backendRoot,
      env: seedEnv,
    })
    run('npm', ['run', 'build'], { cwd: backendRoot, env: isolated.env })
    run('npx', ['playwright', 'test', '-c', 'playwright.e2e-real.config.ts'], {
      cwd: frontendRoot,
      env: playwrightEnv,
    })
  } finally {
    if (containerStarted) {
      const result = spawnSync('docker', ['stop', container], { encoding: 'utf8' })
      if (result.status !== 0) {
        console.error(result.stderr?.trim() || 'No se pudo detener el contenedor E2E.')
      }
    }
  }
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
