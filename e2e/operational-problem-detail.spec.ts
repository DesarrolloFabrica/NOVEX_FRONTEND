import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * DETALLE PERSISTENTE del problema (LEVEL 2).
 *
 * El detalle dejó de ser una isla flotante con velo y botón de cerrar: vive en
 * la región `problem-detail` del shell, que existe siempre. Este fichero
 * comprueba la mudanza entera —marcadores, carga, error, secciones, cambio de
 * problema, cambio de coordinación y vuelta a la Dirección— y, sobre todo, que
 * pulsar una fila ya no abre nada encima de la escena.
 *
 * Presupuesto vigilado en cada prueba: una petición de LEVEL 0, dos de LEVEL 1
 * por coordinación nueva y DOS al abrir un problema: la situación y, en cuanto
 * está lista, sus evidencias (de ellas depende que «Notas del reporte»
 * exista). La cronología, una vez, al desplegarse por primera vez.
 *
 * Sin IA: el detalle no pide `/analysis` ni `/recommendations`. Los mocks de
 * esas rutas siguen instalados a propósito, como trampa: si algo volviera a
 * pedirlas, las pruebas lo contarían.
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
    // Persisten en el backend, pero el detalle ya no las muestra: no son un
    // impacto medido. Se dejan aquí para comprobar que no reaparecen.
    relatedCoordinations: [
      {
        id: 'rel-1',
        coordinationId: 'coord-transversales-id',
        coordinationCode: 'coord-transversales',
        coordinationName: 'Coordinación Transversales',
        coordinationShortName: 'TRV',
        displayOrder: 7,
      },
    ],
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
  /** Falla solo la primera petición de evidencias, para probar el reintento. */
  failEvidencesOnce?: boolean
  /** Retrasa el detalle inicial, para poder observar el estado de carga. */
  detailDelayMs?: number
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
      if (options.detailDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.detailDelayMs),
        )
      }
      const id = path.split('/').at(-1)
      const situation =
        [...OPEN_PROBLEMS, ...IN_PROGRESS_PROBLEMS].find(
          (item) => item.id === id,
        ) ?? OPEN_PROBLEMS[0]
      await route.fulfill({ json: situation })
      return
    }

    // Trampa: el detalle ya no debe pedir el análisis IA (se cuenta en las pruebas).
    if (path.endsWith('/analysis')) {
      await route.fulfill({ json: ANALYSIS })
      return
    }

    if (path.endsWith('/evidences')) {
      const evidenceCalls = requested.filter((entry) =>
        entry.endsWith('/evidences'),
      ).length
      if (
        options.failEvidences ||
        (options.failEvidencesOnce && evidenceCalls === 1)
      ) {
        await route.fulfill({ status: 500, json: { message: 'E2E' } })
        return
      }
      // El segundo problema no tiene notas: «Notas del reporte» no debe aparecer.
      if (path.includes(`/${SECOND_PROBLEM_ID}/`)) {
        await route.fulfill({
          json: { situationId: SECOND_PROBLEM_ID, items: [], total: 0 },
        })
        return
      }
      await route.fulfill({
        json: {
          situationId: PROBLEM_ID,
          items: [
            {
              id: 'ev-note-1',
              situationId: PROBLEM_ID,
              uploadedByUserId: 'u',
              uploadedByUserName: 'Ana Pérez',
              type: 'NOTE',
              title: 'Notas adicionales',
              description:
                'El proveedor confirmó la caída del enlace principal.\nSe pidió un enlace de respaldo para el bloque B.',
              fileName: null,
              storagePath: null,
              mimeType: null,
              fileSize: null,
              createdAt: '2026-08-01T12:00:00.000Z',
            },
            {
              id: 'ev-note-2',
              situationId: PROBLEM_ID,
              uploadedByUserId: 'u',
              // Autor ausente: la vista debe declararlo, no inventarlo.
              uploadedByUserName: '',
              type: 'NOTE',
              title: 'Método de detección',
              description: 'Reporte directo de docentes.',
              fileName: null,
              storagePath: null,
              mimeType: null,
              fileSize: null,
              createdAt: '2026-08-01T12:05:00.000Z',
            },
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
          total: 3,
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
              userId: 'u-coord',
              userName: 'Coordinadora Operaciones',
              eventType: 'STATUS_CHANGED',
              title: 'Estado actualizado',
              description: 'El estado cambió de Abierto a En atención.',
              metadata: {
                field: 'status',
                previousValue: 'OPEN',
                newValue: 'IN_PROGRESS',
                statusComment: 'Se escaló al proveedor de conectividad.',
                commentKind: 'note',
              },
              createdAt: '2026-08-01T12:30:00.000Z',
            },
            {
              id: 'tl-sla',
              situationId: PROBLEM_ID,
              userId: null,
              userName: null,
              eventType: 'SLA_BREACHED',
              title: 'Plazo operativo vencido',
              description: 'La situación superó su fecha límite de resolución.',
              metadata: { dueAt: '2026-08-02T10:00:00.000Z', slaHealth: 'overdue' },
              createdAt: '2026-08-02T10:20:00.000Z',
            },
            // Código aún no catalogado y fecha rota: etiqueta neutra, sin romper.
            {
              id: 'tl-unknown',
              situationId: PROBLEM_ID,
              userId: null,
              userName: null,
              eventType: 'SOMETHING_NEW',
              title: 'Algo nuevo',
              description: 'Actividad de un tipo aún no catalogado.',
              metadata: { nested: { raw: true } },
              createdAt: 'fecha-rota',
            },
            // Eventos del circuito de IA: la Cronología debe descartarlos.
            {
              id: 'tl-ai',
              situationId: PROBLEM_ID,
              userId: null,
              userName: null,
              eventType: 'AI_ANALYZED',
              title: 'Análisis IA ejecutado',
              description: '',
              metadata: null,
              createdAt: '2026-08-01T11:00:00.000Z',
            },
            {
              id: 'tl-rec',
              situationId: PROBLEM_ID,
              userId: null,
              userName: null,
              eventType: 'RECOMMENDATION_GENERATED',
              title: 'Recomendación generada por IA',
              description: '',
              metadata: { generatedBy: 'AI' },
              createdAt: '2026-08-01T11:05:00.000Z',
            },
          ],
          total: 3,
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
      /*
       * Cualquier coordinación devuelve la misma lista.
       *
       * Mientras el detalle era una isla, solo hacía falta poblar Operación
       * Académica: ninguna prueba cambiaba de área con un problema abierto.
       * Ahora sí —el detalle tiene que desaparecer al cambiar de coordinación, y
       * la hija del mazo tiene que poder abrir el suyo—, así que el catálogo
       * responde para todas. El `coordinationId` sigue viajando en la petición y
       * se registra, de modo que el presupuesto de llamadas se sigue vigilando.
       */
      const status = url.searchParams.get('status') ?? ''
      const items = status === 'OPEN' ? OPEN_PROBLEMS : IN_PROGRESS_PROBLEMS
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
  await expect(page.getByTestId('problem-detail')).toBeVisible()
}

function callsTo(requested: readonly string[], fragment: string): string[] {
  return requested.filter((entry) => entry.includes(fragment))
}

/**
 * Peticiones de LEVEL 2: el detalle de UN problema (y cualquier subruta suya).
 *
 * Se excluye `/situations/categories`, que desde la fase 2 pide el formulario
 * del panel derecho una sola vez al montar y no tiene nada que ver con abrir un
 * problema. El presupuesto que esta prueba vigila —una petición al abrir,
 * cero al volver— no admite el análisis IA.
 */
function detailCalls(requested: readonly string[]): string[] {
  return requested.filter(
    (path) =>
      path.includes('/situations/') && !path.includes('/situations/categories'),
  )
}

/**
 * Cotas del detalle en su región. Lo que se vigila no es la estética sino la
 * contención: la banda superior no crece, la baraja no se mueve y no aparece
 * ninguna capa sobre la escena.
 */
async function measureDetail(page: Page, label: string) {
  const round = (value: number) => Math.round(value)
  const boxOf = async (selector: string) => {
    const box = await page.locator(selector).first().boundingBox()
    return box
  }

  const region = (await boxOf('[data-testid="shell-region-action"]'))!
  const listRegion = (await boxOf('[data-testid="shell-region-coordination-problems"]'))!
  const stage = (await boxOf('[data-testid="shell-stage"]'))!
  const top = (await boxOf('[data-testid="shell-top"]'))!
  const detail = await boxOf('[data-testid="problem-detail"]')
  const header = await boxOf('.problem-detail__header')
  const content = await boxOf('.problem-detail__sections')

  const scroll = await page.evaluate(() => {
    const el = document.querySelector(
      '.problem-detail__sections',
    ) as HTMLElement | null
    if (!el) return null
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      scrollable: el.scrollHeight > el.clientHeight + 1,
    }
  })

  const measurement = {
    label,
    viewport: page.viewportSize(),
    topHeight: round(top.height),
    region: {
      x: round(region.x),
      y: round(region.y),
      width: round(region.width),
      height: round(region.height),
      bottom: round(region.y + region.height),
    },
    listRegion: {
      x: round(listRegion.x),
      y: round(listRegion.y),
      width: round(listRegion.width),
      height: round(listRegion.height),
    },
    detail: detail && {
      x: round(detail.x),
      y: round(detail.y),
      width: round(detail.width),
      height: round(detail.height),
      bottom: round(detail.y + detail.height),
    },
    header: header && { height: round(header.height) },
    content: content && {
      y: round(content.y),
      height: round(content.height),
    },
    detailScroll: scroll,
    stage: {
      x: round(stage.x),
      y: round(stage.y),
      width: round(stage.width),
      height: round(stage.height),
    },
    dialogs: await page.locator('[role="dialog"]').count(),
    modals: await page.locator('[aria-modal]').count(),
    veils: await page.getByTestId('problem-detail-veil').count(),
    islands: await page.getByTestId('problem-island').count(),
    routeScroll: await page.evaluate(() => {
      const host = document.querySelector('.novex-os-deck__content')
      return host
        ? {
            scrollTop: Math.round(host.scrollTop),
            overflow: host.scrollHeight - host.clientHeight,
          }
        : null
    }),
    overflow: await page.evaluate(() => ({
      x:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      y:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    })),
  }

  console.log(`DETAIL ${JSON.stringify(measurement)}`)
  return measurement
}

test.describe('detalle persistente del problema · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('C · el clic en un problema llena la región, sin abrir nada encima', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const detail = page.getByTestId('problem-detail')

    // NO es una capa: ni diálogo, ni modal, ni velo, ni isla.
    await expect(detail).not.toHaveAttribute('role', 'dialog')
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    await expect(page.locator('[aria-modal]')).toHaveCount(0)
    await expect(page.getByTestId('problem-detail-veil')).toHaveCount(0)
    await expect(page.getByTestId('problem-island')).toHaveCount(0)

    // Y vive en su región del shell, no flotando sobre la escena.
    await expect(
      page.locator(
        '[data-testid="shell-region-action"] [data-testid="problem-detail"]',
      ),
    ).toHaveCount(1)

    // Cabecera: título, severidad, estado y SLA.
    await expect(detail).toContainText('Aulas sin conectividad')
    await expect(page.getByTestId('detail-severity')).toHaveText('Crítica')
    await expect(page.getByTestId('detail-status')).toHaveText('Abierto')
    await expect(page.getByTestId('detail-sla')).toHaveText('SLA vencido')
    await expect(page.getByTestId('detail-folio')).toBeVisible()
    // Contexto antes de la descripción, y la descripción es la del reporte.
    await expect(page.getByTestId('detail-context')).toContainText(
      'Coordinador Operaciones Académicas',
    )
    await expect(page.getByTestId('detail-description')).toContainText(
      'La sede norte perdió conectividad',
    )

    // Notas, Otras evidencias y Cronología, todas cerradas y sin contador.
    // Ni Impacto ni IA.
    await expect(page.getByTestId('detail-section-toggle')).toHaveCount(3)
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(0)
    await expect(detail.locator('.detail-section__hint')).toHaveCount(0)
    for (const forbidden of [
      'Impacto',
      'Coordinación Transversales',
      'Inteligencia IA',
      'Recomendaciones',
      'Timeline',
    ]) {
      await expect(detail).not.toContainText(forbidden)
    }
    await expect(detail).toContainText('Notas del reporte')
    await expect(detail).toContainText('Otras evidencias')
    await expect(detail).toContainText('Cronología')

    // El contexto sigue detrás: personaje, mesa completa y panel de LEVEL 1.
    await expect(page.getByTestId('direction-character')).toBeVisible()
    await expect(page.getByTestId('coordination-problem-list')).toHaveAttribute(
      'data-code',
      'coord-operaciones-academicas',
    )
    // La escena de detrás sigue entera: los nueve slots de la mesa y, como el
    // problema se abrió desde un mazo, sus cinco subordinaciones repartidas.
    await expect(
      page.locator('[data-testid="coordination-table-slot"]'),
    ).toHaveCount(9)
    await expect(
      page.locator('[data-testid="coordination-deck-fan-slot"]'),
    ).toHaveCount(5)

    // Presupuesto: 1 LEVEL 0 + 2 LEVEL 1 + 2 LEVEL 2 (situación y evidencias,
    // sin IA). La cronología no se pide hasta desplegarse.
    expect(callsTo(requested, '/operational-overview')).toHaveLength(1)
    expect(detailCalls(requested)).toHaveLength(2)
    expect(callsTo(requested, '/evidences')).toHaveLength(1)
    expect(callsTo(requested, '/analysis')).toHaveLength(0)
    expect(callsTo(requested, '/recommendations')).toHaveLength(0)
    expect(callsTo(requested, '/timeline')).toHaveLength(0)

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
      path: testInfo.outputPath('problem-detail-closed-sections-1440x900.png'),
      fullPage: false,
    })
  })

  test('detalle muestra solo expediente/acciones; sin CTAs de creación', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    const panel = page.getByTestId('action-panel')
    await expect(panel).toHaveAttribute('data-mode', 'detail')
    await expect(page.getByTestId('problem-detail')).toBeVisible()
    await expect(page.getByTestId('problem-actions')).toBeVisible()
    await expect(page.getByTestId('status-advance-block')).toBeVisible()

    // Las vías de creación NO viven dentro del expediente.
    await expect(panel.getByTestId('report-internal-button')).toHaveCount(0)
    await expect(panel.getByTestId('report-dependency-button')).toHaveCount(0)
    // Ni en Mis reportes (solo consulta).
    await expect(
      page.getByTestId('my-reports').getByTestId('report-internal-button'),
    ).toHaveCount(0)

    // Timeline abierto: no debe solaparse con «Seguimiento del problema».
    const timelineToggle = page
      .locator('[data-section="timeline"] [data-testid="detail-section-toggle"]')
      .first()
    await timelineToggle.click()
    await expect(
      page.locator('[data-section="timeline"][data-expanded="true"]'),
    ).toBeVisible()

    const timelineBox = await page
      .locator('[data-section="timeline"]')
      .first()
      .boundingBox()
    const trackingBox = await page
      .getByTestId('status-advance-block')
      .boundingBox()
    expect(timelineBox).toBeTruthy()
    expect(trackingBox).toBeTruthy()
    if (timelineBox && trackingBox) {
      expect(trackingBox.y).toBeGreaterThan(timelineBox.y + timelineBox.height)
    }

    await page.screenshot({
      path: testInfo.outputPath('problem-detail-no-create-ctas-1440x900.png'),
      fullPage: false,
    })

    /*
     * ADMIN consulta: al volver a idle no aparecen botones de registro aunque
     * algún seed de backend conceda SITUATIONS_CREATE. La creación se ejercita
     * con ANALISTA/COORDINADOR en otros specs.
     */
    await page.getByTestId('breadcrumb-direction').click()
    await expect(panel).toHaveAttribute('data-mode', 'idle')
    await expect(page.getByTestId('problem-detail')).toHaveCount(0)
    await expect(panel).toHaveAttribute('data-can-create', 'false')
    await expect(panel.getByTestId('report-internal-button')).toHaveCount(0)
    await expect(panel.getByTestId('report-dependency-button')).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('action-panel-idle-admin-no-create-1440x900.png'),
      fullPage: false,
    })
  })

  test('D · elegir otro problema cambia el detalle en el mismo sitio', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const before = detailCalls(requested).length
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Aulas sin conectividad',
    )

    // La segunda fila es alcanzable con el puntero: ya no hay capa encima.
    await page.getByTestId('problem-row').nth(1).click()

    // Mismo panel, otro problema. Ni se desmonta la región ni aparece una
    // segunda: cambiar de problema es mirar otra cosa, no abrir otra ventana.
    await expect(page.getByTestId('problem-detail')).toHaveCount(1)
    await expect(page.getByTestId('problem-detail')).toContainText('Cupos')
    await expect(page.getByTestId('problem-detail')).not.toContainText(
      'Aulas sin conectividad',
    )
    // Y el segundo problema sí cuesta su propio LEVEL 2.
    expect(detailCalls(requested).length).toBeGreaterThan(before)

    // La fila observada se declara, y solo una.
    await expect(
      page.locator('[data-testid="problem-row"][aria-current="true"]'),
    ).toHaveCount(1)
  })

  test('volver a un problema ya visto no cuesta peticiones', async ({ page }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    // Situación y evidencias: hay que esperar a que las notas se resuelvan.
    await expect(page.getByTestId('detail-notes-loading')).toHaveCount(0)
    const first = detailCalls(requested).length
    expect(first).toBe(2)

    // Se mira otro problema y se vuelve al primero.
    await page.getByTestId('problem-row').nth(1).click()
    await expect(page.getByTestId('problem-detail')).toContainText('Cupos')
    await expect(page.getByTestId('detail-notes-loading')).toHaveCount(0)
    const afterSecond = detailCalls(requested).length

    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Aulas sin conectividad',
    )

    // El primero estaba en caché, notas incluidas: ni una petición más.
    expect(detailCalls(requested)).toHaveLength(afterSecond)
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Notas del reporte',
    )
  })

  test('Notas del reporte: contenido completo, autor y fecha, sin pedir nada al abrir', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const notesToggle = page.locator(
      '[data-section="notes"] [data-testid="detail-section-toggle"]',
    )
    await expect(notesToggle).toContainText('Notas del reporte')
    const before = callsTo(requested, '/evidences').length
    expect(before).toBe(1)

    await notesToggle.click()
    const notes = page.getByTestId('detail-notes')
    await expect(notes).toContainText('Notas adicionales')
    // Contenido íntegro, con sus dos líneas, y autor y fecha legibles.
    await expect(notes).toContainText(
      'El proveedor confirmó la caída del enlace principal.',
    )
    await expect(notes).toContainText(
      'Se pidió un enlace de respaldo para el bloque B.',
    )
    await expect(notes).toContainText('Ana Pérez')
    await expect(notes).toContainText('Autor no registrado')
    // 12:00 UTC = 07:00 en Bogotá.
    await expect(notes).toContainText('07:00')
    await expect(notes).not.toContainText('NOTE')
    await expect(notes.locator('button, a')).toHaveCount(0)

    // Desplegar no cuesta peticiones: las notas ya estaban.
    expect(callsTo(requested, '/evidences')).toHaveLength(before)

    // Otras evidencias: tipo traducido, sin enlaces ni descargas.
    await page
      .locator('[data-section="other-evidences"] [data-testid="detail-section-toggle"]')
      .click()
    const others = page.getByTestId('detail-other-evidences')
    await expect(others).toContainText('Foto del rack')
    await expect(others).toContainText('Imagen')
    await expect(others).not.toContainText('IMAGE')
    await expect(others.locator('a, img, button')).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('problem-detail-notes-open-1440x900.png'),
      fullPage: false,
    })
  })

  test('un problema sin notas no muestra «Notas del reporte»', async ({ page }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    await page.getByTestId('problem-row').nth(1).click()
    await expect(page.getByTestId('problem-detail')).toContainText('Cupos')
    await expect
      .poll(() => callsTo(requested, `/${SECOND_PROBLEM_ID}/evidences`).length)
      .toBe(1)
    await expect(page.getByTestId('detail-notes-loading')).toHaveCount(0)

    const detail = page.getByTestId('problem-detail')
    await expect(detail).not.toContainText('Notas del reporte')
    await expect(detail).not.toContainText('Otras evidencias')
    await expect(page.getByTestId('detail-notes-error')).toHaveCount(0)
    // Solo queda la Cronología: ningún acordeón vacío.
    await expect(page.getByTestId('detail-section-toggle')).toHaveCount(1)
  })

  test('si las notas fallan se avisa y el reintento las recupera', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page, { failEvidencesOnce: true })
    await openProblem(page)

    // El error no se confunde con «sin notas».
    const error = page.getByTestId('detail-notes-error')
    await expect(error).toContainText('No pudimos cargar las notas del reporte.')
    await expect(page.getByTestId('problem-detail')).not.toContainText(
      'Notas del reporte',
    )
    // El resto del panel sigue utilizable.
    await expect(page.getByTestId('detail-description')).toBeVisible()
    await expect(page.getByTestId('problem-actions')).toBeVisible()

    await page.getByTestId('detail-notes-error-retry').click()
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Notas del reporte',
    )
    await expect(error).toHaveCount(0)
    expect(callsTo(requested, '/evidences')).toHaveLength(2)
  })

  test('Cronología: legible, en orden, sin IA ni códigos técnicos', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    const toggle = page.locator(
      '[data-section="timeline"] [data-testid="detail-section-toggle"]',
    )
    await expect(toggle).toContainText('Cronología')
    await toggle.click()

    const timeline = page.getByTestId('detail-timeline')
    const items = timeline.locator('li')
    // Tres visibles (los dos de IA se filtran), en el orden del backend.
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toContainText('Estado cambiado')
    await expect(items.nth(0)).toContainText('Abierto → En atención')
    await expect(items.nth(0)).toContainText(
      'Nota: Se escaló al proveedor de conectividad.',
    )
    await expect(items.nth(0)).toContainText('Coordinadora Operaciones')
    // 12:30 UTC = 07:30 en Bogotá.
    await expect(items.nth(0)).toContainText('07:30')
    await expect(items.nth(1)).toContainText('Plazo operativo vencido')
    await expect(items.nth(1)).toContainText('Sistema')
    await expect(items.nth(1)).toContainText('Fecha límite:')
    await expect(items.nth(2)).toContainText('Actividad registrada')
    await expect(items.nth(2)).toContainText('Fecha no disponible')
    await expect(items.nth(2)).not.toContainText('Sistema')

    for (const hidden of [
      'STATUS_CHANGED',
      'SLA_BREACHED',
      'SOMETHING_NEW',
      'Análisis IA ejecutado',
      'Recomendación generada por IA',
      '2026-08-01T',
      '[object Object]',
    ]) {
      await expect(timeline).not.toContainText(hidden)
    }
    expect(callsTo(requested, '/timeline')).toHaveLength(1)
    expect(callsTo(requested, '/recommendations')).toHaveLength(0)

    await page.screenshot({
      path: testInfo.outputPath('problem-detail-timeline-open-1440x900.png'),
      fullPage: false,
    })
  })

  test('H2 · el fallo de una sección no rompe la región', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page, { failEvidences: true })
    await openProblem(page)

    // Las notas fallan fuera de cualquier acordeón; no aparece uno vacío.
    await expect(page.getByTestId('detail-notes-error')).toBeVisible()
    await expect(page.getByTestId('detail-section-toggle')).toHaveCount(1)

    // La región sigue viva: la cronología abre con normalidad.
    await expect(page.getByTestId('detail-description')).toBeVisible()
    await page.getByTestId('detail-section-toggle').first().click()
    await expect(page.getByTestId('detail-timeline')).toBeVisible()
  })

  test('H · el fallo de LEVEL 2 se queda DENTRO de la región', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page, { failDetail: true })
    await openProblem(page)

    // El aviso vive en la REGIÓN, no en una capa: la escena no se tapa.
    await expect(page.getByTestId('detail-error')).toBeVisible()
    await expect(
      page.locator(
        '[data-testid="shell-region-action"] [data-testid="detail-error"]',
      ),
    ).toHaveCount(1)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    // Y no hay botón de cerrar: no se cierra un error, se elige otro problema.
    await expect(page.getByTestId('detail-close')).toHaveCount(0)

    // LEVEL 1 intacto detrás.
    await expect(page.getByTestId('coordination-problem-list')).toHaveAttribute(
      'data-status',
      'CRITICO',
    )
    await expect(page.getByTestId('problem-row')).toHaveCount(4)

    await page.screenshot({
      path: testInfo.outputPath('f3-7-detail-error-1440x900.png'),
      fullPage: false,
    })
  })

  test('abrir el detalle y todas sus secciones no consulta IA', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openProblem(page)

    // La descripción completa del reporte, no un resumen generado.
    await expect(page.getByTestId('detail-description')).toContainText(
      'sin fecha estimada de restablecimiento por parte del proveedor.',
    )

    for (const section of [0, 1, 2]) {
      await page.getByTestId('detail-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(3)

    expect(callsTo(requested, '/analysis')).toHaveLength(0)
    expect(callsTo(requested, '/recommendations')).toHaveLength(0)
    expect(callsTo(requested, '/ai')).toHaveLength(0)
  })

  test('no hay acciones mutables en el detalle', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    for (const section of [0, 1, 2]) {
      await page.getByTestId('detail-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(3)

    const detail = page.getByTestId('problem-detail')
    await expect(detail.locator('form')).toHaveCount(0)
    await expect(detail.locator('input')).toHaveCount(0)
    await expect(detail.locator('textarea')).toHaveCount(0)
    for (const label of [
      /reanalizar/i,
      /analizar/i,
      /generar/i,
      /recomendaci/i,
      /editar/i,
      /eliminar/i,
      /cerrar situación/i,
      /simular/i,
    ]) {
      await expect(detail.getByRole('button', { name: label })).toHaveCount(0)
    }
  })

  test('A+B · los dos marcadores: sin coordinación y sin problema', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })

    const detailRegion = page.getByTestId('shell-region-action')

    /*
     * A · GLOBAL: las dos regiones invitan, ninguna afirma.
     *
     * El panel derecho dejó de ser la región «Detalle del problema» y pasó a
     * ser el sitio donde se OPERA, así que en reposo invita a las dos cosas que
     * se pueden hacer. Lo que esta prueba protege sigue igual: sin selección no
     * hay detalle, solo un marcador.
     */
    await expect(detailRegion).toBeVisible()
    await expect(detailRegion).toContainText('Reportar o consultar')
    await expect(detailRegion).toContainText('Seleccione una coordinación')
    await expect(page.getByTestId('problem-detail')).toHaveCount(0)
    await expect(page.getByTestId('shell-region-coordination-problems')).toContainText(
      'Seleccione una coordinación',
    )
    // El marcador no puede parecer un control.
    expect(
      await detailRegion.locator('button, a, input, [tabindex]').count(),
    ).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('f3-1-global-placeholders-1440x900.png'),
      fullPage: false,
    })

    // B · con coordinación observada, el detalle sigue esperando.
    await page.locator(`${CARD}[data-code="coord-b2b"]`).click()
    await expect(page.getByTestId('problem-row')).toHaveCount(4)
    await expect(detailRegion).toContainText('Elija un problema de la lista')
    await expect(page.getByTestId('problem-detail')).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('f3-2-b2b-no-problem-1440x900.png'),
      fullPage: false,
    })

    // C · y al elegir un problema, la región se llena en su sitio.
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Aulas sin conectividad',
    )

    await page.screenshot({
      path: testInfo.outputPath('f3-3-b2b-problem-detail-1440x900.png'),
      fullPage: false,
    })
  })

  test('G · sin caché, la carga se anuncia DENTRO de la región', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page, { detailDelayMs: 900 })
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })
    await page
      .locator(`${CARD}[data-code="coord-operaciones-academicas"]`)
      .click()
    await expect(page.getByTestId('problem-row')).toHaveCount(4)

    await page.getByTestId('problem-row').first().click()

    // Ni un fotograma de «Elija un problema de la lista» con la carga ya lanzada: la
    // región pasa directamente a decir que está trayendo el detalle.
    await expect(page.getByTestId('detail-loading')).toBeVisible()
    await expect(
      page.getByTestId('shell-region-action'),
    ).not.toContainText('Elija un problema de la lista')
    await expect(page.getByTestId('problem-detail')).toHaveAttribute(
      'data-level2',
      'loading',
    )

    await expect(page.getByTestId('detail-description')).toBeVisible()
  })

  test('E · cambiar de coordinación se lleva el detalle anterior', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })

    /*
     * Se parte de B2B y no de un mazo: con un mazo abierto las otras ocho
     * cartas se retiran de la mesa —es la composición DECK, y está probada en su
     * fichero—, así que no habría vecina a la que saltar. Lo que aquí se mide es
     * el salto lateral entre coordinaciones simples con un problema abierto.
     */
    await page.locator(`${CARD}[data-code="coord-b2b"]`).click()
    await expect(page.getByTestId('problem-row')).toHaveCount(4)
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('problem-detail')).toContainText(
      'Aulas sin conectividad',
    )

    // Se cambia de coordinación desde la mesa, que sigue entera detrás.
    await page.locator(`${CARD}[data-code="coord-saber-pro"]`).click()
    await expect(page.getByTestId('coordination-problem-list')).toHaveAttribute(
      'data-code',
      'coord-saber-pro',
    )

    // El detalle de la coordinación anterior NO puede sobrevivir al cambio.
    await expect(page.getByTestId('problem-detail')).toHaveCount(0)
    // Con coordinación seleccionada, el panel invita a elegir un problema de
    // ESA lista o a reportar uno nuevo en ella.
    await expect(
      page.getByTestId('shell-region-action'),
    ).toContainText('Elija un problema de la lista')

    await page.screenshot({
      path: testInfo.outputPath('f3-5-coordination-switch-1440x900.png'),
      fullPage: false,
    })
  })

  test('K · volver a la Dirección deja las dos regiones en su marcador', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    await page.getByTestId('breadcrumb-direction').click()

    await expect(page.getByTestId('problem-detail')).toHaveCount(0)
    // Sin coordinación, el panel vuelve a invitar a elegir una carta.
    await expect(
      page.getByTestId('shell-region-action'),
    ).toContainText('Seleccione una coordinación')
    await expect(page.getByTestId('shell-region-coordination-problems')).toContainText(
      'Seleccione una coordinación',
    )
    await expect(page.locator(`${CARD}`)).toHaveCount(9)
  })

  test('F · una hija observada lee su detalle sin recoger la mano', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })

    await page
      .locator(`${CARD}[data-code="coord-operaciones-academicas"]`)
      .click()
    await page
      .locator(
        '[data-testid="coordination-deck-fan-slot"][data-code="coord-ingenierias"] button',
      )
      .click()
    await expect(page.getByTestId('coordination-problem-list')).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )

    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()

    // La mano sigue repartida y la composición no retrocede.
    await expect(
      page.locator('[data-testid="coordination-deck-fan-slot"]'),
    ).toHaveCount(5)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')

    await page.screenshot({
      path: testInfo.outputPath('f3-6-deck-child-detail-1440x900.png'),
      fullPage: false,
    })
  })

  test('J+L · con el detalle abierto no hay capa, ni desborde, ni baraja movida', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })


    await page
      .locator(`${CARD}[data-code="coord-operaciones-academicas"]`)
      .click()
    await expect(page.getByTestId('problem-row')).toHaveCount(4)

    /*
     * Referencia con la coordinación YA observada: lo que esta prueba afirma es
     * que ABRIR UN PROBLEMA no mueve la baraja. Que seleccionar una carta
     * tampoco la mueva es asunto de la composición, y tiene su propio fichero.
     */
    const stageBefore = await page.getByTestId('shell-stage').boundingBox()
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()

    // Todas las secciones abiertas: el peor caso de contenido.
    for (const section of [0, 1, 2]) {
      await page.getByTestId('detail-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(3)

    await page.screenshot({
      path: testInfo.outputPath('f3-4-detail-sections-open-1440x900.png'),
      fullPage: false,
    })

    const measurement = await measureDetail(page, 'DETALLE 1440 · 5 secciones')

    // J · ni diálogo, ni modal, ni velo, ni isla.
    expect(measurement.dialogs).toBe(0)
    expect(measurement.modals).toBe(0)
    expect(measurement.veils).toBe(0)
    expect(measurement.islands).toBe(0)

    // La banda superior no creció y la baraja no se movió.
    expect(measurement.topHeight).toBe(268)
    expect(measurement.stage.y).toBe(Math.round(stageBefore!.y))
    expect(measurement.stage.height).toBe(Math.round(stageBefore!.height))

    // L · sin desborde y sin scroll de ruta.
    expect(measurement.overflow.x).toBeLessThanOrEqual(0)
    expect(measurement.overflow.y).toBeLessThanOrEqual(0)
    expect(measurement.routeScroll!.scrollTop).toBe(0)

    /*
     * Lo que sobra se desplaza por dentro. El contenedor que desplaza es
     * `.action-panel`, no el detalle: un detalle que se encogía para «caber»
     * dejaba su contenido derramado bajo «Seguimiento del problema». Por eso
     * se afirma la contención del panel y el orden sin solape, no la caja del
     * detalle (que, dentro de un scroll, puede medir más que la región).
     */
    const containment = await page.evaluate(() => {
      const panel = document.querySelector('.action-panel') as HTMLElement
      const region = document.querySelector(
        '[data-testid="shell-region-action"]',
      ) as HTMLElement
      const detail = document.querySelector(
        '[data-testid="problem-detail"]',
      ) as HTMLElement
      const actions = document.querySelector(
        '[data-testid="problem-actions"]',
      ) as HTMLElement
      return {
        panelBottom: panel.getBoundingClientRect().bottom,
        regionBottom: region.getBoundingClientRect().bottom,
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        overflowY: getComputedStyle(panel).overflowY,
        detailBottom: detail.getBoundingClientRect().bottom,
        actionsTop: actions.getBoundingClientRect().top,
      }
    })
    expect(containment.panelBottom).toBeLessThanOrEqual(
      containment.regionBottom + 1,
    )
    expect(containment.overflowY).toBe('auto')
    expect(containment.panelScrollable).toBe(true)
    expect(containment.detailBottom).toBeLessThanOrEqual(containment.actionsTop)
  })

  test('I · las secciones se abren y cierran con teclado', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    const first = page.getByTestId('detail-section-toggle').first()
    await first.focus()
    await expect(first).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(1)
    await expect(first).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Space')
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(0)
    await expect(first).toHaveAttribute('aria-expanded', 'false')

    // El foco no queda atrapado: el tabulador sigue recorriendo la escena.
    await page.keyboard.press('Tab')
    await expect(first).not.toBeFocused()
  })

})

test.describe('detalle persistente del problema · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('M · el detalle crece con las secciones sin romper el viewport', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openProblem(page)

    for (const section of [0, 1, 2]) {
      await page.getByTestId('detail-section-toggle').nth(section).click()
    }
    await expect(page.getByTestId('detail-section-panel')).toHaveCount(3)

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

    // El detalle queda dentro de su región y con scroll propio si hace falta.
    const box = await page.getByTestId('problem-detail').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(1081)

    await expect(page.getByTestId('direction-character')).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('problem-detail-1920x1080.png'),
      fullPage: false,
    })
  })

  test('la misma migración escala: detalle en su región a 1920', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-level0', 'ready', { timeout: 60_000 })

    // B2B con un problema observado.
    await page.locator(`${CARD}[data-code="coord-b2b"]`).click()
    await expect(page.getByTestId('problem-row')).toHaveCount(4)
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()

    const simple = await measureDetail(page, 'DETALLE 1920 · B2B')
    expect(simple.dialogs).toBe(0)
    expect(simple.islands).toBe(0)
    expect(simple.topHeight).toBe(268)
    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f3-8-b2b-detail-1920x1080.png'),
      fullPage: false,
    })

    // Y una hija del mazo, con la mano repartida.
    await page.getByTestId('breadcrumb-direction').click()
    await page
      .locator(`${CARD}[data-code="coord-operaciones-academicas"]`)
      .click()
    await page
      .locator(
        '[data-testid="coordination-deck-fan-slot"][data-code="coord-ingenierias"] button',
      )
      .click()
    await expect(page.getByTestId('coordination-problem-list')).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('detail-description')).toBeVisible()

    const child = await measureDetail(page, 'DETALLE 1920 · hija')
    expect(child.dialogs).toBe(0)
    expect(child.overflow.y).toBeLessThanOrEqual(0)
    await expect(
      page.locator('[data-testid="coordination-deck-fan-slot"]'),
    ).toHaveCount(5)

    await page.screenshot({
      path: testInfo.outputPath('f3-9-deck-child-detail-1920x1080.png'),
      fullPage: false,
    })
  })
})
