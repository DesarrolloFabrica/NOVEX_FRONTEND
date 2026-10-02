import { expect, test, type Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Capturas de composición tras mover los CTAs a «Reportar o consultar».
 * Salida: e2e/artifacts/cta-relocation/
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'cta-relocation')
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

const OVERVIEW = operationalOverviewFixture({ severe: true })
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

  const openProblem = {
    id: 'ing-1',
    title: 'Aulas sin conectividad',
    description: 'Desc',
    reportKind: 'INTERNAL',
    coordinationId: OVERVIEW.coordinations.find((c) => c.code === SABER)!.id,
    coordinationCode: SABER,
    coordinationName: 'Saber Pro',
    createdByUserId: session.id,
    createdByUserName: session.name,
    categoryId: 'cat',
    categoryCode: 'TECH',
    categoryName: 'Técnica',
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    occurredAt: '2026-09-01T09:00:00.000Z',
    canResolve: true,
    canAdvanceToInProgress: true,
    canUpdate: true,
  }

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
    if (url.pathname.includes('/situations/') && url.pathname.endsWith('/ing-1')) {
      await route.fulfill({ json: openProblem })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      const mine = url.searchParams.get('mine') === 'true'
      const items = mine ? [openProblem] : []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100 },
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
      await route.fulfill({
        json: [
          {
            id: 'cat-acas',
            code: 'ACAS',
            name: 'ACAS',
            description: null,
            isSelectable: true,
            icon: 'apps',
          },
        ],
      })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

test.describe('capturas · CTAs en Reportar o consultar', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const viewport of [
    { width: 1440, height: 900, tag: '1440x900' },
    { width: 1920, height: 1080, tag: '1920x1080' },
  ]) {
    test(`ANALISTA idle / report / detail · ${viewport.tag}`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await page.setViewportSize(viewport)
      await installAnalyst(page)
      await page.goto('/centro-operacional')
      await settle(page)

      const panel = page.getByTestId('action-panel')
      await expect(panel).toHaveAttribute('data-mode', 'idle')
      await expect(panel).toHaveAttribute('data-can-create', 'true')
      await expect(
        page.getByTestId('my-reports').getByTestId('report-internal-button'),
      ).toHaveCount(0)

      await page.locator(`${CARD}[data-code="${SABER}"]`).click({ force: true })
      await settle(page)
      await expect(page.getByTestId('report-internal-button')).toBeEnabled()

      const cta = await page.getByTestId('report-cta-group').boundingBox()
      const heading = await page
        .locator('.action-panel__idle-heading')
        .boundingBox()
      expect(cta && heading && cta.y < heading.y).toBe(true)

      await page.screenshot({
        path: path.join(OUT, `analyst-idle-${viewport.tag}.png`),
        fullPage: false,
      })

      await page.getByTestId('report-internal-button').click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'report')
      await expect(panel.getByTestId('report-internal-button')).toHaveCount(0)

      await page.screenshot({
        path: path.join(OUT, `analyst-report-${viewport.tag}.png`),
        fullPage: false,
      })

      await page.getByTestId('report-form-back').click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'idle')
      await expect(page.getByTestId('report-internal-button')).toBeVisible()

      await page.getByTestId('my-report-row').first().click()
      await settle(page)
      await expect(panel).toHaveAttribute('data-mode', 'detail')
      await expect(panel.getByTestId('report-internal-button')).toHaveCount(0)
      await expect(page.getByTestId('detail-back')).toBeVisible()

      await page.screenshot({
        path: path.join(OUT, `analyst-detail-${viewport.tag}.png`),
        fullPage: false,
      })

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
    })
  }

  test('COORDINADOR idle con CTAs en panel de acción · 1440x900', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await installCoordinator(page)
    await page.goto('/centro-operacional')
    await settle(page)

    await expect(page.getByTestId('operational-shell')).toHaveAttribute(
      'data-shell-layout',
      'coordinator',
    )
    await expect(
      page.getByTestId('my-reports').getByTestId('report-internal-button'),
    ).toHaveCount(0)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-can-create',
      'true',
    )
    await expect(page.getByTestId('report-internal-button')).toBeVisible()
    await expect(page.getByTestId('report-dependency-button')).toBeVisible()

    await page.screenshot({
      path: path.join(OUT, 'coordinator-idle-1440x900.png'),
      fullPage: false,
    })

    await page.getByTestId('report-dependency-button').click()
    await settle(page)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'report',
    )
    await page.screenshot({
      path: path.join(OUT, 'coordinator-report-1440x900.png'),
      fullPage: false,
    })

    await page.getByTestId('report-form-back').click()
    await settle(page)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'idle',
    )
    await expect(page.getByTestId('report-internal-button')).toBeVisible()
  })
})
