import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * INTERNAL VIVO · afectaciones en el Centro Operacional (COORDINADOR).
 *
 *   1. Crear un INTERNAL con afectación inicial → el detalle abre con ella →
 *      agregar otra afectación → aparece inmediatamente, en orden.
 *   2. Un problema CERRADO muestra sus afectaciones congeladas y NO ofrece
 *      agregar más.
 *
 * API simulada con `page.route` (sin backend ni base de datos). El mock
 * reproduce el contrato: `canAddConsequence` lo decide el «servidor» y la
 * afectación agregada vuelve con la severidad vigente al ocurrir.
 */

const B2B = 'coord-b2b'
const OVERVIEW = operationalOverviewFixture({ severe: true })
const B2B_ROW = OVERVIEW.coordinations.find((c) => c.code === B2B)!

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
  'SITUATIONS_UPDATE',
  'SITUATIONS_CLOSE',
  'REPORTS_VIEW',
]

const session = {
  id: 'e2e-coord',
  name: 'Coordinador B2B E2E',
  role: 'ejecutor',
  roleCode: 'COORDINADOR',
  roleName: 'Coordinador',
  permissions: PERMISSIONS,
  coordinationId: B2B_ROW.id,
  selectedAreaId: B2B,
  onboardingStep: 100,
  onboardingCompleted: true,
}

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
      sub: session.id,
      email: 'coord.b2b@novex.test',
      roleId: 'role-coord',
      roleCode: 'COORDINADOR',
      coordinationId: B2B_ROW.id,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

type Situation = Record<string, unknown> & {
  id: string
  status: string
  consequences: Array<Record<string, unknown>>
}

function baseSituation(over: Partial<Situation>): Situation {
  return {
    id: 'sit',
    title: 'Problema',
    description: 'Qué está fallando.',
    reportKind: 'INTERNAL',
    coordinationId: B2B_ROW.id,
    coordinationCode: B2B,
    coordinationName: B2B_ROW.name,
    affectedCoordinationId: B2B_ROW.id,
    affectedCoordinationCode: B2B,
    affectedCoordinationName: B2B_ROW.name,
    affectedProcess: null,
    pendingDelivery: null,
    createdByUserId: session.id,
    createdByUserName: session.name,
    categoryId: 'cat-internet',
    categoryCode: 'INTERNET',
    categoryName: 'Internet',
    severity: 'MEDIUM',
    reportedSeverity: 'MEDIUM',
    status: 'OPEN',
    occurredAt: '2026-10-07T13:00:00.000Z',
    createdAt: '2026-10-07T13:30:00.000Z',
    updatedAt: '2026-10-07T13:30:00.000Z',
    relatedCoordinations: [],
    resolution: null,
    canResolve: true,
    canAdvanceToInProgress: true,
    canUpdate: true,
    canAddConsequence: true,
    slaHealth: 'on_track',
    dueAt: null,
    severityHistory: [
      {
        id: 'h-rep',
        from: null,
        to: 'MEDIUM',
        source: 'REPORTED',
        effectiveAt: '2026-10-07T13:30:00.000Z',
        recordedAt: '2026-10-07T13:30:00.000Z',
        policyCode: null,
        ruleKey: null,
      },
    ],
    consequences: [],
    consequenceCount: 0,
    ...over,
  }
}

const CLOSED = baseSituation({
  id: 'sit-closed',
  title: 'Equipo de edición fuera de servicio',
  status: 'CLOSED',
  closedAt: '2026-10-05T15:00:00.000Z',
  canResolve: false,
  canAdvanceToInProgress: false,
  canAddConsequence: false,
  slaHealth: 'closed',
  resolution: {
    learning: 'Se dejó un equipo de respaldo configurado.',
    resolvedByUserId: session.id,
    resolvedByUserName: session.name,
    resolvedAt: '2026-10-05T15:00:00.000Z',
    recordedAt: '2026-10-05T15:00:00.000Z',
  },
  consequences: [
    {
      id: 'c-closed',
      situationId: 'sit-closed',
      description: 'Se reasignó la edición de un video.',
      occurredAt: '2026-10-04T14:00:00.000Z',
      createdAt: '2026-10-04T14:20:00.000Z',
      createdByUserId: session.id,
      createdByUserName: session.name,
      createdByRoleName: 'Coordinador',
      severityAtOccurrence: 'MEDIUM',
    },
  ],
  consequenceCount: 1,
})

async function install(page: Page) {
  const store = new Map<string, Situation>([[CLOSED.id, CLOSED]])
  const consequencePosts: Array<Record<string, unknown>> = []

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ token, sessionPayload }) => {
      localStorage.setItem('novex.auth.accessToken.v1', token)
      localStorage.setItem('novex.auth.session.v1', JSON.stringify(sessionPayload))
    },
    { token: accessToken(), sessionPayload: session },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const path = url.pathname

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name } } })
      return
    }
    if (path.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (path.endsWith('/situations/categories')) {
      await route.fulfill({
        json: [
          {
            id: 'cat-internet',
            code: 'INTERNET',
            name: 'Internet',
            description: null,
            isSelectable: true,
            icon: 'internet',
          },
        ],
      })
      return
    }
    if (method === 'POST' && path.endsWith('/situations/register-with-analysis')) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const id = `sit-new-${store.size}`
      const initial = body.initialConsequence as { description: string } | undefined
      const created = baseSituation({
        id,
        title: String(body.title),
        description: String(body.description),
        severity: body.severity,
        reportedSeverity: body.severity,
        occurredAt: String(body.occurredAt),
        consequences: initial
          ? [
              {
                id: `${id}-c1`,
                situationId: id,
                description: initial.description,
                occurredAt: String(body.occurredAt),
                createdAt: new Date().toISOString(),
                createdByUserId: session.id,
                createdByUserName: session.name,
                createdByRoleName: 'Coordinador',
                severityAtOccurrence: body.severity,
              },
            ]
          : [],
      })
      created.consequenceCount = created.consequences.length
      store.set(id, created)
      await route.fulfill({ status: 201, json: { situation: created, analysis: null } })
      return
    }
    const consequenceMatch = path.match(/\/situations\/([^/]+)\/consequences$/)
    if (method === 'POST' && consequenceMatch) {
      const situation = store.get(consequenceMatch[1])!
      const body = route.request().postDataJSON() as Record<string, unknown>
      consequencePosts.push(body)
      if (situation.status === 'CLOSED') {
        await route.fulfill({ status: 409, json: { message: 'Cerrado' } })
        return
      }
      const consequence = {
        id: `${situation.id}-c${situation.consequences.length + 1}`,
        situationId: situation.id,
        description: body.description,
        occurredAt: body.occurredAt ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdByUserId: session.id,
        createdByUserName: session.name,
        createdByRoleName: 'Coordinador',
        severityAtOccurrence: situation.severity,
      }
      situation.consequences = [...situation.consequences, consequence]
      situation.consequenceCount = situation.consequences.length
      await route.fulfill({ status: 201, json: consequence })
      return
    }
    const detailMatch = path.match(/\/situations\/([^/]+)$/)
    if (method === 'GET' && detailMatch && store.has(detailMatch[1])) {
      await route.fulfill({ json: store.get(detailMatch[1]) })
      return
    }
    if (path.endsWith('/situations')) {
      const status = url.searchParams.get('status')
      const items = [...store.values()].filter((s) => !status || s.status === status)
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100, scope: 'complete' },
      })
      return
    }
    if (path.includes('/evidences') || path.includes('/timeline')) {
      await route.fulfill({ json: { items: [] } })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'not mocked' } })
  })

  return { consequencePosts }
}

async function settle(page: Page) {
  await page.waitForTimeout(500)
}

test.describe('INTERNAL vivo · afectaciones', () => {
  test.beforeEach(async ({ page }) => {
    // El primer render del Centro Operacional en dev (Vite) puede tardar.
    test.slow()
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('crear INTERNAL → detalle → agregar afectación → aparece inmediatamente', async ({
    page,
  }) => {
    const { consequencePosts } = await install(page)
    await page.goto('/centro-operacional')
    await settle(page)

    await page.getByTestId('report-internal-button').first().click()
    await expect(page.getByTestId('report-internal-destination')).toHaveCount(0)
    await page.getByTestId('report-title').fill('Internet intermitente en el estudio')
    await page.getByTestId('report-description').fill('Hay conexión pero se corta.')
    await page.getByTestId('report-category').selectOption('cat-internet')
    await page
      .getByTestId('report-initial-consequence')
      .fill('Se retrasó la entrega de dos contenidos.')
    await page.getByTestId('report-submit').click()
    await settle(page)

    const consequences = page.getByTestId('detail-consequences')
    await expect(consequences).toBeVisible()
    await expect(page.getByTestId('detail-consequences-count')).toHaveText('1 afectación')
    await expect(consequences).toContainText('Se retrasó la entrega de dos contenidos.')
    // Nació con la severidad reportada: no hay rastro de cambio.
    await expect(page.getByTestId('severity-trail')).toHaveCount(0)

    await expect(page.getByTestId('consequence-composer')).toBeVisible()
    await page
      .getByTestId('consequence-description')
      .fill('No fue posible cargar archivos pesados.')
    await page.getByTestId('consequence-submit').click()

    await expect(page.getByTestId('detail-consequences-count')).toHaveText('2 afectaciones')
    const items = page.getByTestId('detail-consequence')
    await expect(items).toHaveCount(2)
    await expect(items.last()).toContainText('No fue posible cargar archivos pesados.')
    await expect(items.last()).toContainText('Coordinador B2B E2E / Coordinador')
    // El subbloque sigue disponible y vacío para la siguiente afectación.
    await expect(page.getByTestId('consequence-description')).toHaveValue('')
    expect(consequencePosts).toHaveLength(1)
    expect(consequencePosts[0].description).toBe('No fue posible cargar archivos pesados.')
  })

  test('CLOSED: historia visible y congelada, sin agregar afectación', async ({ page }) => {
    const { consequencePosts } = await install(page)
    await page.goto('/centro-operacional')
    await settle(page)

    await page.getByText('Equipo de edición fuera de servicio').first().click()
    await expect(page.getByTestId('problem-detail')).toBeVisible()
    await expect(page.getByTestId('detail-consequences')).toContainText(
      'Se reasignó la edición de un video.',
    )
    await expect(page.getByTestId('detail-consequences-frozen')).toHaveText(
      'Historia congelada al cierre',
    )
    await expect(page.getByTestId('consequence-composer')).toHaveCount(0)
    await expect(page.getByTestId('problem-resolved')).toContainText(
      'Se dejó un equipo de respaldo configurado.',
    )
    expect(consequencePosts).toHaveLength(0)
  })
})
