import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Registro dual ANALISTA: problema interno y dependencia entre coordinaciones.
 */

const CARD = '[data-testid="coordination-card"]'
const SABER = 'coord-saber-pro'
const FABRICA = 'coord-fabrica-contenidos'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const session = {
  id: 'e2e-analyst',
  name: 'Analista E2E',
  role: 'analista',
  roleCode: 'ANALISTA',
  roleName: 'Analista',
  permissions: PERMISSIONS,
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
      sub: 'e2e-analyst',
      email: 'analista@novex.test',
      roleId: 'role-analyst',
      roleCode: 'ANALISTA',
      coordinationId: null,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

const OVERVIEW = operationalOverviewFixture({ severe: true })
const SABER_ROW = OVERVIEW.coordinations.find((c) => c.code === SABER)!
const FABRICA_ROW = OVERVIEW.coordinations.find((c) => c.code === FABRICA)!

async function settle(page: Page) {
  await page.waitForTimeout(600)
}

async function install(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((token) => {
    localStorage.setItem('novex.auth.accessToken.v1', token)
  }, accessToken())

  let created: Record<string, unknown> | null = null

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

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
            icon: 'acas',
          },
        ],
      })
      return
    }

    if (
      method === 'POST' &&
      url.pathname.endsWith('/situations/register-with-analysis')
    ) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const isInter = body.reportKind === 'INTER_COORDINATION'
      created = {
        id: 'sit-inter-1',
        title: body.title,
        description: body.description,
        reportKind: body.reportKind ?? 'INTERNAL',
        coordinationId: body.coordinationId ?? null,
        coordinationCode: isInter ? FABRICA : SABER,
        coordinationName: isInter
          ? FABRICA_ROW.name
          : SABER_ROW.name,
        affectedCoordinationId:
          body.affectedCoordinationId ?? body.coordinationId ?? null,
        affectedCoordinationCode: SABER,
        affectedCoordinationName: SABER_ROW.name,
        affectedProcess: body.affectedProcess ?? null,
        pendingDelivery: body.pendingDelivery ?? null,
        createdByUserId: session.id,
        createdByUserName: session.name,
        categoryId: body.categoryId ?? null,
        categoryCode: body.categoryId ? 'ACAS' : null,
        categoryName: body.categoryId ? 'ACAS' : null,
        severity: body.severity,
        status: 'OPEN',
        occurredAt: body.occurredAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedCoordinations: [],
        resolution: null,
        canResolve: false,
      }
      await route.fulfill({
        status: 201,
        json: { situation: created, analysis: null },
      })
      return
    }

    if (url.pathname.includes('/situations/') && method === 'GET') {
      const idMatch = url.pathname.match(/\/situations\/([^/]+)$/)
      if (idMatch && idMatch[1] !== 'categories') {
        await route.fulfill({ json: created })
        return
      }
    }

    if (url.pathname.endsWith('/situations')) {
      const mine = url.searchParams.get('mine') === 'true'
      const status = url.searchParams.get('status')
      const forList =
        created &&
        (!status || status === created.status)
          ? [created]
          : []
      if (mine || url.searchParams.get('coordinationId')) {
        await route.fulfill({
          json: {
            items: forList,
            total: forList.length,
            page: 1,
            limit: mine ? 20 : 100,
            scope: 'complete',
          },
        })
        return
      }
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 50, scope: 'complete' },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

async function selectCardByCode(page: Page, code: string) {
  const card = page.locator(`${CARD}[data-code="${code}"]`)
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.click({ force: true })
  await expect(page.getByTestId('report-dependency-button').first()).toBeEnabled({
    timeout: 15_000,
  })
}

test.describe('Registro dual ANALISTA', () => {
  test('registra dependencia INTER desde Saber Pro hacia Fábrica', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await install(page)
    await page.goto('/centro-operacional')
    await expect(page.getByTestId('operational-shell')).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.locator(`${CARD}[data-code="${SABER}"]`)).toBeVisible({
      timeout: 30_000,
    })
    await settle(page)

    await selectCardByCode(page, SABER)
    await page.getByTestId('report-dependency-button').first().click()
    await settle(page)

    await expect(page.locator('[data-testid="action-panel"]')).toHaveAttribute(
      'data-mode',
      'report',
    )
    await expect(page.getByTestId('report-form')).toHaveAttribute(
      'data-report-kind',
      'INTER_COORDINATION',
    )
    await expect(page.getByTestId('report-form-destination')).toContainText(
      'Saber Pro',
    )

    await page.getByTestId('report-responsible-trigger').click()
    await page
      .locator(
        `[data-testid="report-responsible-option"][data-option-id="${FABRICA_ROW.id}"]`,
      )
      .click()
    await expect(page.getByTestId('report-responsible-value')).toHaveValue(
      FABRICA_ROW.id,
    )
    await expect(page.getByTestId('report-responsible-summary')).toContainText(
      'Afectada: Saber Pro',
    )
    await expect(page.getByTestId('report-responsible-summary')).toContainText(
      'Responsable:',
    )
    await page.getByTestId('report-title').fill('Guiones pendientes')
    await page
      .getByTestId('report-description')
      .fill('La entrega de guiones retrasa la certificación.')
    await page
      .getByTestId('report-affected-process')
      .fill('Certificación Saber Pro')
    await page.getByTestId('report-pending-delivery').fill('Guiones de Fábrica')
    await page.getByTestId('report-submit').click()
    await settle(page)

    await expect(page.getByTestId('my-report-row')).toHaveCount(1)
    // «Mis reportes» representa a la RESPONSABLE y la nombra como tal.
    const myRow = page.getByTestId('my-report-row')
    await expect(myRow.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark-code',
      FABRICA,
    )
    await expect(myRow.getByTestId('my-report-origin')).toHaveText(
      'Afectada: Saber Pro · Responsable: Fábrica de Contenidos',
    )

    // Desde Saber Pro (la afectada), la fila representa a la otra: Fábrica.
    const problemRow = page.getByTestId('problem-row').first()
    await expect(problemRow.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark-code',
      FABRICA,
    )
    await expect(problemRow.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark',
      'logo',
    )
    await expect(problemRow.getByTestId('problem-row-origin')).toHaveText(
      'Nos afecta desde Fábrica de Contenidos',
    )
    await expect(problemRow).toHaveAttribute(
      'aria-label',
      /Dependencia que nos afecta\. Coordinación responsable: Fábrica de Contenidos\./,
    )
  })

  test('problema interno sigue abriendo categorías', async ({ page }) => {
    test.setTimeout(90_000)
    await install(page)
    await page.goto('/centro-operacional')
    await expect(page.getByTestId('operational-shell')).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.locator(`${CARD}[data-code="${SABER}"]`)).toBeVisible({
      timeout: 30_000,
    })
    await settle(page)
    await selectCardByCode(page, SABER)
    await page.getByTestId('report-internal-button').first().click()
    await settle(page)
    await expect(page.getByTestId('report-form')).toHaveAttribute(
      'data-report-kind',
      'INTERNAL',
    )
    await expect(page.getByTestId('report-category')).toBeVisible()
  })
})
