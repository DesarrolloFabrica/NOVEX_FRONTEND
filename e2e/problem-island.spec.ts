import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Isla flotante del problema (LEVEL 2).
 *
 * Presupuesto vigilado en cada prueba: una petición de LEVEL 0, dos de LEVEL 1
 * por coordinación nueva, dos al abrir un problema y una por sección perezosa
 * la primera vez que se despliega.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const session = {
  id: 'e2e-admin',
  name: 'Administrador E2E',
  role: 'supervisor',
  roleCode: 'ADMIN',
  roleName: 'Administrador',
  permissions: PERMISSIONS,
  onboardingStep: 100,
  onboardingCompleted: true,
}

const OPERACIONES_UUID = '00000000-0000-4000-8000-000000000008'
const PROBLEM_ID = 'ing-1'
const SECOND_PROBLEM_ID = 'ing-4'

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function accessToken(): string {
  return `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: 'e2e-admin',
      email: 'admin@novex.test',
      roleId: 'role-admin',
      roleCode: 'ADMIN',
      coordinationId: null,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

function situationFixture(
  id: string,
  title: string,
  severity: string,
  status: string,
) {
  return {
    id,
    title,
    description:
      'La sede norte perdió conectividad en seis aulas del bloque B durante la jornada de la mañana, sin fecha estimada de restablecimiento por parte del proveedor.',
    coordinationId: OPERACIONES_UUID,
    coordinationCode: 'coord-operaciones-academicas',
    coordinationName: 'Coordinador Operaciones Académicas',
    createdByUserId: 'user',
    createdByUserName: 'User',
    categoryId: 'cat',
    categoryCode: 'CAT',
    categoryName: 'Categoria',
    severity,
    status,
    slaHealth: 'overdue',
    dueAt: '2026-08-10T10:00:00.000Z',
    occurredAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  }
}

const OPEN_PROBLEMS = [
  situationFixture(PROBLEM_ID, 'Aulas sin conectividad', 'CRITICAL', 'OPEN'),
  situationFixture('ing-2', 'Retraso en laboratorios', 'LOW', 'OPEN'),
  situationFixture('ing-3', 'Docente sin asignar', 'MEDIUM', 'OPEN'),
]

const IN_PROGRESS_PROBLEMS = [
  situationFixture(
    SECOND_PROBLEM_ID,
    'Cupos insuficientes',
    'HIGH',
    'IN_PROGRESS',
  ),
]

const ANALYSIS = {
  situationId: PROBLEM_ID,
  sessionId: 'session-1',
  analysisVersion: 1,
  isLatest: true,
  provider: 'gemini',
  createdAt: '2026-08-01T11:00:00.000Z',
  updatedAt: '2026-08-01T11:00:00.000Z',
  analysis: {
    analyzedAt: '2026-08-01T11:00:00.000Z',
    executiveSummary: {
      headline: 'Riesgo concentrado en la sede norte',
      summary: 'La indisponibilidad afecta la continuidad docente del bloque B.',
      keyPoints: ['Seis aulas sin red', 'Sin fecha de restablecimiento'],
    },
    incidentClassification: {
      categoryCode: 'CAT',
      categoryName: 'Categoria',
      operationalSeverity: 'CRITICAL',
      tags: [],
    },
    rootCause: { summary: 'Falla del enlace principal.', hypotheses: [] },
    impactAssessment: {
      operationalSeverity: 'CRITICAL',
      confidence: 0.9,
      estimatedDurationMinutes: 240,
      summary: 'Afecta la operación docente de dos áreas.',
      reasoning: 'Aulas compartidas.',
      affectedCoordinations: [
        {
          coordinationCode: 'coord-transversales',
          impactLevel: 'HIGH',
          description: 'Clases compartidas sin red.',
        },
      ],
      propagation: [
        {
          coordinationCode: 'coord-transversales',
          depth: 2,
          impactLevel: 'HIGH',
          description: 'Segundo nivel.',
        },
      ],
    },
    immediateRisks: [
      {
        title: 'Incumplimiento de SLA',
        description: 'El plazo ya venció.',
        severity: 'HIGH',
      },
    ],
  },
}

async function installSession(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ sessionKey, tokenKey, sessionValue, token }) => {
      localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
      localStorage.setItem(tokenKey, token)
    },
    {
      sessionKey: SESSION_KEY,
      tokenKey: TOKEN_KEY,
      sessionValue: session,
      token: accessToken(),
    },
  )
}

interface ApiOptions {
  /** Falla el detalle inicial del problema. */
  failDetail?: boolean
  /** Falla la sección de evidencias. */
  failEvidences?: boolean
  /** Devuelve 404 en el análisis: situación sin IA. */
  withoutAnalysis?: boolean
}

async function installApi(page: Page, options: ApiOptions = {}) {
  const requested: string[] = []

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    requested.push(`${path}${url.search}`)

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }

    if (path.endsWith('/operational-overview')) {
      await route.fulfill({ json: operationalOverviewFixture({ severe: true }) })
      return
    }

    // Detalle del problema.
    if (/\/situations\/[^/]+$/.test(path)) {
      if (options.failDetail) {
        await route.fulfill({ status: 500, json: { message: 'E2E' } })
        return
      }
      const id = path.split('/').at(-1)
      const situation =
        [...OPEN_PROBLEMS, ...IN_PROGRESS_PROBLEMS].find(
          (item) => item.id === id,
        ) ?? OPEN_PROBLEMS[0]
      await route.fulfill({ json: situation })
      return
    }

    if (path.endsWith('/analysis')) {
      if (options.withoutAnalysis) {
        await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
        return
      }
      await route.fulfill({ json: ANALYSIS })
      return
    }

    if (path.endsWith('/evidences')) {
      if (options.failEvidences) {
        await route.fulfill({ status: 500, json: { message: 'E2E' } })
        return
      }
      await route.fulfill({
        json: {
          situationId: PROBLEM_ID,
          items: [
            {
              id: 'ev-1',
              situationId: PROBLEM_ID,
              uploadedByUserId: 'u',
              uploadedByUserName: 'U',
              type: 'IMAGE',
              title: 'Foto del rack',
              description: '',
              fileName: 'rack.png',
              storagePath: null,
              mimeType: 'image/png',
              fileSize: 1024,
              createdAt: '2026-08-01T12:00:00.000Z',
            },
          ],
          total: 1,
        },
      })
      return
    }

    if (path.endsWith('/timeline')) {
      await route.fulfill({
        json: {
          situationId: PROBLEM_ID,
          items: [
            {
              id: 'tl-1',
              situationId: PROBLEM_ID,
              userId: null,
              userName: null,
              eventType: 'STATUS_CHANGED',
              title: 'Estado actualizado',
              description: '',
              metadata: null,
              createdAt: '2026-08-01T12:30:00.000Z',
            },
          ],
          total: 1,
        },
      })
      return
    }

    if (path.endsWith('/recommendations')) {
      await route.fulfill({
        json: {
          situationId: PROBLEM_ID,
          items: [
            {
              id: 'rec-1',
              situationId: PROBLEM_ID,
              title: 'Escalar al proveedor',
              description: 'Abrir incidente prioritario.',
              priority: 'HIGH',
              status: 'PENDING',
              generatedBy: 'AI',
              assignedUserId: null,
              assignedUserName: null,
              dueAt: null,
              completedAt: null,
              executionNotes: null,
              createdAt: '2026-08-01T12:00:00.000Z',
              updatedAt: '2026-08-01T12:00:00.000Z',
            },
          ],
          total: 1,
        },
      })
      return
    }

    // Lista de problemas de la coordinación.
    if (path.endsWith('/situations')) {
      const status = url.searchParams.get('status') ?? ''
      const items =
        url.searchParams.get('coordinationId') === OPERACIONES_UUID
          ? status === 'OPEN'
            ? OPEN_PROBLEMS
            : IN_PROGRESS_PROBLEMS
          : []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return requested
}

async function openProblem(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()
  await expect(page.getByTestId('problem-row')).toHaveCount(4)
  await page.getByTestId('problem-row').first().click()
  await expect(page.getByTestId('problem-island')).toBeVisible()
}

function callsTo(requested: readonly string[], fragment: string): string[] {
  return requested.filter((entry) => entry.includes(fragment))
}

/** Peticiones de detalle inicial: la situación concreta y su análisis. */
function detailCalls(requested: readonly string[]): string[] {
  return requested.filter(
    (entry) =>
      /\/situations\/[^/?]+(\?|$)/.test(entry) || entry.endsWith('/analysis'),
  )
}

test.describe('isla del problema', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el clic en un problema abre la isla sin perder el contexto', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const island = page.getByTestId('problem-island')
    await expect(island).toHaveAttribute('role', 'dialog')
    await expect(island).toHaveAttribute('aria-modal', 'true')

    // Cabecera: título, severidad, estado y SLA.
    await expect(island).toContainText('Aulas sin conectividad')
    await expect(page.getByTestId('island-severity')).toHaveText('Crítica')
    await expect(page.getByTestId('island-status')).toHaveText('Registrada')
    await expect(page.getByTestId('island-sla')).toHaveText('SLA vencido')
    await expect(page.getByTestId('island-summary')).toContainText(
      'continuidad docente',
    )

    // Las cinco secciones, todas cerradas.
    await expect(page.getByTestId('island-section-toggle')).toHaveCount(5)
    await expect(page.getByTestId('island-section-panel')).toHaveCount(0)

    // El contexto sigue detrás: personaje, carta activa y baraja.
    await expect(page.getByTestId('direction-character')).toBeVisible()
    await expect(page.getByTestId('active-coordination-card')).toHaveAttribute(
      'data-code',
      'coord-operaciones-academicas',
    )
    await expect(page.getByTestId('carousel-slot')).toHaveCount(5)

    // Presupuesto: 1 LEVEL 0 + 2 LEVEL 1 + 2 LEVEL 2.
    expect(callsTo(requested, '/operational-overview')).toHaveLength(1)
    expect(detailCalls(requested)).toHaveLength(2)
    // Nada de secciones perezosas todavía.
    expect(callsTo(requested, '/evidences')).toHaveLength(0)
    expect(callsTo(requested, '/timeline')).toHaveLength(0)
    expect(callsTo(requested, '/recommendations')).toHaveLength(0)

    // La página no desplaza.
    const overflow = await page.evaluate(() => ({
      x:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      y:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    }))
    expect(overflow.x).toBeLessThanOrEqual(0)
    expect(overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('problem-island-closed-sections-1440x900.png'),
      fullPage: false,
    })
  })

  test('solo una isla: otro problema no abre un segundo detalle', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const before = detailCalls(requested).length

    // La fila de detrás sigue visible, pero no abre nada.
    await expect(page.getByTestId('problem-row').nth(1)).toBeVisible()

    // El clic se DESPACHA sobre la fila en lugar de pulsar sus coordenadas.
    // Pulsar el punto central de la fila no comprueba lo que esta prueba
    // vigila: la isla se superpone a la carta activa y ese punto puede caer
    // sobre el velo —a 1440x900 quedaba a 5 px del borde superior de la isla—,
    // en cuyo caso lo que se ejercita es el cierre por velo, que es
    // comportamiento correcto de la isla y está cubierto en su propia prueba.
    // Lo que aquí importa es que una segunda selección de problema no abra un
    // segundo detalle, y eso es una garantía del reducer, no de la geometría.
    await page.getByTestId('problem-row').nth(1).dispatchEvent('click')

    await expect(page.getByTestId('problem-island')).toHaveCount(1)
    await expect(page.getByTestId('problem-island')).toContainText(
      'Aulas sin conectividad',
    )
    expect(detailCalls(requested)).toHaveLength(before)
  })

  test('Escape cierra la isla y la coordinación sigue seleccionada', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('problem-island')).toHaveCount(0)
    await expect(page.getByTestId('active-coordination-card')).toHaveAttribute(
      'data-code',
      'coord-operaciones-academicas',
    )
    await expect(page.getByTestId('problem-row')).toHaveCount(4)
  })

  test('el botón cerrar y el velo también cierran', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    await page.getByTestId('island-close').click()
    await expect(page.getByTestId('problem-island')).toHaveCount(0)

    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('problem-island')).toBeVisible()
    // Se pulsa una esquina: el centro del velo queda detrás de la isla, que
    // interceptaría el clic. Es donde un usuario pulsa «fuera» de verdad.
    await page
      .getByTestId('problem-island-veil')
      .click({ position: { x: 8, y: 8 } })
    await expect(page.getByTestId('problem-island')).toHaveCount(0)
  })

  test('reabrir el mismo problema no cuesta peticiones', async ({ page }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const before = detailCalls(requested).length
    expect(before).toBe(2)

    await page.getByTestId('island-close').click()
    await expect(page.getByTestId('problem-island')).toHaveCount(0)

    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('island-summary')).toBeVisible()
    expect(detailCalls(requested)).toHaveLength(before)
  })

  test('Impacto e Inteligencia IA se abren sin pedir nada', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const before = requested.length

    await page.getByTestId('island-section-toggle').first().click()
    await expect(page.getByTestId('island-impact-areas')).toBeVisible()
    await expect(page.getByTestId('island-section-panel')).toHaveCount(1)

    await page.getByTestId('island-section-toggle').nth(1).click()
    await expect(page.getByTestId('island-ai')).toBeVisible()
    await expect(page.getByTestId('island-ai')).toContainText(
      'Riesgo concentrado',
    )

    // Ambas salen del análisis ya cargado: cero peticiones nuevas.
    expect(requested).toHaveLength(before)

    await page.screenshot({
      path: testInfo.outputPath('problem-island-impact-open-1440x900.png'),
      fullPage: false,
    })
  })

  test('Evidencias carga al desplegarse y no vuelve a pedir', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    expect(callsTo(requested, '/evidences')).toHaveLength(0)

    await page.getByTestId('island-section-toggle').nth(3).click()
    await expect(page.getByTestId('island-evidences')).toBeVisible()
    await expect(page.getByTestId('island-evidences')).toContainText(
      'Foto del rack',
    )
    expect(callsTo(requested, '/evidences')).toHaveLength(1)

    await page.screenshot({
      path: testInfo.outputPath('problem-island-evidence-open-1440x900.png'),
      fullPage: false,
    })

    // Cerrar y reabrir la sección no repite la petición.
    await page.getByTestId('island-section-toggle').nth(3).click()
    await expect(page.getByTestId('island-evidences')).toHaveCount(0)
    await page.getByTestId('island-section-toggle').nth(3).click()
    await expect(page.getByTestId('island-evidences')).toBeVisible()
    expect(callsTo(requested, '/evidences')).toHaveLength(1)
  })

  test('Timeline y Recomendaciones cargan cada uno con una petición', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    await page.getByTestId('island-section-toggle').nth(2).click()
    await expect(page.getByTestId('island-recommendations')).toContainText(
      'Escalar al proveedor',
    )
    expect(callsTo(requested, '/recommendations')).toHaveLength(1)

    await page.getByTestId('island-section-toggle').nth(4).click()
    await expect(page.getByTestId('island-timeline')).toContainText(
      'Estado actualizado',
    )
    expect(callsTo(requested, '/timeline')).toHaveLength(1)
  })

  test('el fallo de una sección no rompe la isla', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page, { failEvidences: true })
    await openProblem(page)

    await page.getByTestId('island-section-toggle').nth(3).click()
    await expect(page.getByTestId('island-section-error')).toBeVisible()

    // La isla sigue viva: otra sección abre con normalidad.
    await expect(page.getByTestId('island-summary')).toBeVisible()
    await page.getByTestId('island-section-toggle').nth(4).click()
    await expect(page.getByTestId('island-timeline')).toBeVisible()
  })

  test('el fallo del detalle deja la isla abierta con su aviso', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page, { failDetail: true })
    await openProblem(page)

    await expect(page.getByTestId('island-error')).toBeVisible()
    await expect(page.getByTestId('island-close')).toBeVisible()
    // LEVEL 1 intacto detrás.
    await expect(page.getByTestId('active-coordination-card')).toHaveAttribute(
      'data-status',
      'CRITICO',
    )
    await expect(page.getByTestId('problem-row')).toHaveCount(4)

    await page.screenshot({
      path: testInfo.outputPath('problem-island-error-1440x900.png'),
      fullPage: false,
    })
  })

  test('una situación sin análisis declara la ausencia y usa la descripción', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page, { withoutAnalysis: true })
    await openProblem(page)

    // El resumen viene de la descripción, sin inventar texto ni llamar a IA.
    await expect(page.getByTestId('island-summary')).toContainText(
      'La sede norte perdió conectividad',
    )

    await page.getByTestId('island-section-toggle').nth(1).click()
    await expect(page.getByTestId('island-ai-absent')).toBeVisible()
  })

  test('no hay acciones mutables en la isla', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    for (const section of [0, 1, 2, 3, 4]) {
      await page.getByTestId('island-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('island-section-panel')).toHaveCount(5)

    const island = page.getByTestId('problem-island')
    await expect(island.locator('form')).toHaveCount(0)
    await expect(island.locator('input')).toHaveCount(0)
    await expect(island.locator('textarea')).toHaveCount(0)
    for (const label of [
      /reanalizar/i,
      /editar/i,
      /eliminar/i,
      /cerrar situación/i,
      /simular/i,
    ]) {
      await expect(island.getByRole('button', { name: label })).toHaveCount(0)
    }
  })
})

test.describe('isla del problema 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('la isla crece con las secciones sin romper el viewport', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    for (const section of [0, 1, 2, 3, 4]) {
      await page.getByTestId('island-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('island-section-panel')).toHaveCount(5)

    const overflow = await page.evaluate(() => ({
      x:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      y:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    }))
    expect(overflow.x).toBeLessThanOrEqual(0)
    expect(overflow.y).toBeLessThanOrEqual(0)

    // La isla queda dentro del viewport y con scroll propio si hace falta.
    const box = await page.getByTestId('problem-island').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(1081)

    await expect(page.getByTestId('direction-character')).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('problem-island-1920x1080.png'),
      fullPage: false,
    })
  })
})
