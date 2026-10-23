/**
 * E2E real: navegador + frontend + backend + base de datos de prueba + stub de Gemini.
 * Escenarios: doble clic, recarga durante el análisis, corte de conexión, respuesta
 * perdida, registros legítimos distintos, evidencias con título igual, notas fallidas
 * con reintento, y recuperación de una situación sin análisis.
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

const API = 'http://127.0.0.1:3001/api/v1'
const STUB = 'http://127.0.0.1:4010'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const DRAFT_KEY = 'novex.situationCapture.draft.v1'
const STEP_KEY = 'novex.situationCapture.step.v1'
const COORDINATOR_EMAIL = 'coordinadora.e2e@cun.edu.co'

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

async function openSession(request: APIRequestContext): Promise<Session> {
  const login = await request.post(`${API}/auth/email`, {
    data: { email: COORDINATOR_EMAIL },
  })
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

function payloadFor(session: Session, title: string) {
  return {
    title,
    description:
      'Descripción suficientemente detallada para la validación del formulario de captura en pruebas E2E reales.',
    coordinationId: session.coordinationId,
    categoryId: session.categoryId,
    severity: 'MEDIUM',
    occurredAt: '2026-10-21',
    relatedCoordinationIds: [],
  }
}

function draftFor(session: Session, title: string, notes = 'Nota de captura E2E') {
  return {
    title,
    description:
      'Descripción suficientemente detallada para la validación del formulario de captura en pruebas E2E reales.',
    coordinationId: session.coordinationId,
    reportedAt: '2026-10-21T08:00',
    detectionMethod: 'USUARIO',
    detectionMethodOther: '',
    affectedParties: ['ESTUDIANTES'],
    affectedPartyOther: '',
    relatedCoordinationIds: [],
    additionalNotes: notes,
    categoryId: session.categoryId,
  }
}

async function situationsByTitle(
  request: APIRequestContext,
  session: Session,
  title: string,
): Promise<Array<{ id: string; title: string }>> {
  const response = await request.get(`${API}/situations?limit=100`, {
    headers: authHeaders(session),
  })
  const body = (await response.json()) as { items: Array<{ id: string; title: string }> }
  return body.items.filter((item) => item.title === title)
}

async function evidencesWithTitle(
  request: APIRequestContext,
  session: Session,
  situationId: string,
  title: string,
): Promise<number> {
  const response = await request.get(`${API}/situations/${situationId}/evidences`, {
    headers: authHeaders(session),
  })
  const body = (await response.json()) as { items: Array<{ title: string }> }
  return body.items.filter((item) => item.title === title).length
}

async function setStub(
  request: APIRequestContext,
  queue: Array<{ delayMs?: number; fail?: boolean }>,
): Promise<void> {
  await request.post(`${STUB}/__control`, { data: { queue } })
}

async function stubCalls(request: APIRequestContext): Promise<number> {
  const body = (await (await request.get(`${STUB}/__calls`)).json()) as { calls: number }
  return body.calls
}

/** Abre el wizard en el paso de resumen con un borrador ya completo. */
async function openSummaryWithDraft(
  page: Page,
  session: Session,
  draft: ReturnType<typeof draftFor>,
): Promise<void> {
  await page.addInitScript(
    ([tokenKey, token]) => {
      try {
        localStorage.setItem(tokenKey, token)
      } catch {
        // Sin almacenamiento, la prueba falla de forma visible más adelante.
      }
    },
    [TOKEN_KEY, session.token] as const,
  )
  const catalogsLoaded = Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v1/coordinations') && r.ok()),
    page.waitForResponse((r) => r.url().includes('/api/v1/situations/categories') && r.ok()),
  ])
  await page.goto('/operational-events/register')
  // Los catálogos al terminar reescriben el estado del wizard en localStorage: esperar a
  // que la red quede en reposo evita que pisen el borrador que preparamos a continuación.
  await catalogsLoaded
  await page.waitForLoadState('networkidle')
  await page.evaluate(
    ([draftKey, stepKey, value, step]) => {
      localStorage.setItem(draftKey, value)
      localStorage.setItem(stepKey, step)
    },
    [DRAFT_KEY, STEP_KEY, JSON.stringify(draft), '2'] as const,
  )
  await page.reload()
}

function confirmButton(page: Page) {
  return page.getByRole('button', { name: /Crear expediente e iniciar análisis IA/ })
}

async function waitForDossier(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/gestion\?situation=/, { timeout: 90_000 })
}

test.beforeAll(() => {
  assertTestDatabase()
})

test('doble clic en confirmar registra una sola situación', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E doble clic ${randomUUID().slice(0, 8)}`
  await setStub(request, [{ delayMs: 1500 }])

  await openSummaryWithDraft(page, session, draftFor(session, title))
  await confirmButton(page).dblclick()

  await waitForDossier(page)
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)
  expect(await stubCalls(request)).toBe(1)
})

test('recarga durante el análisis no crea un segundo registro', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E recarga ${randomUUID().slice(0, 8)}`
  await setStub(request, [{ delayMs: 6000 }])

  await openSummaryWithDraft(page, session, draftFor(session, title))
  await confirmButton(page).click()
  await expect
    .poll(async () => (await situationsByTitle(request, session, title)).length, {
      timeout: 15_000,
    })
    .toBe(1)

  await page.reload()
  // Tras la recarga el paso de análisis no se restaura: se vuelve a confirmar con la misma clave.
  await page.getByRole('button', { name: 'Continuar' }).click()
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await confirmButton(page).click()
    const reached = await page
      .waitForURL(/\/gestion\?situation=/, { timeout: 3_000 })
      .then(() => true)
      .catch(() => false)
    if (reached) break
    // Mientras el análisis original sigue en curso, el servidor responde 409 y no crea nada.
    await expect(page.getByRole('alert')).toContainText('sigue procesándose')
    await page.waitForTimeout(1_500)
  }

  await waitForDossier(page)
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)
  expect(await stubCalls(request)).toBe(1)
})

test('corte de conexión antes de llegar al servidor y reintento', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E corte ${randomUUID().slice(0, 8)}`
  await setStub(request, [])

  let aborted = false
  await page.route('**/api/v1/situations/register-with-analysis', async (route) => {
    if (!aborted) {
      aborted = true
      await route.abort('internetdisconnected')
      return
    }
    await route.continue()
  })

  await openSummaryWithDraft(page, session, draftFor(session, title))
  await confirmButton(page).click()

  await expect(page.getByRole('alert')).toContainText('problema de conexión')
  expect(await situationsByTitle(request, session, title)).toHaveLength(0)

  await confirmButton(page).click()
  await waitForDossier(page)
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)
})

test('respuesta perdida tras registrar: el reintento reconoce el registro completado', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E respuesta perdida ${randomUUID().slice(0, 8)}`
  await setStub(request, [])

  let lost = false
  let replayed: boolean | null = null
  await page.route('**/api/v1/situations/register-with-analysis', async (route) => {
    const response = await route.fetch()
    if (!lost) {
      // El servidor ya procesó la solicitud; el navegador no recibe la respuesta.
      lost = true
      await route.abort('connectionreset')
      return
    }
    const body = (await response.json()) as { replayed: boolean }
    replayed = body.replayed
    await route.fulfill({ response })
  })

  await openSummaryWithDraft(page, session, draftFor(session, title))
  await confirmButton(page).click()
  await expect(page.getByRole('alert')).toContainText('problema de conexión')
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)

  await confirmButton(page).click()
  await waitForDossier(page)

  expect(replayed).toBe(true)
  const [created] = await situationsByTitle(request, session, title)
  // La nota de captura no se duplica en el reintento.
  expect(await evidencesWithTitle(request, session, created.id, 'Notas adicionales')).toBe(1)
  expect(await stubCalls(request)).toBe(1)
})

test('dos registros legítimos diferentes se guardan ambos', async ({ page, request }) => {
  const session = await openSession(request)
  const first = `E2E legítimo A ${randomUUID().slice(0, 8)}`
  const second = `E2E legítimo B ${randomUUID().slice(0, 8)}`
  await setStub(request, [])

  await openSummaryWithDraft(page, session, draftFor(session, first))
  await confirmButton(page).click()
  await waitForDossier(page)

  await openSummaryWithDraft(page, session, draftFor(session, second))
  await confirmButton(page).click()
  await waitForDossier(page)

  expect(await situationsByTitle(request, session, first)).toHaveLength(1)
  expect(await situationsByTitle(request, session, second)).toHaveLength(1)
})

test('evidencias con el mismo título coexisten sin perderse', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E evidencias ${randomUUID().slice(0, 8)}`
  await setStub(request, [])

  await openSummaryWithDraft(page, session, draftFor(session, title, 'Nota de captura'))
  await confirmButton(page).click()
  await waitForDossier(page)

  const [created] = await situationsByTitle(request, session, title)
  // Evidencia manual con el mismo título que la nota de captura.
  await request.post(`${API}/situations/${created.id}/evidences`, {
    headers: authHeaders(session),
    data: { type: 'NOTE', title: 'Notas adicionales', description: 'Nota manual del usuario' },
  })

  expect(await evidencesWithTitle(request, session, created.id, 'Notas adicionales')).toBe(2)
})

test('notas de captura fallidas se informan y se reintentan sin re-registrar', async ({ page, request }) => {
  const session = await openSession(request)
  const title = `E2E notas fallidas ${randomUUID().slice(0, 8)}`
  await setStub(request, [])

  let failed = false
  await page.route('**/api/v1/situations/*/evidences', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as { clientKey?: string }
    if (!failed && body.clientKey === 'capture:notes') {
      failed = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  await openSummaryWithDraft(page, session, draftFor(session, title))
  await confirmButton(page).click()

  await expect(page.getByRole('alert')).toContainText('No se guardaron algunas notas')
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)

  await page.getByRole('button', { name: 'Reintentar notas' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)

  const [created] = await situationsByTitle(request, session, title)
  expect(await evidencesWithTitle(request, session, created.id, 'Notas adicionales')).toBe(1)
  expect(await situationsByTitle(request, session, title)).toHaveLength(1)
})

test('recuperación: reclamo vigente responde 409, reclamo vencido permite reanudar sin duplicar', async ({ request }) => {
  test.setTimeout(150_000)
  const session = await openSession(request)
  const title = `E2E recuperación ${randomUUID().slice(0, 8)}`
  const key = randomUUID()
  const headers = authHeaders(session, { 'Idempotency-Key': key })
  const payload = payloadFor(session, title)
  await setStub(request, [{ delayMs: 8000 }])

  // Intento A: se queda analizando con su reclamo.
  const attemptA = request.post(`${API}/situations/register-with-analysis`, {
    headers,
    data: payload,
  })
  await expect
    .poll(async () => (await situationsByTitle(request, session, title)).length, {
      timeout: 15_000,
    })
    .toBe(1)

  // Mientras A tiene el reclamo, un reintento no analiza ni crea nada.
  const duringClaim = await request.post(`${API}/situations/register-with-analysis`, {
    headers,
    data: payload,
  })
  expect(duringClaim.status()).toBe(409)
  expect((await duringClaim.json()).code).toBe('REGISTRATION_IN_PROGRESS')

  // La instancia que sostenía A se considera perdida: el reclamo vence en la base de prueba.
  await expireClaim(key)

  // Intento C reanuda sobre la misma fila y confirma el análisis.
  const attemptC = await request.post(`${API}/situations/register-with-analysis`, {
    headers,
    data: payload,
  })
  expect(attemptC.status()).toBe(201)
  expect((await attemptC.json()).replayed).toBe(false)

  // A termina después: su resultado no puede confirmarse.
  const resultA = await attemptA
  expect(resultA.status()).toBe(409)

  const [created] = await situationsByTitle(request, session, title)
  const analysis = (await (
    await request.get(`${API}/situations/${created.id}/analysis`, { headers: authHeaders(session) })
  ).json()) as { analysisVersion: number }
  expect(analysis.analysisVersion).toBe(1)
  expect(await stubCalls(request)).toBe(2)
})

async function expireClaim(key: string): Promise<void> {
  assertTestDatabase()
  const client = new Client({
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT),
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
  })
  await client.connect()
  try {
    await client.query(
      `UPDATE situations SET analysis_claim_expires_at = now() - interval '1 second'
        WHERE client_request_id = $1`,
      [key],
    )
  } finally {
    await client.end()
  }
}
