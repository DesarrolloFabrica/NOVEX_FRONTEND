import { expect, test, type Page } from 'playwright/test'

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const SITUATION_A = '11111111-1111-4111-8111-111111111111'
const SITUATION_B = '22222222-2222-4222-8222-222222222222'

const situations = [
  {
    id: SITUATION_A,
    title: 'Interrupción parcial del portal B2B',
    description: 'Clientes corporativos no pueden completar pedidos desde el portal.',
    coordinationId: 'coord-b2b',
    coordinationCode: 'B2B',
    coordinationName: 'Canal B2B',
    createdByUserId: 'user-ana',
    createdByUserName: 'Ana Torres',
    assignedUserId: 'user-luis',
    assignedUserName: 'Luis Rojas',
    categoryId: 'category-service',
    categoryCode: 'SERVICE_INTERRUPTION',
    categoryName: 'Interrupción de servicio',
    severity: 'CRITICAL',
    status: 'IN_PROGRESS',
    lastStatusComment: 'Contingencia en validación.',
    resolvedAt: null,
    closedAt: null,
    occurredAt: '2026-08-10T10:15:00.000Z',
    createdAt: '2026-08-10T10:28:00.000Z',
    updatedAt: '2026-08-10T13:40:00.000Z',
  },
  {
    id: SITUATION_B,
    title: 'Retraso en despachos del hub norte',
    description: 'La salida de pedidos acumuló una demora de dos horas.',
    coordinationId: 'coord-log',
    coordinationCode: 'LOG',
    coordinationName: 'Logística',
    createdByUserId: 'user-carlos',
    createdByUserName: 'Carlos Méndez',
    assignedUserId: null,
    assignedUserName: null,
    categoryId: 'category-delay',
    categoryCode: 'OPERATIONAL_DELAY',
    categoryName: 'Retraso operativo',
    severity: 'HIGH',
    status: 'RESOLVED',
    lastStatusComment: 'Flujo normalizado.',
    resolvedAt: '2026-08-09T18:30:00.000Z',
    closedAt: null,
    occurredAt: '2026-08-09T14:00:00.000Z',
    createdAt: '2026-08-09T14:20:00.000Z',
    updatedAt: '2026-08-09T18:30:00.000Z',
  },
]

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: 'e2e-admin',
    email: 'admin@novex.test',
    roleId: 'role-admin',
    roleCode: 'ADMIN',
    coordinationId: null,
    permissions: ['SITUATIONS_VIEW', 'COORDINATIONS_VIEW', 'AI_VIEW_REPORTS', 'REPORTS_VIEW'],
    status: 'ACTIVE',
  })}.e2e`
}

async function installMocks(page: Page) {
  const session = {
    id: 'e2e-admin',
    name: 'Administrador E2E',
    role: 'supervisor',
    roleCode: 'ADMIN',
    roleName: 'Administrador',
    permissions: ['SITUATIONS_VIEW', 'COORDINATIONS_VIEW', 'AI_VIEW_REPORTS', 'REPORTS_VIEW'],
    onboardingStep: 100,
    onboardingCompleted: true,
  }
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

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name } } })
      return
    }
    if (path.endsWith('/situations') && request.method() === 'GET') {
      await route.fulfill({ json: { items: situations, total: situations.length, page: 1, limit: 100 } })
      return
    }
    if (path.endsWith('/coordinations')) {
      await route.fulfill({
        json: [
          { id: 'coord-b2b', code: 'B2B', name: 'Canal B2B', shortName: 'B2B', description: null, color: '#46d8ff', icon: '', imageAsset: '', displayOrder: 1, isActive: true },
          { id: 'coord-log', code: 'LOG', name: 'Logística', shortName: 'Logística', description: null, color: '#9e70ff', icon: '', imageAsset: '', displayOrder: 2, isActive: true },
          { id: 'coord-general', code: 'GEN', name: 'Coordinación General', shortName: 'General', description: null, color: '#86f56a', icon: '', imageAsset: '', displayOrder: 3, isActive: true },
          { id: 'coord-arts', code: 'ART', name: 'Bellas Artes', shortName: 'Artes', description: null, color: '#86f56a', icon: '', imageAsset: '', displayOrder: 4, isActive: true },
          { id: 'coord-dev', code: 'DEV', name: 'Desarrollo Profesional', shortName: 'Desarrollo', description: null, color: '#86f56a', icon: '', imageAsset: '', displayOrder: 5, isActive: true },
          { id: 'coord-business', code: 'EMP', name: 'Coordinación Empresarial', shortName: 'Empresarial', description: null, color: '#86f56a', icon: '', imageAsset: '', displayOrder: 6, isActive: true },
        ],
      })
      return
    }

    const situation = situations.find((item) => path.includes(item.id))
    if (!situation) {
      await route.fulfill({ status: 404, json: { message: 'E2E' } })
      return
    }
    if (path.endsWith('/analysis/history')) {
      const hasAnalysis = situation.id === SITUATION_A
      await route.fulfill({
        json: {
          situationId: situation.id,
          items: hasAnalysis
            ? [{ sessionId: 'session-1', situationId: situation.id, analysisVersion: 2, isLatest: true, provider: 'gemini', model: 'gemini-2.5-flash', promptVersion: 'v3', confidence: 0.87, executionTimeMs: 3200, tokenEstimate: 1200, createdAt: '2026-08-10T10:31:00.000Z' }]
            : [],
          total: hasAnalysis ? 2 : 0,
          latestVersion: hasAnalysis ? 2 : null,
        },
      })
      return
    }
    if (path.endsWith('/analysis')) {
      if (situation.id === SITUATION_B) {
        await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
        return
      }
      await route.fulfill({
        json: {
          situationId: situation.id,
          sessionId: 'session-1',
          analysisVersion: 2,
          isLatest: true,
          provider: 'gemini',
          createdAt: '2026-08-10T10:31:00.000Z',
          updatedAt: '2026-08-10T10:31:00.000Z',
          analysis: {
            analyzedAt: '2026-08-10T10:31:00.000Z',
            incidentClassification: { operationalSeverity: 'CRITICAL' },
            confidence: { overall: 0.87 },
            executiveSummary: { headline: 'Riesgo concentrado en el canal corporativo', summary: 'La indisponibilidad afecta la continuidad de pedidos B2B.' },
            executiveConclusion: { recommendedNextStep: 'Activar la contingencia del canal y validar recuperación.' },
            executiveDecision: { decision: 'Contener y escalar', urgencyLevel: 'CRITICAL' },
            impactAssessment: { estimatedDurationMinutes: 240 },
            riskBreakdown: { totalScore: 88 },
            missingInformation: [{ topic: 'Volumen', question: '¿Cuántos clientes?', priority: 'HIGH' }],
            immediateRisks: [{ title: 'SLA', description: 'Incumplimiento', severity: 'HIGH' }],
          },
        },
      })
      return
    }
    if (path.endsWith('/recommendations')) {
      await route.fulfill({
        json: {
          situationId: situation.id,
          items: situation.id === SITUATION_A ? [{ id: 'rec-1', status: 'PENDING' }, { id: 'rec-2', status: 'COMPLETED' }] : [],
          total: situation.id === SITUATION_A ? 2 : 0,
        },
      })
      return
    }
    if (path.endsWith('/timeline')) {
      const eventTypes =
        situation.id === SITUATION_A
          ? [
              ['STATUS_CHANGED', 'Estado actualizado'],
              ['EVIDENCE_ADDED', 'Evidencia agregada'],
              ['AI_ANALYSIS_VERSION_CREATED', 'Versión de análisis IA creada'],
              ['AI_ANALYSIS_COMPLETED', 'Análisis IA completado'],
            ]
          : [
              ['SITUATION_CREATED', 'Situación registrada'],
              ['EVIDENCE_ADDED', 'Evidencia agregada'],
              ['RECOMMENDATION_UPDATED', 'Recomendación actualizada'],
            ]
      await route.fulfill({
        json: {
          situationId: situation.id,
          items: eventTypes.map(([eventType, title], index) => ({
            id: `timeline-${situation.id}-${index}`,
            situationId: situation.id,
            userId: eventType.startsWith('AI_') ? null : situation.createdByUserId,
            userName: eventType.startsWith('AI_') ? null : situation.createdByUserName,
            eventType,
            title,
            description: situation.description,
            metadata: null,
            createdAt: new Date(new Date(situation.createdAt).getTime() + index * 60_000).toISOString(),
          })),
          total: eventTypes.length,
        },
      })
      return
    }
    if (path.endsWith('/affected-coordinations')) {
      await route.fulfill({ json: { situationId: situation.id, impactAssessmentId: null, items: situation.id === SITUATION_A ? [{ id: 'affected-1', coordinationId: 'coord-log', coordinationCode: 'LOG', coordinationName: 'Logística', impactLevel: 'HIGH', description: 'Pedidos dependientes' }] : [], total: situation.id === SITUATION_A ? 1 : 0 } })
      return
    }
    if (path.endsWith('/evidences')) {
      await route.fulfill({ json: { situationId: situation.id, items: situation.id === SITUATION_A ? [{ id: 'evidence-1' }] : [], total: situation.id === SITUATION_A ? 1 : 0 } })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

test('presenta el centro ejecutivo completo sin placeholders', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await installMocks(page)
  await page.goto('/centro-operacional')

  await expect(page.getByRole('heading', { name: 'Centro operacional' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '1 situación prioritaria requiere decisión' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '1 situación prioritaria requiere decisión' }),
  ).toBeInViewport()
  await expect(page.getByText('2 situaciones en su historial')).toBeVisible()
  await expect(page.getByText('Contenido en desarrollo')).toHaveCount(0)
  await expect(page.locator('.eoc-home-v4 .eoc-panel')).toHaveCount(0)
  expect(await page.locator('.eoc-home-priority-list > li').count()).toBeLessThanOrEqual(3)
  await expect(page.locator('.eoc-home-activity-list > li')).toHaveCount(5)
  expect(await page.locator('.eoc-home-coordination-list > div').count()).toBeLessThanOrEqual(5)
  await expect(page.getByText('2 movimientos adicionales en Auditoría.')).toBeVisible()
  await expect(page.locator('[data-tour="user-menu"]')).toBeVisible()

  await page.getByRole('link', { name: 'Panorama global', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Panorama global', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Panorama global', exact: true })).toBeInViewport()
  const panoramaFilters = page.getByRole('region', { name: 'Filtros del panorama' })
  await expect(panoramaFilters.getByText('Explorar la operación')).toBeVisible()
  await panoramaFilters.getByLabel('Estado').selectOption('OPEN')
  await expect(panoramaFilters.getByText('1 filtro activo')).toBeVisible()
  await expect(panoramaFilters.locator('label[data-active]')).toHaveCount(1)
  await panoramaFilters.getByRole('button', { name: 'Limpiar' }).click()
  await expect(panoramaFilters.locator('label[data-active]')).toHaveCount(0)
  await expect(panoramaFilters.getByLabel('Severidad')).toHaveCount(0)
  await expect(panoramaFilters.getByLabel('Análisis IA')).toHaveCount(0)
  await panoramaFilters.getByLabel('Coordinación').selectOption('coord-b2b')
  await expect(panoramaFilters.getByText('1 filtro activo')).toBeVisible()
  await expect(panoramaFilters.getByText(/Mostrando 1 de 2 situaciones/)).toBeVisible()
  await panoramaFilters.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page.getByRole('heading', { name: 'Estado de coordinaciones' })).toBeVisible()

  await page.getByRole('link', { name: 'Inteligencia IA', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Qué ha registrado la IA' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Qué ha registrado la IA' })).toBeInViewport()
  await expect(page.getByText('Riesgo concentrado en el canal corporativo')).toBeVisible()

  await page.getByRole('link', { name: 'Auditoría', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quién hizo qué, cuándo y sobre qué' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quién hizo qué, cuándo y sobre qué' })).toBeInViewport()
  await expect(page.getByText('Ana Torres').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Exportar 2 registros/ })).toBeVisible()

  await page.goto('/centro-operacional/inteligencia')
  await expect(page.getByRole('heading', { name: 'Qué ha registrado la IA' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Qué ha registrado la IA' })).toBeInViewport()
})
