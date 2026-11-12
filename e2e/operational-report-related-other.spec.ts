import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * «Registrar situación» (modal del COORDINADOR): coordinaciones relacionadas
 * (selección múltiple) y categoría «Otra» con texto propio, de punta a punta
 * con la API simulada: formulario → cuerpo del alta → expediente.
 */

const B2B = 'coord-b2b'
const FABRICA = 'coord-fabrica-contenidos'
const INGENIERIAS = 'coord-ingenierias'
const NEGOCIOS = 'coord-negocios'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
  'SITUATIONS_CLOSE',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const OVERVIEW = operationalOverviewFixture({ severe: true })
const row = (code: string) => OVERVIEW.coordinations.find((c) => c.code === code)!
const B2B_ROW = row(B2B)

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
      sub: 'e2e-coord',
      email: 'coord.b2b@novex.test',
      roleId: 'role-coord',
      roleCode: 'COORDINADOR',
      coordinationId: B2B_ROW.id,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

/* Orden alfabético del backend anterior: «Otra» llega en medio. */
const CATEGORIES = [
  { id: 'cat-acas', code: 'ACAS', name: 'ACAS', icon: 'acas' },
  { id: 'cat-otra', code: 'OTRA', name: 'Otra', icon: 'other' },
  { id: 'cat-zoho', code: 'ZOHO', name: 'Zoho', icon: 'zoho' },
].map((item) => ({ ...item, description: null, isSelectable: true }))

interface Captured {
  bodies: Record<string, unknown>[]
}

async function settle(page: Page) {
  await page.waitForTimeout(600)
}

async function install(page: Page): Promise<Captured> {
  const captured: Captured = { bodies: [] }
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((token) => {
    localStorage.setItem('novex.auth.accessToken.v1', token)
  }, accessToken())

  let created: Record<string, unknown> | null = null

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (url.pathname.endsWith('/auth/me')) {
      // Contrato vigente: permisos aparte, como objetos del catálogo RBAC.
      await route.fulfill({
        json: {
          user: {
            ...session,
            fullName: session.name,
            coordinationCode: B2B,
          },
          permissions: PERMISSIONS.map((code) => ({
            id: `perm-${code}`,
            code,
            name: code,
            module: 'situations',
            description: null,
          })),
        },
      })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({ json: CATEGORIES })
      return
    }

    if (method === 'POST' && url.pathname.endsWith('/situations/register-with-analysis')) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      captured.bodies.push(body)
      const category = CATEGORIES.find((item) => item.id === body.categoryId)
      const relatedIds = (body.relatedCoordinationIds as string[] | undefined) ?? []
      created = {
        id: 'sit-related-1',
        title: body.title,
        description: body.description,
        reportKind: body.reportKind,
        coordinationId: body.coordinationId,
        coordinationCode: OVERVIEW.coordinations.find(
          (c) => c.id === body.coordinationId,
        )?.code,
        coordinationName: OVERVIEW.coordinations.find(
          (c) => c.id === body.coordinationId,
        )?.name,
        affectedCoordinationId: body.affectedCoordinationId,
        affectedCoordinationCode: B2B,
        affectedCoordinationName: B2B_ROW.name,
        affectedProcess: null,
        pendingDelivery: null,
        createdByUserId: session.id,
        createdByUserName: session.name,
        categoryId: category?.id ?? null,
        categoryCode: category?.code ?? null,
        categoryName: category?.name ?? null,
        categoryIcon: category?.icon ?? null,
        categorySelectable: true,
        categoryOtherText: (body.categoryOtherText as string | undefined) ?? null,
        severity: body.severity,
        reportedSeverity: body.severity,
        status: 'OPEN',
        occurredAt: body.occurredAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedCoordinations: relatedIds.map((id, index) => {
          const coordination = OVERVIEW.coordinations.find((c) => c.id === id)!
          return {
            id: `rel-${index}`,
            coordinationId: id,
            coordinationCode: coordination.code,
            coordinationName: coordination.name,
            coordinationShortName: coordination.shortName,
            displayOrder: index,
          }
        }),
        resolution: null,
        canResolve: false,
      }
      await route.fulfill({ status: 201, json: { situation: created, analysis: null } })
      return
    }

    if (url.pathname.includes('/situations/') && method === 'GET') {
      const idMatch = url.pathname.match(/\/situations\/([^/]+)$/)
      if (idMatch && idMatch[1] !== 'categories' && created) {
        await route.fulfill({ json: created })
        return
      }
    }

    if (url.pathname.endsWith('/situations')) {
      const items = created ? [created] : []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100, scope: 'complete' },
      })
      return
    }

    // Evidencias, cronología, etc.: vacías.
    if (method === 'GET') {
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
  return captured
}

async function openReportForm(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })
  const cta = page.getByTestId('report-situation-button').first()
  await expect(cta).toBeEnabled({ timeout: 30_000 })
  await settle(page)
  await cta.click()
  await expect(page.getByTestId('report-modal')).toBeVisible()
  await expect(page.getByTestId('report-form')).toBeVisible()
  // El foco inicial sigue en el título, no en el buscador de relacionadas.
  await expect(page.getByTestId('report-title')).toBeFocused()
}

const option = (page: Page, code: string) =>
  page.locator(
    `[data-testid="report-related-option"][data-option-id="${row(code).id}"]`,
  )
const chips = (page: Page) => page.getByTestId('report-related-chip')

test.describe('Registrar situación · relacionadas y «Otra»', () => {
  test('INTERNAL con «Otra» y varias coordinaciones relacionadas', async ({ page }) => {
    test.setTimeout(120_000)
    const captured = await install(page)
    await openReportForm(page)

    // «Otra» siempre al final, aunque el servidor la mande en medio.
    await expect(page.getByTestId('report-category').locator('option')).toHaveText([
      'Seleccione…',
      'ACAS',
      'Zoho',
      'Otra',
    ])

    await page.getByTestId('report-title').fill('Préstamos de biblioteca caídos')
    await page
      .getByTestId('report-description')
      .fill('No se pueden registrar préstamos desde esta mañana.')
    await page.getByTestId('report-category').selectOption('cat-otra')

    const other = page.getByTestId('report-category-other')
    await expect(other).toBeFocused()

    // Sin texto no se envía: error inline y ninguna petición.
    await page.getByTestId('report-submit').click()
    await expect(page.getByTestId('report-category-other-error')).toHaveText(
      'Escriba la categoría de la situación.',
    )
    await expect(other).toHaveAttribute('aria-invalid', 'true')
    expect(captured.bodies).toHaveLength(0)

    await other.fill('Biblioteca')
    await expect(page.getByTestId('report-category-other-error')).toHaveCount(0)
    await expect(page.getByTestId('report-category-other-count')).toHaveText('10/120')

    // Relacionadas: buscar sin tilde, añadir con Enter, con clic, quitar y
    // comprobar que la propia (B2B) nunca se ofrece.
    const search = page.getByTestId('report-related-search')
    await search.fill('fabrica')
    await expect(option(page, FABRICA)).toBeVisible()
    await search.press('Enter')
    await expect(chips(page)).toHaveCount(1)

    await search.fill('coord-b2b')
    await expect(page.getByTestId('report-related-empty')).toBeVisible()
    await search.fill('')
    await expect(option(page, INGENIERIAS)).toBeVisible()
    await expect(option(page, B2B)).toHaveCount(0)

    await option(page, INGENIERIAS).click()
    await option(page, NEGOCIOS).click()
    await expect(chips(page)).toHaveCount(3)
    await page
      .locator(`[data-testid="report-related-chip"][data-option-id="${row(NEGOCIOS).id}"]`)
      .getByTestId('report-related-remove')
      .click()
    await expect(chips(page)).toHaveCount(2)

    // Escape cierra solo la lista, no el modal.
    await search.click()
    await search.press('Escape')
    await expect(search).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('report-modal')).toBeVisible()

    await page.getByTestId('report-submit').click()
    await settle(page)

    expect(captured.bodies).toHaveLength(1)
    expect(captured.bodies[0]).toMatchObject({
      reportKind: 'INTERNAL',
      categoryId: 'cat-otra',
      categoryOtherText: 'Biblioteca',
      relatedCoordinationIds: [row(FABRICA).id, row(INGENIERIAS).id],
    })

    // El expediente muestra la categoría escrita y las relacionadas.
    await expect(page.getByTestId('detail-category-other-tag')).toHaveText('Otra')
    await expect(page.getByTestId('detail-category-other-text')).toHaveText('Biblioteca')
    await expect(page.getByTestId('detail-related-item')).toHaveCount(2)
    await expect(page.getByTestId('detail-related-item').first()).toContainText(
      row(FABRICA).name,
    )
  })

  test('INTER: la responsable no puede ser además relacionada', async ({ page }) => {
    test.setTimeout(120_000)
    const captured = await install(page)
    await openReportForm(page)
    await page.getByTestId('report-kind-inter').click()

    // Primero se relaciona Fábrica; luego se elige como responsable.
    const search = page.getByTestId('report-related-search')
    await search.click()
    await option(page, FABRICA).click()
    await option(page, NEGOCIOS).click()
    await expect(chips(page)).toHaveCount(2)
    await search.press('Escape')

    await page.getByTestId('report-responsible-trigger').click()
    await page
      .locator(
        `[data-testid="report-responsible-option"][data-option-id="${row(FABRICA).id}"]`,
      )
      .click()

    // Fábrica sale de las relacionadas y ya no se ofrece.
    await expect(chips(page)).toHaveCount(1)
    await search.click()
    await expect(option(page, FABRICA)).toHaveCount(0)
    await search.press('Escape')

    await page.getByTestId('report-title').fill('Guiones pendientes')
    await page.getByTestId('report-description').fill('Retrasan la certificación.')
    await page.getByTestId('report-affected-process').fill('Certificación')
    await page.getByTestId('report-pending-delivery').fill('Guiones')
    await page.getByTestId('report-submit').click()
    await settle(page)

    expect(captured.bodies).toHaveLength(1)
    expect(captured.bodies[0]).toMatchObject({
      reportKind: 'INTER_COORDINATION',
      coordinationId: row(FABRICA).id,
      relatedCoordinationIds: [row(NEGOCIOS).id],
    })
    expect(captured.bodies[0]).not.toHaveProperty('categoryOtherText')
  })

  test('móvil: el selector y «Otra» caben sin desbordar', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await install(page)
    await openReportForm(page)
    await page.getByTestId('report-category').selectOption('cat-otra')
    const search = page.getByTestId('report-related-search')
    await search.click()
    await option(page, FABRICA).click()
    await option(page, INGENIERIAS).click()

    // Sin desplazamiento horizontal en el cuerpo del modal…
    const overflow = await page
      .locator('.report-modal__body')
      .evaluate((body) => body.scrollWidth - body.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    // …y el selector, sus chips y el campo «Otra» dentro del ancho del paso.
    const inside = await page.getByTestId('report-form').evaluate((form) => {
      const limit = form.getBoundingClientRect().right + 0.5
      const selectors = [
        '[data-testid="report-related"]',
        '[data-testid="report-related-chip"]',
        '[data-testid="report-related-search"]',
        '[data-testid="report-category-other"]',
      ]
      return selectors.every((selector) =>
        [...form.querySelectorAll(selector)].every(
          (element) => element.getBoundingClientRect().right <= limit,
        ),
      )
    })
    expect(inside).toBe(true)
    await page.getByTestId('report-category-other').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('report-category-other')).toBeVisible()
  })
})
