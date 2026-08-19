import { expect, test } from 'playwright/test'

const situationId = '6ce4e56e-7777-4777-8777-777777777777'
const coordinationId = '5ce4e56e-7777-4777-8777-777777777777'
const categoryId = '4ce4e56e-7777-4777-8777-777777777777'

const permissions = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'SITUATIONS_CREATE',
  'SITUATIONS_UPDATE',
  'AI_ANALYZE',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const session = {
  id: 'e2e-onboarding',
  name: 'Analista Primera Vez',
  role: 'supervisor',
  roleCode: 'ANALISTA',
  roleName: 'Analista',
  permissions,
  onboardingStep: 0,
  onboardingCompleted: false,
  onboardingSeenAt: null,
}

const coordination = {
  id: coordinationId,
  code: 'coord-general',
  name: 'Coordinación General',
  shortName: 'General',
  description: null,
  color: '#a3ff5c',
  icon: 'grid',
  imageAsset: 'CoordGeneral.png',
  displayOrder: 1,
  isActive: true,
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
}

const category = {
  id: categoryId,
  code: 'TECH_DEGRADATION',
  name: 'Degradación tecnológica',
  description: null,
  displayOrder: 1,
  isActive: true,
}

const draft = {
  title: 'Interrupción guiada de matrículas',
  description:
    'Durante la jornada se detectó una degradación sostenida que impide completar matrículas y requiere seguimiento operacional.',
  coordinationId,
  reportedAt: '2026-08-04T08:00',
  detectionMethod: 'SISTEMA',
  detectionMethodOther: '',
  affectedParties: ['ESTUDIANTES', 'SISTEMAS'],
  affectedPartyOther: '',
  relatedCoordinationIds: [],
  additionalNotes: '',
}

const situation = {
  id: situationId,
  title: draft.title,
  description: draft.description,
  coordinationId: null,
  coordinationCode: null,
  coordinationName: null,
  createdByUserId: session.id,
  createdByUserName: session.name,
  assignedUserId: null,
  assignedUserName: null,
  categoryId,
  categoryCode: category.code,
  categoryName: category.name,
  severity: 'MEDIUM',
  status: 'OPEN',
  lastStatusComment: null,
  resolvedAt: null,
  closedAt: null,
  occurredAt: '2026-08-04T13:00:00.000Z',
  createdAt: '2026-08-04T13:05:00.000Z',
  updatedAt: '2026-08-04T13:05:00.000Z',
}

const analysis = {
  schemaVersion: '1',
  analyzedAt: '2026-08-04T13:06:00.000Z',
  provider: 'gemini',
  executiveSummary: {
    headline: 'Interrupción de matrículas',
    summary: 'La degradación requiere atención operacional coordinada.',
    keyPoints: ['Afectación a estudiantes'],
  },
  incidentClassification: {
    categoryCode: category.code,
    categoryName: category.name,
    operationalSeverity: 'MEDIUM',
    tags: ['matrículas'],
  },
  rootCause: { summary: 'Capacidad insuficiente', hypotheses: [] },
  impactAssessment: {
    operationalSeverity: 'MEDIUM',
    confidence: 0.91,
    estimatedDurationMinutes: 60,
    summary: 'Impacto operativo moderado.',
    reasoning: 'La indisponibilidad afecta el flujo de matrícula.',
    affectedCoordinations: [],
    propagation: [],
  },
  recommendations: [],
  immediateRisks: [],
  futureRisks: [],
  missingInformation: [],
  executiveConclusion: {
    conclusion: 'Priorizar estabilización y monitoreo.',
    recommendedNextStep: 'Escalar a tecnología.',
  },
  confidence: { overall: 0.91, factors: [] },
}

const analysisResponse = {
  situationId,
  sessionId: 'analysis-onboarding',
  analysisVersion: 1,
  isLatest: true,
  provider: 'gemini',
  confidence: 0.91,
  analysis,
  createdAt: '2026-08-04T13:06:00.000Z',
  updatedAt: '2026-08-04T13:06:00.000Z',
}

test('auto-inicia el recorrido después de completar el splash de login', async ({
  page,
}) => {
  const coordinatorSession = {
    id: 'e2e-coordinator-onboarding',
    email: 'coordinator.onboarding@novex.test',
    fullName: 'Coordinador Primera Vez',
    roleCode: 'COORDINADOR',
    roleName: 'Coordinador',
    coordinationId,
    coordinationCode: coordination.code,
    onboardingStep: 0,
    onboardingCompleted: false,
    onboardingSeenAt: null,
  }
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: coordinatorSession.id,
    email: coordinatorSession.email,
    roleId: 'role-coordinator',
    roleCode: coordinatorSession.roleCode,
    coordinationId,
    permissions,
    status: 'ACTIVE',
  })}.e2e`

  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/email') && request.method() === 'POST') {
      await route.fulfill({
        json: {
          accessToken,
          expiresIn: '1h',
          user: coordinatorSession,
        },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  await page.goto('/login')
  await page.locator('#login-email').fill(coordinatorSession.email)
  await page.getByRole('button', { name: 'Continuar con correo' }).click()

  await expect(page).toHaveURL(/\/red-impacto\?coordination=coord-general/)
  await expect(
    page.getByRole('heading', { name: 'Su espacio de trabajo está listo' }),
  ).toBeVisible()
  await expect(page.locator('.novex-tour')).toHaveCount(1)
  await expect
    .poll(() =>
      page.evaluate((userId) => {
        return localStorage.getItem(`novex.onboarding.v2.${userId}`)
      }, coordinatorSession.id),
    )
    .toBeNull()

  for (const expectedTitle of [
    'Entienda el alcance antes de actuar',
    'Registre una situación desde cualquier vista',
    'Registre ahora su primera situación',
  ]) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: expectedTitle }),
    ).toBeVisible()
  }
  await expect(page).toHaveURL(/\/situaciones\/nueva$/)
  await expect(page.locator('[data-tour="capture-form"]')).toBeVisible()
  await page.getByRole('button', { name: 'Pausar tutorial' }).click()
})

test('acompaña una primera situación real hasta informe, historial y estado', async ({
  page,
}) => {
  let registered = false
  let analysisReady = false
  let registrationAttempts = 0

  await page.setViewportSize({ width: 1536, height: 864 })

  await page.addInitScript(
    ({ currentSession, captureDraft }) => {
      localStorage.setItem(
        'novex.auth.accessToken.v1',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtb25ib2FyZGluZyIsImVtYWlsIjoib25ib2FyZGluZ0Bub3ZleC50ZXN0Iiwicm9sZUlkIjoicm9sZS1hbmFsaXN0YSIsInJvbGVDb2RlIjoiQU5BTElTVEEiLCJjb29yZGluYXRpb25JZCI6bnVsbCwicGVybWlzc2lvbnMiOlsiQVVUSF9WSUVXX1BST0ZJTEUiLCJDT09SRElOQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX0NSRUFURSIsIlNJVFVBVElPTlNfVVBEQVRFIiwiQUlfQU5BTFlaRSIsIkFJX1ZJRVdfUkVQT1JUUyIsIlJFUE9SVFNfVklFVyJdLCJzdGF0dXMiOiJBQ1RJVkUifQ.e2e',
      )
      localStorage.setItem(
        'novex.auth.session.v1',
        JSON.stringify(currentSession),
      )
      localStorage.setItem(
        'novex.situationCapture.draft.v1',
        JSON.stringify(captureDraft),
      )
      localStorage.setItem('novex.situationCapture.step.v1', '1')
    },
    { currentSession: session, captureDraft: draft },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode: session.roleCode,
            roleName: session.roleName,
            coordinationId: null,
            coordinationCode: null,
            onboardingStep: 0,
            onboardingCompleted: false,
            onboardingSeenAt: null,
          },
        },
      })
      return
    }

    if (path.endsWith('/users/me/onboarding') && method === 'PATCH') {
      const body = request.postDataJSON() as {
        step: number
        completed?: boolean
      }
      await route.fulfill({
        json: {
          id: session.id,
          fullName: session.name,
          roleCode: session.roleCode,
          roleName: session.roleName,
          coordinationId: null,
          coordinationCode: null,
          onboardingStep: body.step,
          onboardingCompleted: body.completed ?? false,
          onboardingSeenAt: body.completed ? '2026-08-04T13:10:00.000Z' : null,
        },
      })
      return
    }

    if (path.endsWith('/coordinations/graph')) {
      await route.fulfill({
        json: { coordinations: [coordination], dependencies: [] },
      })
      return
    }

    if (path.endsWith('/coordinations/network-status')) {
      await route.fulfill({
        json: {
          networkStatus: 'stable',
          globalRiskScore: 0,
          activeIncidentsCount: registered ? 1 : 0,
          coordinationsCount: 1,
          synchronizedCoordinationsCount: 1,
          lastSynchronizedAt: '2026-08-04T13:00:00.000Z',
        },
      })
      return
    }

    if (path.endsWith('/coordinations')) {
      await route.fulfill({ json: [coordination] })
      return
    }

    if (path.endsWith('/situations/categories')) {
      await route.fulfill({ json: [category] })
      return
    }

    if (path.endsWith('/situations') && method === 'GET') {
      await route.fulfill({
        json: {
          items: registered ? [situation] : [],
          total: registered ? 1 : 0,
          page: 1,
          limit: 100,
        },
      })
      return
    }

    if (
      path.endsWith('/situations/register-with-analysis') &&
      method === 'POST'
    ) {
      const payload = request.postDataJSON() as Record<string, unknown>
      expect(payload).not.toHaveProperty('coordinationId')
      registrationAttempts += 1
      if (registrationAttempts === 1) {
        await new Promise((resolve) => setTimeout(resolve, 450))
        await route.fulfill({
          status: 503,
          json: { message: 'No fue posible registrar temporalmente.' },
        })
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1_200))
      registered = true
      analysisReady = true
      await route.fulfill({
        json: { situation, analysis: analysisResponse },
      })
      return
    }

    if (path.endsWith(`/situations/${situationId}/analysis`)) {
      await route.fulfill(
        analysisReady
          ? { json: analysisResponse }
          : { status: 404, json: { message: 'Análisis pendiente' } },
      )
      return
    }

    if (path.endsWith(`/situations/${situationId}`)) {
      await route.fulfill({ json: situation })
      return
    }

    if (path.endsWith(`/situations/${situationId}/recommendations`)) {
      await route.fulfill({ json: { situationId, items: [], total: 0 } })
      return
    }

    if (path.endsWith(`/situations/${situationId}/timeline`)) {
      await route.fulfill({ json: { situationId, items: [], total: 0 } })
      return
    }

    if (path.endsWith(`/situations/${situationId}/analysis/history`)) {
      await route.fulfill({
        json: {
          situationId,
          items: [],
          total: 0,
          latestVersion: 1,
        },
      })
      return
    }

    if (path.endsWith(`/situations/${situationId}/affected-coordinations`)) {
      await route.fulfill({
        json: { situationId, impactAssessmentId: null, items: [], total: 0 },
      })
      return
    }

    if (path.endsWith(`/situations/${situationId}/evidences`)) {
      await route.fulfill({ json: { situationId, items: [], total: 0 } })
      return
    }

    if (
      path.endsWith(`/situations/${situationId}/impact`) ||
      path.includes(`/situations/${situationId}/`)
    ) {
      await route.fulfill({ status: 404, json: { message: 'Sin datos' } })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Su espacio de trabajo está listo' }),
  ).toBeVisible()

  for (const expectedTitle of [
    'Una lectura ejecutiva, sin ruido de captura',
    'La operación resumida en señales',
    'Entienda el alcance antes de actuar',
    'Registre una situación desde cualquier vista',
    'Registre ahora su primera situación',
  ]) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: expectedTitle }),
    ).toBeVisible()
  }

  await expect
    .poll(async () => {
      const [card, form] = await Promise.all([
        page.locator('.novex-tour__card').boundingBox(),
        page.locator('[data-tour="capture-form"]').boundingBox(),
      ])
      return Boolean(
        card && form && card.x + card.width <= form.x - 12,
      )
    })
    .toBe(true)

  const firstRailLink = page.locator('.novex-os-rail__link').first()
  await expect(firstRailLink).toBeVisible()
  expect(
    await firstRailLink.evaluate((link) => {
      const box = link.getBoundingClientRect()
      const topElement = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      )
      return !topElement || !link.contains(topElement)
    }),
  ).toBe(true)

  await expect(
    page.getByRole('button', { name: 'Siguiente', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Revise el expediente antes de enviarlo',
    }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Crear expediente e iniciar análisis IA' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Revise el expediente antes de enviarlo',
    }),
  ).toBeVisible()
  await expect(
    page.getByText('No fue posible registrar temporalmente.'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Crear expediente e iniciar análisis IA' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'NOVEX está preparando el informe' }),
  ).toBeVisible()
  await expect(page.getByText('Esperando el análisis IA…')).toBeVisible()
  const analysisTourCard = page.locator('.novex-tour__card')
  await expect(
    analysisTourCard.getByRole('button', { name: 'Anterior' }),
  ).toHaveCount(0)
  await expect(
    analysisTourCard.getByRole('button', { name: 'Omitir recorrido' }),
  ).toHaveCount(0)
  await expect(
    analysisTourCard.getByRole('button', { name: 'Pausar tutorial' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Registrar otra situación' }),
  ).toHaveCount(0)

  await expect(
    page.getByRole('heading', { name: 'Revise la lectura ejecutiva de la IA' }),
  ).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Ver análisis ejecutivo IA' }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Revise el informe completo antes de exportarlo',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Descargue el PDF cuando necesite compartirlo',
    }),
  ).toHaveCount(0)

  const reportScroll = page.locator('[data-tour="report-scroll"]')
  await expect(reportScroll).toBeVisible()
  await reportScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })

  await expect(
    page.getByRole('heading', {
      name: 'Descargue el PDF cuando necesite compartirlo',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Exportar reporte PDF' }),
  ).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar reporte PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  expect(registrationAttempts).toBe(2)

  await analysisTourCard
    .getByRole('button', { name: 'Siguiente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Todo queda disponible para consulta' }),
  ).toBeVisible()
  await analysisTourCard
    .getByRole('button', { name: 'Siguiente', exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/gestion\\?situation=${situationId}`),
  )
  await expect(
    page.getByRole('heading', {
      name: 'Acompañe la situación hasta resolverla',
    }),
  ).toBeVisible()
  await expect(page.locator('[data-tour="management-dossier"]')).toBeVisible()
  await expect
    .poll(async () => {
      const [card, dossier] = await Promise.all([
        page.locator('.novex-tour__card').boundingBox(),
        page.locator('[data-tour="management-dossier"]').boundingBox(),
      ])
      if (!card || !dossier) return false
      const overlaps =
        card.x < dossier.x + dossier.width &&
        card.x + card.width > dossier.x &&
        card.y < dossier.y + dossier.height &&
        card.y + card.height > dossier.y
      return !overlaps
    })
    .toBe(true)
  await analysisTourCard
    .getByRole('button', { name: 'Siguiente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Actualice el estado con una razón verificable',
    }),
  ).toBeVisible()
  const statusTrigger = page.locator('[data-tour="status-update-trigger"]')
  await expect(statusTrigger).toBeVisible()
  await expect
    .poll(async () => {
      const [spotlight, trigger] = await Promise.all([
        page.locator('.novex-tour__spotlight').boundingBox(),
        statusTrigger.boundingBox(),
      ])
      return Boolean(
        spotlight &&
          trigger &&
          spotlight.x <= trigger.x &&
          spotlight.y <= trigger.y &&
          spotlight.x + spotlight.width >= trigger.x + trigger.width &&
          spotlight.y + spotlight.height >= trigger.y + trigger.height,
      )
    })
    .toBe(true)
  await analysisTourCard
    .getByRole('button', { name: 'Siguiente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Ya puede operar NOVEX de principio a fin',
    }),
  ).toBeVisible()
  await expect
    .poll(async () => {
      const card = await page.locator('.novex-tour__card').boundingBox()
      const viewport = page.viewportSize()
      return Boolean(
        card &&
          viewport &&
          Math.abs(card.x + card.width / 2 - viewport.width / 2) <= 2 &&
          Math.abs(card.y + card.height / 2 - viewport.height / 2) <= 2,
      )
    })
    .toBe(true)
  await page.getByRole('button', { name: 'Finalizar' }).click()
  await expect(page.locator('.novex-tour')).toHaveCount(0)
})
