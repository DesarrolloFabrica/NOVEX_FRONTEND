import { expect, test, type Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationalOverviewFixture } from './operational-overview.fixture'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'cta-history')
const CARD = '[data-testid="coordination-card"]'
const SABER = 'coord-saber-pro'
const B2B = 'coord-b2b'

const CREATE_PERMS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const VIEW_PERMS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const OVERVIEW = operationalOverviewFixture({ severe: true })
const SABER_ROW = OVERVIEW.coordinations.find((c) => c.code === SABER)!
const B2B_ROW = OVERVIEW.coordinations.find((c) => c.code === B2B)!

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function token(payload: Record<string, unknown>): string {
  return `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify(payload),
  )}.e2e`
}

async function settle(page: Page) {
  await page.waitForTimeout(700)
}

const CLOSED = {
  id: 'closed-1',
  title: 'Incidente ya resuelto',
  description: 'Desc',
  reportKind: 'INTERNAL',
  coordinationId: SABER_ROW.id,
  coordinationCode: SABER,
  coordinationName: 'Saber Pro',
  createdByUserId: 'e2e-analyst',
  createdByUserName: 'Analista E2E',
  categoryId: 'cat',
  categoryCode: 'TECH',
  categoryName: 'Técnica',
  severity: 'MEDIUM',
  status: 'CLOSED',
  closedAt: '2026-09-20T15:00:00.000Z',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-20T15:00:00.000Z',
  occurredAt: '2026-09-10T09:00:00.000Z',
  canResolve: false,
  resolution: {
    learning: 'Se estabilizó el servicio tras reinicio controlado.',
    resolvedByUserId: 'e2e-coord',
    resolvedByUserName: 'Coordinador Saber',
    resolvedAt: '2026-09-20T15:00:00.000Z',
    recordedAt: '2026-09-20T15:00:00.000Z',
  },
}

async function installAnalyst(page: Page) {
  const session = {
    id: 'e2e-analyst',
    name: 'Analista E2E',
    role: 'analista',
    roleCode: 'ANALISTA',
    roleName: 'Analista',
    permissions: CREATE_PERMS,
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((t) => {
    localStorage.setItem('novex.auth.accessToken.v1', t)
  }, token({
    sub: session.id,
    email: 'analista@novex.test',
    roleId: 'role-analyst',
    roleCode: 'ANALISTA',
    coordinationId: null,
    permissions: CREATE_PERMS,
    status: 'ACTIVE',
  }))

  let lastClosedQuery: URLSearchParams | null = null

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({
        json: [
          {
            id: 'cat',
            code: 'TECH',
            name: 'Técnica',
            description: null,
            isSelectable: true,
            icon: 'apps',
          },
        ],
      })
      return
    }
    if (url.pathname.endsWith('/analysis') || url.pathname.includes('/analysis')) {
      await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
      return
    }
    if (/\/situations\/[^/]+$/.test(url.pathname)) {
      await route.fulfill({ json: CLOSED })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      const status = url.searchParams.get('status')
      const mine = url.searchParams.get('mine') === 'true'
      if (status === 'CLOSED') {
        lastClosedQuery = url.searchParams
        expect(url.searchParams.get('closedFrom')).toBeTruthy()
        expect(url.searchParams.get('closedTo')).toBeTruthy()
        const empty =
          url.searchParams.get('closedFrom')?.startsWith('2025-') === true
        await route.fulfill({
          json: {
            items: empty ? [] : [CLOSED],
            total: empty ? 0 : 1,
            page: 1,
            limit: 20,
            scope: 'complete',
          },
        })
        return
      }
      await route.fulfill({
        json: {
          items: mine ? [] : [],
          total: 0,
          page: 1,
          limit: 100,
        },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return {
    getLastClosedQuery: () => lastClosedQuery,
  }
}

async function installAdmin(page: Page) {
  const session = {
    id: 'e2e-admin',
    name: 'Administrador E2E',
    role: 'supervisor',
    roleCode: 'ADMIN',
    roleName: 'Administrador',
    permissions: [...VIEW_PERMS, 'SITUATIONS_CREATE'],
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((t) => {
    localStorage.setItem('novex.auth.accessToken.v1', t)
  }, token({
    sub: session.id,
    email: 'admin@novex.test',
    roleId: 'role-admin',
    roleCode: 'ADMIN',
    coordinationId: null,
    permissions: session.permissions,
    status: 'ACTIVE',
  }))

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({ json: [] })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      if (url.searchParams.get('status') === 'CLOSED') {
        await route.fulfill({
          json: { items: [CLOSED], total: 1, page: 1, limit: 20 },
        })
        return
      }
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

async function installCoordinator(page: Page) {
  const session = {
    id: 'e2e-coord',
    name: 'Coordinador B2B E2E',
    role: 'ejecutor',
    roleCode: 'COORDINADOR',
    roleName: 'Coordinador',
    permissions: [...CREATE_PERMS, 'SITUATIONS_CLOSE'],
    coordinationId: B2B_ROW.id,
    selectedAreaId: B2B,
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((t) => {
    localStorage.setItem('novex.auth.accessToken.v1', t)
  }, token({
    sub: session.id,
    email: 'coord.b2b@novex.test',
    roleId: 'role-coord',
    roleCode: 'COORDINADOR',
    coordinationId: B2B_ROW.id,
    permissions: session.permissions,
    status: 'ACTIVE',
  }))

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({ json: [] })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      if (url.searchParams.get('status') === 'CLOSED') {
        await route.fulfill({
          json: { items: [], total: 0, page: 1, limit: 20 },
        })
        return
      }
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

test.describe('historial y CTAs compactos', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const viewport of [
    { width: 1440, height: 900, tag: '1440x900' },
    { width: 1920, height: 1080, tag: '1920x1080' },
  ]) {
    test(`ANALISTA idle → history → detail → history · ${viewport.tag}`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await page.setViewportSize(viewport)
      const api = await installAnalyst(page)
      await page.goto('/centro-operacional')
      await settle(page)

      await page.locator(`${CARD}[data-code="${SABER}"]`).click({ force: true })
      await settle(page)

      const panel = page.getByTestId('action-panel')
      await expect(panel).toHaveAttribute('data-mode', 'idle')
      await expect(page.getByTestId('history-open-button')).toBeVisible()

      const heading = await page.locator('.action-panel__idle-heading').boundingBox()
      const cta = await page.getByTestId('report-cta-group').boundingBox()
      const panelBox = await panel.boundingBox()
      expect(heading && cta && heading.y < cta.y).toBe(true)
      expect(cta && cta.width <= 210).toBe(true)
      if (cta && panelBox) {
        expect(cta.x + cta.width).toBeLessThan(panelBox.x + panelBox.width * 0.62)
      }

      await page.screenshot({
        path: path.join(OUT, `analyst-idle-${viewport.tag}.png`),
        fullPage: false,
      })

      await page.getByTestId('history-open-button').click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'history')
      await expect(page.getByTestId('history-period-picker')).toBeVisible()
      await expect(page.getByTestId('history-period-trigger')).toContainText(
        /de \d{4}/,
      )
      await expect(page.getByTestId('history-from')).toHaveCount(0)
      await expect(page.getByTestId('history-apply-period')).toHaveCount(0)
      await expect(page.getByTestId('history-summary')).toContainText(
        /problema[s]? cerrado/,
      )
      await expect(page.getByTestId('history-list')).toBeVisible()
      await expect(panel.getByTestId('report-internal-button')).toHaveCount(0)

      const closedQuery = api.getLastClosedQuery()
      expect(closedQuery?.get('status')).toBe('CLOSED')
      // Mes calendario: inicio inclusivo 00:00 Colombia → 05:00Z.
      expect(closedQuery?.get('closedFrom')).toMatch(/T05:00:00.000Z$/)
      expect(closedQuery?.get('closedTo')).toMatch(/T04:59:59.999Z$/)

      await page.screenshot({
        path: path.join(OUT, `analyst-history-${viewport.tag}.png`),
        fullPage: false,
      })

      // Cambiar a un ciclo de otro año reinicia y puede quedar vacío.
      await page.getByTestId('history-period-trigger').click()
      await expect(page.getByTestId('history-period-panel')).toBeVisible()
      await page.getByTestId('history-period-tab-cycle').click()
      await page.getByTestId('history-period-year-prev').click()
      await page
        .locator('[data-testid="history-period-option"][data-period-key$="-H1"]')
        .first()
        .click()
      await settle(page)
      await expect(page.getByTestId('history-empty')).toBeVisible()
      await expect(page.getByTestId('history-empty')).toContainText(
        'No hay problemas cerrados en este período',
      )

      await page.screenshot({
        path: path.join(OUT, `analyst-history-empty-${viewport.tag}.png`),
        fullPage: false,
      })

      // Volver al mes actual con resultados.
      await page.getByTestId('history-period-trigger').click()
      await page.getByTestId('history-period-tab-month').click()
      await page.getByTestId('history-period-year-next').click()
      await page
        .locator('[data-testid="history-period-option"][data-period-key="2026-09"]')
        .click()
      await settle(page)
      await expect(page.getByTestId('history-list')).toBeVisible()

      await page.getByTestId('history-row').first().click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'detail')
      await expect(page.getByTestId('history-open-button')).toHaveCount(0)

      await page.screenshot({
        path: path.join(OUT, `analyst-detail-from-history-${viewport.tag}.png`),
        fullPage: false,
      })

      await page.getByTestId('detail-back').click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'history')
      await expect(page.getByTestId('history-period-trigger')).toContainText(
        'Septiembre de 2026',
      )
      await expect(page.getByTestId('history-list')).toBeVisible()

      await page.getByTestId('history-back').click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'idle')
      await expect(page.getByTestId('history-open-button')).toBeVisible()
    })
  }

  test('ADMIN solo lectura: consulta deliberada e historial · 1440x900', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installAdmin(page)
    await page.goto('/centro-operacional')
    await settle(page)

    const panel = page.getByTestId('action-panel')
    await expect(panel).toHaveAttribute('data-can-create', 'false')
    await expect(panel).toHaveAttribute('data-consult-only', 'true')
    await expect(page.getByTestId('report-internal-button')).toHaveCount(0)
    await expect(page.getByTestId('consult-idle-copy')).toBeVisible()
    await expect(page.getByTestId('history-open-button')).toBeVisible()

    await page.screenshot({
      path: path.join(OUT, 'admin-idle-1440x900.png'),
      fullPage: false,
    })

    await page.getByTestId('history-open-button').click()
    await settle(page)
    await expect(panel).toHaveAttribute('data-mode', 'history')
    await expect(page.getByTestId('history-period-picker')).toBeVisible()
    await expect(page.getByTestId('history-summary')).toBeVisible()

    await page.screenshot({
      path: path.join(OUT, 'admin-history-1440x900.png'),
      fullPage: false,
    })
  })

  test('ADMIN historial 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await installAdmin(page)
    await page.goto('/centro-operacional')
    await settle(page)
    await page.getByTestId('history-open-button').click()
    await settle(page)
    await expect(page.getByTestId('history-period-picker')).toBeVisible()
    await page.screenshot({
      path: path.join(OUT, 'admin-history-1920x1080.png'),
      fullPage: false,
    })
  })

  test('COORDINADOR idle con tres accesos · 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installCoordinator(page)
    await page.goto('/centro-operacional')
    await settle(page)

    await expect(page.getByTestId('report-internal-button')).toBeVisible()
    await expect(page.getByTestId('report-dependency-button')).toBeVisible()
    await expect(page.getByTestId('history-open-button')).toBeVisible()
    await expect(
      page.getByTestId('my-reports').getByTestId('history-open-button'),
    ).toHaveCount(0)

    await page.screenshot({
      path: path.join(OUT, 'coordinator-idle-1440x900.png'),
      fullPage: false,
    })
  })
})
