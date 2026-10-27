/**
 * E2E real: navegador + frontend + backend + base de datos de prueba.
 *
 * Protección contra duplicados en el FLUJO DE CARTAS (única puerta de alta):
 * doble clic, respuesta perdida, recarga, problema nuevo, clave reutilizada
 * con otro contenido, evidencias simultáneas y el contrato anterior que el
 * frontend publicado sigue usando durante el despliegue. Además, la lectura
 * continua del panel Director sobre datos reales.
 *
 * El alta ya no ejecuta análisis IA (`analysis: null`); el stub de Gemini que
 * levanta la configuración solo existe para `POST :id/analyze`.
 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from 'playwright/test'
import { expectSingleScrollZone } from '../e2e/estado-lectura.helpers'

const API = 'http://127.0.0.1:3001/api/v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const COORDINATOR_EMAIL = 'coordinadora.e2e@cun.edu.co'
const ANALYST_EMAIL = 'analista.e2e@cun.edu.co'
const DIRECTOR_EMAIL = 'director.e2e@cun.edu.co'
const REGISTER_PATH = '/api/v1/situations/register-with-analysis'
const CARD = '[data-testid="coordination-card"]'

const backendRequire = createRequire(resolve(import.meta.dirname, '../../NOVEX_BACKEND/package.json'))
const { Client } = backendRequire('pg') as typeof import('pg')

interface Session {
  token: string
  coordinationId: string
  categoryId: string
}

function assertTestDatabase(): void {
  const name = process.env.TEST_DB_NAME ?? ''
  if (!name.toLowerCase().includes('test')) {
    throw new Error(`E2E abortado: TEST_DB_NAME no es de prueba (${name}).`)
  }
}

async function openSession(request: APIRequestContext, email = COORDINATOR_EMAIL): Promise<Session> {
  const login = await request.post(`${API}/auth/email`, { data: { email } })
  expect(login.ok()).toBeTruthy()
  const body = (await login.json()) as {
    accessToken: string
    user: { coordinationId: string }
  }
  const headers = { Authorization: `Bearer ${body.accessToken}` }
  const categories = (await (
    await request.get(`${API}/situations/categories`, { headers })
  ).json()) as Array<{ id: string; isSelectable: boolean }>
  const category = categories.find((item) => item.isSelectable)
  if (!category) throw new Error('No hay categorías seleccionables en la base de prueba.')
  return {
    token: body.accessToken,
    coordinationId: body.user.coordinationId,
    categoryId: category.id,
  }
}

function authHeaders(session: Session, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${session.token}`, ...extra }
}

async function queryTestDb<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
): Promise<T[]> {
  const client = new Client({
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT),
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
  })
  await client.connect()
  try {
    return (await client.query<T>(sql, params)).rows
  } finally {
    await client.end()
  }
}

/** Filas de la base con ese título y la clave de idempotencia de cada una. */
function rowsByTitle(title: string): Promise<Array<{ id: string; key: string | null }>> {
  return queryTestDb('SELECT id, client_request_id AS key FROM situations WHERE title = $1', [
    title,
  ])
}

/** Filas hijas de una situación (afectaciones, historial de severidad). */
async function countRows(
  table: 'situation_consequences' | 'situation_severity_changes',
  situationId: string,
): Promise<number> {
  const [row] = await queryTestDb<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${table} WHERE situation_id = $1`,
    [situationId],
  )
  return row.n
}

/** Sesión en el navegador con el token real; ninguna llamada sale de la máquina. */
async function openOperationalCenter(page: Page, session: Session): Promise<void> {
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.pathname.startsWith('/api/') && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      throw new Error(`Petición de API fuera del entorno de prueba: ${url.origin}`)
    }
  })
  await page.addInitScript(
    ([tokenKey, token]) => {
      localStorage.setItem(tokenKey, token)
    },
    [TOKEN_KEY, session.token] as const,
  )
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('action-panel')).toHaveAttribute('data-can-create', 'true', {
    timeout: 30_000,
  })
}

async function openInternalReport(page: Page): Promise<void> {
  await page.getByTestId('report-internal-button').first().click()
  await expect(page.getByTestId('report-form')).toHaveAttribute('data-report-kind', 'INTERNAL')
}

async function fillInternalReport(page: Page, title: string): Promise<void> {
  await page.getByTestId('report-title').fill(title)
  await page
    .getByTestId('report-description')
    .fill('Descripción suficientemente detallada para la prueba E2E real del alta.')
  await page.getByTestId('report-category').selectOption({ index: 1 })
}

async function expectDetailOpened(page: Page): Promise<void> {
  await expect(page.getByTestId('action-panel')).toHaveAttribute('data-mode', 'detail', {
    timeout: 30_000,
  })
}

/**
 * La PRIMERA alta llega al servidor y se guarda, pero su respuesta se pierde:
 * el navegador recibe un fallo de red. Es el caso que antes duplicaba.
 */
async function loseFirstRegistrationResponse(page: Page): Promise<() => number> {
  let reachedServer = 0
  await page.route(`**${REGISTER_PATH}`, async (route) => {
    reachedServer += 1
    if (reachedServer === 1) {
      await route.fetch()
      await route.abort('connectionreset')
      return
    }
    await route.continue()
  })
  return () => reachedServer
}

function sentKeys(page: Page): string[] {
  const keys: string[] = []
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === REGISTER_PATH) {
      keys.push(req.headers()['idempotency-key'] ?? '')
    }
  })
  return keys
}

test.beforeAll(() => {
  assertTestDatabase()
})

test('doble clic en Registrar crea un solo problema', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E doble clic ${randomUUID().slice(0, 8)}`
  await openOperationalCenter(page, session)
  await openInternalReport(page)
  await fillInternalReport(page, title)

  await page.getByTestId('report-submit').dblclick()

  await expectDetailOpened(page)
  expect(await rowsByTitle(title)).toHaveLength(1)
})

test('reintento tras una respuesta perdida: misma clave, un solo problema', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E respuesta perdida ${randomUUID().slice(0, 8)}`
  const keys = sentKeys(page)
  await openOperationalCenter(page, session)
  await loseFirstRegistrationResponse(page)
  await openInternalReport(page)
  await fillInternalReport(page, title)

  await page.getByTestId('report-submit').click()
  await expect(page.getByTestId('report-error')).toContainText('no lo duplicará')
  // El servidor SÍ lo guardó: ya existe aunque el navegador no lo sepa.
  expect(await rowsByTitle(title)).toHaveLength(1)

  await page.getByTestId('report-submit').click()

  await expectDetailOpened(page)
  const rows = await rowsByTitle(title)
  expect(rows).toHaveLength(1)
  expect(keys).toHaveLength(2)
  expect(keys[1]).toBe(keys[0])
  expect(rows[0].key).toBe(keys[0])
})

test('recarga tras una respuesta perdida: el borrador vuelve y no se duplica', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E recarga ${randomUUID().slice(0, 8)}`
  const keys = sentKeys(page)
  await openOperationalCenter(page, session)
  await loseFirstRegistrationResponse(page)
  await openInternalReport(page)
  await fillInternalReport(page, title)
  await page.getByTestId('report-submit').click()
  await expect(page.getByTestId('report-error')).toBeVisible()

  await page.unroute(`**${REGISTER_PATH}`)
  await page.reload()
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })
  await openInternalReport(page)
  // El texto escrito sobrevivió a la recarga.
  await expect(page.getByTestId('report-title')).toHaveValue(title)

  await page.getByTestId('report-submit').click()

  await expectDetailOpened(page)
  expect(await rowsByTitle(title)).toHaveLength(1)
  expect(keys[1]).toBe(keys[0])
})

test('un problema nuevo, tras confirmar el anterior, lleva otra clave', async ({ page, request }) => {
  const session = await openSession(request)
  const first = `E2E primero ${randomUUID().slice(0, 8)}`
  const second = `E2E segundo ${randomUUID().slice(0, 8)}`
  await openOperationalCenter(page, session)

  await openInternalReport(page)
  await fillInternalReport(page, first)
  await page.getByTestId('report-submit').click()
  await expectDetailOpened(page)
  await page.getByTestId('detail-back').click()

  await openInternalReport(page)
  // El borrador anterior se consumió al confirmar.
  await expect(page.getByTestId('report-title')).toHaveValue('')
  await fillInternalReport(page, second)
  await page.getByTestId('report-submit').click()
  await expectDetailOpened(page)

  const [a] = await rowsByTitle(first)
  const [b] = await rowsByTitle(second)
  expect(a.key).toBeTruthy()
  expect(b.key).toBeTruthy()
  expect(b.key).not.toBe(a.key)
})

test('clave reutilizada con otro contenido: aviso explícito y solo un registro nuevo si se confirma', async ({ page, request }) => {
  const session = await openSession(request)
  const original = `E2E original ${randomUUID().slice(0, 8)}`
  const edited = `E2E editado ${randomUUID().slice(0, 8)}`
  await openOperationalCenter(page, session)
  await loseFirstRegistrationResponse(page)
  await openInternalReport(page)
  await fillInternalReport(page, original)
  await page.getByTestId('report-submit').click()
  await expect(page.getByTestId('report-error')).toBeVisible()

  // El usuario cambia el título antes de reintentar.
  await page.getByTestId('report-title').fill(edited)
  await page.getByTestId('report-submit').click()
  await expect(page.getByTestId('report-error')).toContainText('ya quedó registrado')
  expect(await rowsByTitle(edited)).toHaveLength(0)

  // Confirmación consciente: ahora sí es un registro distinto.
  await page.getByTestId('report-submit').click()
  await expectDetailOpened(page)
  expect(await rowsByTitle(original)).toHaveLength(1)
  expect(await rowsByTitle(edited)).toHaveLength(1)
})

test('API: envíos simultáneos con la misma clave crean un solo problema', async ({ request }) => {
  const session = await openSession(request)
  const title = `E2E simultáneos ${randomUUID().slice(0, 8)}`
  const key = randomUUID()
  const payload = {
    title,
    description: 'Cinco envíos simultáneos del mismo reporte.',
    reportKind: 'INTERNAL',
    coordinationId: session.coordinationId,
    affectedCoordinationId: session.coordinationId,
    categoryId: session.categoryId,
    severity: 'MEDIUM',
    occurredAt: new Date(Date.now() - 3_600_000).toISOString(),
    initialConsequence: { description: 'Afectación que no debe duplicarse' },
  }

  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      request.post(`${API}/situations/register-with-analysis`, {
        headers: authHeaders(session, { 'Idempotency-Key': key }),
        data: payload,
      }),
    ),
  )

  expect(responses.every((r) => r.ok())).toBe(true)
  const rows = await rowsByTitle(title)
  expect(rows).toHaveLength(1)
  // La afectación inicial viaja en el alta: tampoco se duplica.
  expect(await countRows('situation_consequences', rows[0].id)).toBe(1)
  expect(await countRows('situation_severity_changes', rows[0].id)).toBe(1)
})

test('API: evidencias simultáneas con la misma clave se guardan una vez', async ({ request }) => {
  const session = await openSession(request)
  const created = await request.post(`${API}/situations/register-with-analysis`, {
    headers: authHeaders(session, { 'Idempotency-Key': randomUUID() }),
    data: {
      title: `E2E evidencias ${randomUUID().slice(0, 8)}`,
      description: 'Situación para evidencias.',
      reportKind: 'INTERNAL',
      coordinationId: session.coordinationId,
      categoryId: session.categoryId,
      severity: 'LOW',
      occurredAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
  })
  const { situation } = (await created.json()) as { situation: { id: string } }
  const evidence = { type: 'NOTE', title: 'Nota', description: 'Nota repetida', clientKey: 'capture:notes' }

  const responses = await Promise.all(
    [1, 2, 3].map(() =>
      request.post(`${API}/situations/${situation.id}/evidences`, {
        headers: authHeaders(session),
        data: evidence,
      }),
    ),
  )
  const ids = new Set(
    await Promise.all(responses.map(async (r) => ((await r.json()) as { id: string }).id)),
  )
  expect(ids.size).toBe(1)
})

test('API: el frontend anterior (sin reportKind) sigue registrando durante el despliegue', async ({ request }) => {
  const coordinator = await openSession(request)
  const legacy = {
    title: `E2E contrato anterior ${randomUUID().slice(0, 8)}`,
    description: 'Payload exacto del frontend publicado antes de cartas.',
    coordinationId: coordinator.coordinationId,
    categoryId: coordinator.categoryId,
    severity: 'HIGH',
    occurredAt: '2026-10-21',
    relatedCoordinationIds: [],
  }
  const ok = await request.post(`${API}/situations/register-with-analysis`, {
    headers: authHeaders(coordinator, { 'Idempotency-Key': randomUUID() }),
    data: legacy,
  })
  expect(ok.status()).toBe(201)
  const body = (await ok.json()) as { situation: { reportKind: string }; analysis: unknown }
  expect(body.situation.reportKind).toBe('INTERNAL')
  expect(body.analysis).toBeNull()

  // El analista registraba sin coordinación: ya no existe y no se inventa una.
  const analyst = await openSession(request, ANALYST_EMAIL)
  const rejected = await request.post(`${API}/situations/register-with-analysis`, {
    headers: authHeaders(analyst, { 'Idempotency-Key': randomUUID() }),
    data: { ...legacy, title: `${legacy.title} analista`, coordinationId: undefined },
  })
  expect(rejected.status()).toBe(400)
  expect(((await rejected.json()) as { code?: string }).code).toBe(
    'LEGACY_REGISTRATION_REQUIRES_COORDINATION',
  )
})

test('Director: lectura continua del modo Estado sobre datos reales, sin errores de KPIs', async ({ page, request }) => {
  const director = await openSession(request, DIRECTOR_EMAIL)
  const failedKpis: string[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/v1/operational-kpis') && response.status() >= 400) {
      failedKpis.push(`${response.status()} ${url.pathname}${url.search}`)
    }
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(
    ([tokenKey, token]) => {
      localStorage.setItem(tokenKey, token)
    },
    [TOKEN_KEY, director.token] as const,
  )
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })

  await page.locator(CARD).first().click()
  await expect(page.getByTestId('director-reading-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('director-estado-lectura')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('director-flujo-chart')).toBeVisible({ timeout: 30_000 })
  await expectSingleScrollZone(page)

  expect(failedKpis).toEqual([])
})
