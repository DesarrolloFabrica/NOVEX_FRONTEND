import { expect, test, type Page } from 'playwright/test'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
const AUTH_TOKEN_KEY = 'novex.auth.accessToken.v1'

type RoleCode = 'COORDINADOR' | 'ANALISTA' | 'DIRECTOR' | 'ADMIN'

const COORDINATIONS = [
  ['coord-general', 'Coordinación General', 'CoordGeneral'],
  ['coord-b2b', 'B2B', 'CoordB2B'],
  ['coord-bellas-artes', 'Bellas Artes', 'CoordBellasArtes'],
  ['coord-desarrollo-profesional', 'Desarrollo Profesional', 'CoordDesarrolloprof'],
  ['coord-empresarial', 'Empresarial', 'CoordTransformacionEmpresarial'],
  ['coord-especializaciones', 'Especializaciones', 'CoordEspecializaciones'],
  ['coord-ingenierias', 'Ingenierías', 'CoordIngenierias'],
  ['coord-operaciones-academicas', 'Operaciones Académicas', 'CoordOperacionesAcademicas'],
  ['coord-proyeccion-social', 'Proyección Social', 'CoordProyeccionAcademica'],
  ['coord-saber-pro', 'Saber Pro', 'CoordSaberPro'],
  ['coord-transversales', 'Transversales', 'CoordTransversales'],
  ['coord-homologaciones', 'Homologaciones', 'CoordHomologaciones'],
  ['coord-negocios', 'Negocios', 'CoordNegocios'],
  ['coord-fabrica-contenidos', 'Fábrica de contenidos', 'CoordFabricaDeContenido'],
  ['coord-servicios', 'Servicios', 'CoordServicios'],
] as const

const COORDINATION_RESPONSE = COORDINATIONS.map(
  ([code, name, imageAsset], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code,
    name,
    shortName: name,
    description: null,
    color: '#45cdd7',
    icon: 'network',
    imageAsset: `${imageAsset}.png`,
    displayOrder: index + 1,
    isActive: true,
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
  }),
)

const ACTIVE_SITUATIONS = [
  ['6ce4e56e-1111-4111-8111-111111111111', 'coord-fabrica-contenidos', 'CRITICAL', 'PLATFORM', 'Plataformas', 'Interrupción del tablero operativo'],
  ['6ce4e56e-2222-4222-8222-222222222222', 'coord-homologaciones', 'HIGH', 'NETWORK', 'Conectividad', 'Caídas recurrentes esta semana'],
  ['6ce4e56e-3333-4333-8333-333333333333', 'coord-servicios', 'MEDIUM', 'STAFF', 'Personal', 'Vacante crítica sin cobertura'],
  ['6ce4e56e-4444-4444-8444-444444444444', 'coord-b2b', 'LOW', 'PROCESS', 'Procesos', 'Seguimiento de flujo pendiente'],
].map(([id, coordinationCode, severity, categoryCode, categoryName, title], index) => ({
  id,
  title,
  description: `Contexto ejecutivo para ${title.toLowerCase()}.`,
  coordinationId: coordinationCode,
  coordinationCode,
  coordinationName: COORDINATIONS.find(([code]) => code === coordinationCode)?.[1],
  createdByUserId: 'e2e-director',
  createdByUserName: 'Directora E2E',
  assignedUserId: null,
  assignedUserName: null,
  categoryId: `category-${index + 1}`,
  categoryCode,
  categoryName,
  severity,
  status: 'OPEN',
  occurredAt: '2026-08-18T13:00:00.000Z',
  createdAt: '2026-08-18T13:00:00.000Z',
  updatedAt: `2026-08-18T13:0${index}:00.000Z`,
  relatedCoordinations: [],
}))

const PERMISSIONS = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

function accessToken(roleCode: RoleCode): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: `e2e-${roleCode.toLowerCase()}`,
    email: `${roleCode.toLowerCase()}@novex.test`,
    roleId: `role-${roleCode.toLowerCase()}`,
    roleCode,
    coordinationId:
      roleCode === 'COORDINADOR'
        ? COORDINATION_RESPONSE.find((item) => item.code === 'coord-ingenierias')?.id
        : null,
    permissions: PERMISSIONS,
    status: 'ACTIVE',
  })}.e2e`
}

async function installRole(
  page: Page,
  roleCode: RoleCode,
  options: {
    impactTourSeen?: boolean
    networkFailure?: boolean
    situations?: typeof ACTIVE_SITUATIONS
  } = {},
) {
  const coordinator = roleCode === 'COORDINADOR'
  const servedSituations = options.situations ?? ACTIVE_SITUATIONS
  const coordination = COORDINATION_RESPONSE.find(
    (item) => item.code === 'coord-ingenierias',
  )
  const session = {
    id: `e2e-${roleCode.toLowerCase()}`,
    name: `${roleCode} E2E`,
    role: coordinator ? 'ejecutor' : 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: PERMISSIONS,
    selectedAreaId: coordinator ? 'coord-ingenierias' : undefined,
    coordinationId: coordinator ? coordination?.id : undefined,
    onboardingStep: 100,
    onboardingCompleted: true,
    onboardingSeenAt: '2026-08-18T00:00:00.000Z',
  }

  await page.addInitScript(
    ({ sessionKey, tokenKey, currentSession, token, tourSeen }) => {
      localStorage.setItem(sessionKey, JSON.stringify(currentSession))
      localStorage.setItem(tokenKey, token)
      if (tourSeen && currentSession.roleCode !== 'COORDINADOR') {
        localStorage.setItem(
          `novex.impact-network.tour.v1.${encodeURIComponent(currentSession.id)}`,
          JSON.stringify({
            version: 1,
            outcome: 'completed',
            seenAt: '2026-08-18T00:00:00.000Z',
          }),
        )
      }
    },
    {
      sessionKey: AUTH_SESSION_KEY,
      tokenKey: AUTH_TOKEN_KEY,
      currentSession: session,
      token: accessToken(roleCode),
      tourSeen: options.impactTourSeen ?? true,
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode,
            roleName: roleCode,
            coordinationId: coordinator ? coordination?.id : null,
            coordinationCode: coordinator ? coordination?.code : null,
            onboardingStep: 100,
            onboardingCompleted: true,
            onboardingSeenAt: session.onboardingSeenAt,
          },
        },
      })
      return
    }

    if (path.endsWith('/coordinations/graph')) {
      if (options.networkFailure) {
        await route.fulfill({ status: 503, json: { message: 'Red E2E no disponible' } })
        return
      }
      await route.fulfill({
        json: { coordinations: COORDINATION_RESPONSE, dependencies: [] },
      })
      return
    }

    if (path.endsWith('/coordinations/network-status')) {
      await route.fulfill({
        json: {
          networkStatus: 'attention',
          globalRiskScore: 68,
          activeIncidentsCount: servedSituations.length,
          coordinationsCount: COORDINATION_RESPONSE.length,
          synchronizedCoordinationsCount: COORDINATION_RESPONSE.length,
          lastSynchronizedAt: '2026-08-18T13:05:00.000Z',
        },
      })
      return
    }

    if (path.endsWith('/coordinations') && request.method() === 'GET') {
      await route.fulfill({ json: COORDINATION_RESPONSE })
      return
    }

    if (path.endsWith('/situations') && request.method() === 'GET') {
      await route.fulfill({
        json: {
          items: servedSituations,
          total: servedSituations.length,
          page: 1,
          limit: 100,
        },
      })
      return
    }

    const matchedSituation = servedSituations.find((item) =>
      path.endsWith(`/situations/${item.id}`),
    )
    if (matchedSituation && request.method() === 'GET') {
      await route.fulfill({ json: matchedSituation })
      return
    }

    if (/\/situations\/[^/]+\/analysis$/.test(path)) {
      const situationId = path.split('/').at(-2) ?? ACTIVE_SITUATIONS[0].id
      await route.fulfill({
        json: {
          situationId,
          sessionId: 'analysis-executive-e2e',
          analysisVersion: 1,
          isLatest: true,
          provider: 'gemini',
          confidence: 0.88,
          createdAt: '2026-08-18T13:08:00.000Z',
          updatedAt: '2026-08-18T13:08:00.000Z',
          analysis: {
            schemaVersion: '1',
            analyzedAt: '2026-08-18T13:08:00.000Z',
            provider: 'gemini',
            executiveSummary: {
              headline: 'Interrupción operativa concentrada',
              summary:
                'La indisponibilidad requiere atención inmediata y permanece contenida en la coordinación de origen.',
              keyPoints: ['Continuidad del servicio', 'Seguimiento inmediato'],
            },
            incidentClassification: {
              categoryCode: 'PLATFORM',
              categoryName: 'Plataformas',
              operationalSeverity: 'CRITICAL',
              tags: ['disponibilidad'],
            },
            rootCause: { summary: 'Intermitencia del servicio', hypotheses: [] },
            impactAssessment: {
              operationalSeverity: 'CRITICAL',
              confidence: 0.88,
              estimatedDurationMinutes: 90,
              summary: 'Impacto contenido en el origen.',
              reasoning: 'No hay afectación confirmada en otras coordinaciones.',
              affectedCoordinations: [],
              propagation: [],
            },
            recommendations: [
              {
                title: 'Validar recuperación del servicio',
                description: 'Confirmar estabilidad antes de cerrar el seguimiento.',
                priority: 'CRITICAL',
              },
            ],
            immediateRisks: [
              {
                title: 'Continuidad',
                description: 'La indisponibilidad puede extender el tiempo de respuesta.',
                severity: 'HIGH',
              },
            ],
            futureRisks: [],
            missingInformation: [],
            executiveConclusion: {
              conclusion: 'Mantener seguimiento hasta confirmar estabilidad.',
              recommendedNextStep: 'Validar recuperación y monitorear recurrencia.',
            },
            confidence: { overall: 0.88, factors: [] },
          },
        },
      })
      return
    }

    if (/\/situations\/[^/]+\/impact-context$/.test(path)) {
      const situationId = path.split('/').at(-2) ?? ACTIVE_SITUATIONS[0].id
      await route.fulfill({
        json: {
          situationId,
          originCoordinationId: '',
          originCoordinationCode: 'coord-fabrica-contenidos',
          hasDeclaredRelated: false,
          canSimulate: true,
          simulationAvailable: true,
          declaredRelated: [],
          message: 'No hay otras coordinaciones afectadas.',
        },
      })
      return
    }

    if (/\/situations\/[^/]+\/affected-coordinations$/.test(path)) {
      await route.fulfill({
        json: { situationId: '', impactAssessmentId: null, items: [], total: 0 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E mock' } })
  })
}

for (const roleCode of ['DIRECTOR', 'ADMIN', 'ANALISTA'] as const) {
  test(`${roleCode} ve la red agrupada por estados y abre contexto`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installRole(page, roleCode)
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('.impact-executive')).toBeVisible()
    await expect(page.locator('.impact-executive__status-board')).toBeVisible()
    await expect(page.locator('.impact-executive__cartography')).toHaveCount(0)
    await expect(page.locator('.impact-status-island')).toHaveCount(14)
    await expect(page.locator('.impact-status-coordination')).toHaveCount(14)
    await expect(
      page.locator('.impact-status-coordination__effect'),
    ).toHaveCount(14)
    await expect(page.locator('.impact-status-island__platform')).toHaveCount(0)
    await expect(page.locator('.impact-status-group[data-status="critical"]')).toContainText('Crítico')
    await expect(page.locator('.impact-status-group[data-status="critical"] .impact-status-island')).toHaveCount(1)
    await expect(page.locator('.impact-status-group[data-status="high"] .impact-status-island')).toHaveCount(1)
    await expect(page.locator('.impact-status-group[data-status="attention"] .impact-status-island')).toHaveCount(2)
    await expect(page.locator('.impact-status-group[data-status="normal"] .impact-status-island')).toHaveCount(10)
    await expect(page.locator('.impact-executive__panel').first()).toHaveAttribute(
      'aria-label',
      'Prioridad operacional',
    )
    await expect(page.getByText('Ahora mismo', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Seleccione una coordinación', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('1 coordinación requiere atención inmediata', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.locator('.impact-executive__attention-rank').first(),
    ).toHaveText('01')

    const fabrica = page.locator(
      '.impact-status-island[data-coordination-id="coord-fabrica-contenidos"]',
    )
    await expect(fabrica.locator('img')).toHaveAttribute(
      'src',
      '/iconos/display/IconoFabrica.png',
    )
    await fabrica.click()
    await expect(
      page.locator(
        '.impact-executive-context[data-coordination-id="coord-fabrica-contenidos"]',
      ),
    ).toBeVisible()
    await expect(fabrica).toHaveAttribute('data-selected', 'true')
    await expect(
      page.getByText('Seleccione una coordinación', { exact: true }),
    ).toHaveCount(0)
    await expect(
      page.locator('.impact-executive-context__cta--primary'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar panel' }).click()
    await expect(page.locator('.impact-executive-context')).toHaveCount(0)
  })
}

test('muestra el error institucional sin dejar un skeleton infinito', async ({
  page,
}) => {
  await installRole(page, 'DIRECTOR', { networkFailure: true })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.impact-executive')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Red E2E no disponible')
  await expect(page.locator('.impact-executive__skeleton-board')).toHaveCount(0)
})

test('los filtros reorganizan el tablero sin perder la navegación', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: /Normal 10/ }).click()
  await expect(page.locator('.impact-status-group')).toHaveCount(1)
  await expect(page.locator('.impact-status-group[data-status="normal"]')).toBeVisible()
  await expect(page.locator('.impact-status-island')).toHaveCount(10)

  await page.getByRole('button', { name: /Normal 10/ }).click()
  await page.getByRole('button', { name: /Plataformas/ }).click()
  await expect(page.locator('.impact-executive__active-filter')).toBeVisible()
  await expect(page.locator('.impact-status-island')).toHaveCount(1)
  await expect(
    page.locator(
      '.impact-status-island[data-coordination-id="coord-fabrica-contenidos"]',
    ),
  ).toBeVisible()
  await page.locator('.impact-executive__active-filter').click()
  await expect(page.locator('.impact-status-island')).toHaveCount(14)
})

test('el tablero usa zoom y desplazamiento sin scroll interno', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const board = page.locator('.impact-executive__status-board')
  const canvas = page.locator('.impact-executive__status-canvas')
  const viewport = page.locator('.impact-executive__status-viewport')
  await expect(page.locator('.impact-executive__status-scroll')).toHaveCount(0)
  await expect(canvas).toHaveCSS('overflow', 'hidden')

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + 28, canvasBox.y + canvasBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      canvasBox.x + 104,
      canvasBox.y + canvasBox.height / 2 + 34,
      { steps: 6 },
    )
    await page.mouse.up()
  }
  await expect
    .poll(() =>
      viewport.evaluate((element) =>
        element.style.getPropertyValue('--status-pan-x'),
      ),
    )
    .not.toBe('0px')

  await page.getByRole('button', { name: 'Centrar mapa' }).click()
  await expect
    .poll(() =>
      viewport.evaluate((element) =>
        element.style.getPropertyValue('--status-pan-x'),
      ),
    )
    .toBe('0px')

  const draggableCoordination = page.locator(
    '.impact-status-coordination[data-coordination-id="coord-proyeccion-social"]',
  )
  const coordinationBox = await draggableCoordination.boundingBox()
  expect(coordinationBox).not.toBeNull()
  if (coordinationBox) {
    const centerX = coordinationBox.x + coordinationBox.width / 2
    const centerY = coordinationBox.y + coordinationBox.height / 2
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX - 62, centerY - 28, { steps: 6 })
    await page.mouse.up()
  }
  await expect
    .poll(() =>
      viewport.evaluate((element) =>
        element.style.getPropertyValue('--status-pan-x'),
      ),
    )
    .not.toBe('0px')
  await expect(page.locator('.impact-executive-context')).toHaveCount(0)
  await page.getByRole('button', { name: 'Centrar mapa' }).click()

  const initialZoom = Number(await board.getAttribute('data-zoom'))
  await page.getByRole('button', { name: 'Acercar mapa' }).click()
  await expect
    .poll(async () => Number(await board.getAttribute('data-zoom')))
    .toBeGreaterThan(initialZoom)
  await page.getByRole('button', { name: 'Acercar mapa' }).click()
  await page.getByRole('button', { name: 'Acercar mapa' }).click()

  const zoomedCanvasBox = await canvas.boundingBox()
  expect(zoomedCanvasBox).not.toBeNull()
  if (zoomedCanvasBox) {
    await page.mouse.move(
      zoomedCanvasBox.x + 30,
      zoomedCanvasBox.y + zoomedCanvasBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      zoomedCanvasBox.x + 80,
      zoomedCanvasBox.y + zoomedCanvasBox.height / 2 + 28,
      { steps: 5 },
    )
    await page.mouse.up()
  }
  await expect
    .poll(() =>
      viewport.evaluate((element) =>
        element.style.getPropertyValue('--status-pan-x'),
      ),
    )
    .not.toBe('0px')

  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: 'Alejar mapa' }).click()
  }
  await expect(board).toHaveAttribute('data-overview', 'true')
  await expect(page.locator('.impact-executive__status-ambient')).toHaveCSS(
    'opacity',
    '1',
  )

  if (process.env.NOVEX_CAPTURE === '1') {
    await page.screenshot({
      path: 'test-results/status-board-overview-background.png',
      fullPage: true,
    })
  }
})

test('abrir una coordinación entra al detalle institucional existente', async ({ page }) => {
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  await page
    .locator('.impact-status-island[data-coordination-id="coord-servicios"]')
    .click()
  await page.locator('.impact-executive-context__cta--map').click()
  await expect(page.locator('.impact-executive')).toHaveCount(0)
  await expect(page.locator('.organizational-scene')).toBeVisible()
})

test('la pantalla completa conserva la navegación durante todo el flujo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const platform = page.locator('.novex-os')
  const navigation = page.getByRole('complementary', {
    name: 'Navegación principal',
  })

  await page
    .getByRole('button', { name: 'Ver tablero en pantalla completa' })
    .click()
  await expect(platform).toHaveAttribute('data-immersive', 'true')
  await expect(navigation).toBeVisible()
  await expect(page.getByRole('link', { name: 'Red de impacto' })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => document.fullscreenElement?.classList.contains('novex-os')),
    )
    .toBe(true)

  await page
    .locator('.impact-status-island[data-coordination-id="coord-fabrica-contenidos"]')
    .click()
  await page.locator('.impact-executive-context__cta--map').click()
  await expect(
    page.locator('.organizational-scene[data-level="coordination"]'),
  ).toBeVisible()
  await expect(platform).toHaveAttribute('data-immersive', 'true')
  await expect(navigation).toBeVisible()

  if (process.env.NOVEX_CAPTURE === '1') {
    await page.screenshot({
      path: 'test-results/impact-network-fullscreen-coordination.png',
    })
  }

  await page
    .locator('.coordination-situation-node[data-priority="true"]')
    .click()
  await expect(
    page.locator('.organizational-scene[data-level="situation"]'),
  ).toBeVisible()
  await expect(page.locator('.island-focus-dossier')).toBeVisible()
  await expect(platform).toHaveAttribute('data-immersive', 'true')
  await expect(navigation).toBeVisible()

  if (process.env.NOVEX_CAPTURE === '1') {
    await page.screenshot({
      path: 'test-results/impact-network-fullscreen-flow.png',
    })
  }

  await page.evaluate(() => document.exitFullscreen())
  await expect(platform).not.toHaveAttribute('data-immersive', 'true')
})

test('el recorrido ejecutivo explica coordinación, contención, análisis y regreso', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const critical = page.locator(
    '.impact-status-island[data-coordination-id="coord-fabrica-contenidos"]',
  )
  await critical.click()
  await expect(page.locator('.impact-executive-context[data-status="critical"]')).toBeVisible()
  await expect(page.getByText('Qué está pasando', { exact: true })).toBeVisible()
  await expect(page.getByText('Principal situación', { exact: true })).toBeVisible()

  await page.locator('.impact-executive-context__cta--primary').click()
  await expect(
    page.locator('.organizational-scene[data-level="situation"]'),
  ).toBeVisible()
  const dossier = page.locator('.island-focus-dossier')
  await expect(dossier).toBeVisible({ timeout: 4_000 })
  await expect(dossier.getByText('¿Qué ocurrió?', { exact: true })).toBeVisible({
    timeout: 4_000,
  })
  await expect(dossier.getByRole('button', { name: /Descargar PDF/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entender la situación' })).toHaveCount(0)

  await dossier.locator('.island-focus-dossier__close').click()
  await expect(dossier).toHaveCount(0)
  await expect(
    page.locator('.organizational-scene[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.coordination-situation-node[data-priority="true"]'),
  ).toBeVisible()
})

test('una situación propagada muestra únicamente coordinaciones confirmadas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (/\/situations\/[^/]+\/impact-context$/.test(path)) {
      const situationId = path.split('/').at(-2) ?? ACTIVE_SITUATIONS[0].id
      await route.fulfill({
        json: {
          situationId,
          originCoordinationId: '',
          originCoordinationCode: 'coord-fabrica-contenidos',
          hasDeclaredRelated: true,
          canSimulate: false,
          simulationAvailable: false,
          declaredRelated: [
            {
              coordinationId: 'coord-homologaciones',
              coordinationCode: 'coord-homologaciones',
              coordinationName: 'Homologaciones',
              coordinationShortName: 'Homologaciones',
              impactLevel: 'HIGH',
              description: 'Dependencia confirmada',
              source: 'declared',
            },
            {
              coordinationId: 'coord-servicios',
              coordinationCode: 'coord-servicios',
              coordinationName: 'Servicios',
              coordinationShortName: 'Servicios',
              impactLevel: 'MEDIUM',
              description: 'Dependencia confirmada',
              source: 'declared',
            },
          ],
          message: 'Se muestran únicamente las coordinaciones confirmadas.',
        },
      })
      return
    }
    await route.fallback()
  })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  await page
    .locator('.impact-status-island[data-coordination-id="coord-fabrica-contenidos"]')
    .click()
  await page.getByRole('button', { name: 'Revisar situación' }).click()

  await expect(
    page.locator('.organizational-scene[data-impact-mode="propagated"]'),
  ).toBeVisible()
  const dossier = page.locator('.island-focus-dossier')
  await expect(dossier).toBeVisible({ timeout: 4_000 })
  await expect(dossier.getByText(/2 coordinaciones/i)).toBeVisible()
  await dossier.locator('.island-focus-dossier__close').click()
  await expect(dossier).toHaveCount(0)
  await expect(
    page.locator('.organizational-scene[data-level="coordination"]'),
  ).toBeVisible()
})

for (const viewportSize of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
] as const) {
  test(`la jerarquía ejecutiva aprovecha el viewport ${viewportSize.width}x${viewportSize.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewportSize)
    await installRole(page, 'DIRECTOR')
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('.impact-executive__status-board')).toBeVisible()
    await expect(page.locator('.impact-executive__rail')).toBeVisible()
    await expect
      .poll(() =>
        page.locator('.impact-status-coordination img').evaluateAll((icons) =>
          icons.every(
            (icon) =>
              icon instanceof HTMLImageElement &&
              icon.complete &&
              icon.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true)
    await page.locator('.impact-status-coordination img').evaluateAll(
      async (icons) => {
        await Promise.all(
          icons.map((icon) =>
            icon instanceof HTMLImageElement
              ? icon.decode().catch(() => undefined)
              : Promise.resolve(),
          ),
        )
      },
    )
    await expect(page.locator('.impact-executive__map-controls')).toBeInViewport()
    await expect(page.locator('.impact-executive__status-canvas')).toHaveCSS(
      'overflow',
      'hidden',
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true)

    if (process.env.NOVEX_CAPTURE === '1') {
      await page.waitForTimeout(1_000)
      await page.screenshot({
        path: `test-results/executive-hierarchy-${viewportSize.width}x${viewportSize.height}.png`,
        fullPage: true,
      })
    }
  })
}

test('DIRECTOR completa una revisión guiada y el tutorial se muestra una sola vez', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR', { impactTourSeen: false })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const tour = page.locator('.impact-network-tour')
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'welcome')
  await expect(
    tour.getByRole('button', { name: 'Omitir tutorial', exact: true }),
  ).toBeVisible()

  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute(
    'data-impact-tour-step',
    'coordination-map',
  )
  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute(
    'data-impact-tour-step',
    'coordination-summary',
  )
  await expect(tour).toHaveAttribute('data-impact-tour-ready', 'true')
  await expect(
    page.locator('[data-impact-tour="coordination-summary"]'),
  ).toBeVisible()

  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'situation-list')
  await expect(page.locator('[data-impact-tour="situation-list"]')).toBeVisible()

  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'impact-map')
  await expect(page.locator('[data-impact-tour="impact-map"]')).toBeVisible()
  await expect(tour.locator('.impact-network-tour__card')).toHaveCSS(
    'left',
    '16px',
  )

  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'situation-detail')
  await expect(tour).toHaveAttribute('data-impact-tour-ready', 'true')
  await expect(
    page.locator('[data-impact-tour="situation-dossier"]'),
  ).toBeVisible()
  await expect(page.locator('.impact-map-actions__back')).toHaveCount(0)
  await expect(
    page.locator('.island-focus-dossier__close--back'),
  ).toBeVisible()

  await tour.getByRole('button', { name: 'Siguiente' }).click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'complete')
  await tour.getByRole('button', { name: 'Finalizar' }).click()
  await expect(tour).toHaveCount(0)

  await expect(page.locator('.impact-network')).toHaveAttribute(
    'data-navigation-level',
    'situation',
  )
  await page.getByRole('button', { name: /Menú de usuario/ }).click()
  await page
    .getByRole('menuitem', { name: 'Volver a ver tutorial' })
    .click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'welcome')
  await expect(page.locator('.impact-network')).toHaveAttribute(
    'data-navigation-level',
    'institutional',
  )
  await expect(page).toHaveURL(/\/red-impacto$/)
  await tour
    .getByRole('button', { name: 'Omitir tutorial', exact: true })
    .click()

  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.impact-executive')).toBeVisible()
  await page.waitForTimeout(700)
  await expect(tour).toHaveCount(0)

  await page.getByRole('button', { name: 'Acerca de Red de impacto' }).click()
  await page.getByRole('button', { name: 'Ver tutorial guiado' }).click()
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'welcome')
  await tour
    .getByRole('button', { name: 'Omitir tutorial', exact: true })
    .click()
})

test('sin situaciones el tutorial usa un ejemplo didáctico sin alterar la red', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'ADMIN', {
    impactTourSeen: false,
    situations: [],
  })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const tour = page.locator('.impact-network-tour')
  await expect(tour).toHaveAttribute('data-impact-tour-step', 'welcome')
  for (const step of [
    'coordination-map',
    'coordination-summary',
    'situation-list',
    'example',
  ]) {
    await tour.getByRole('button', { name: 'Siguiente' }).click()
    await expect(tour).toHaveAttribute('data-impact-tour-step', step)
  }

  await expect(tour.getByText('Ejemplo de tutorial · No es un dato real')).toBeVisible()
  await expect(page.locator('.operational-context-panel__situation')).toHaveCount(0)
  await expect(page.locator('[data-impact-tour="empty-situations"]')).toBeVisible()

  await tour
    .getByRole('button', { name: 'Omitir tutorial', exact: true })
    .click()
  await expect(tour).toHaveCount(0)
})

test('COORDINADOR conserva la experiencia anterior', async ({ page }) => {
  await installRole(page, 'COORDINADOR')
  await page.goto('/red-impacto?coordination=coord-ingenierias', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.impact-executive')).toHaveCount(0)
  await expect(page.locator('.impact-network-tour')).toHaveCount(0)
  await expect(page.locator('.organizational-scene')).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.organizational-scene__island--selected'),
  ).toHaveAttribute('data-coordination-id', 'coord-ingenierias')

  await page.getByRole('button', { name: /Menú de usuario/ }).click()
  await expect(
    page.getByRole('menuitem', { name: 'Volver a ver tutorial' }),
  ).toHaveCount(0)
})
