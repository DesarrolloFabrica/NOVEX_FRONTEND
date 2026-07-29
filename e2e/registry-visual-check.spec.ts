import { expect, test } from 'playwright/test'

const session = {
  id: 'e2e-supervisor',
  name: 'Supervisora E2E',
  role: 'supervisor',
  onboardingCompleted: true,
  onboardingSeenAt: '2026-07-22T00:00:00.000Z',
}

const coordinations = [
  {
    id: 'coord-general',
    code: 'coord-general',
    name: 'Coordinación General',
    shortName: 'General',
    description: null,
    color: '#a3ff5c',
    icon: 'grid',
    imageAsset: '',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'coord-b2b',
    code: 'coord-b2b',
    name: 'Coordinación B2B',
    shortName: 'B2B',
    description: null,
    color: '#38d9ff',
    icon: 'users',
    imageAsset: '',
    displayOrder: 2,
    isActive: true,
  },
]

const situations = [
  {
    id: '6ce4e56e-1111-4111-8111-111111111111',
    title: 'Intermitencia en la plataforma de atención',
    description: 'Degradación observada en el canal principal.',
    coordinationId: 'coord-general',
    coordinationCode: 'coord-general',
    coordinationName: 'Coordinación General',
    createdByUserId: 'e2e-supervisor',
    createdByUserName: 'Supervisora E2E',
    categoryId: 'category-tech',
    categoryCode: 'TECH',
    categoryName: 'Degradación tecnológica',
    severity: 'HIGH',
    status: 'OPEN',
    occurredAt: '2026-07-28T13:30:00.000Z',
    createdAt: '2026-07-28T13:35:00.000Z',
    updatedAt: '2026-07-28T14:00:00.000Z',
  },
  {
    id: '6ce4e56e-2222-4222-8222-222222222222',
    title: 'Demora en confirmación de solicitudes',
    description: 'Aumento en los tiempos de respuesta.',
    coordinationId: 'coord-b2b',
    coordinationCode: 'coord-b2b',
    coordinationName: 'Coordinación B2B',
    createdByUserId: 'e2e-supervisor',
    createdByUserName: 'Supervisora E2E',
    categoryId: 'category-service',
    categoryCode: 'SERVICE',
    categoryName: 'Continuidad del servicio',
    severity: 'MEDIUM',
    status: 'IN_PROGRESS',
    occurredAt: '2026-07-27T16:00:00.000Z',
    createdAt: '2026-07-27T16:05:00.000Z',
    updatedAt: '2026-07-28T12:00:00.000Z',
  },
  {
    id: '6ce4e56e-3333-4333-8333-333333333333',
    title: 'Validación de cierre operativo',
    description: 'Seguimiento final completado.',
    coordinationId: 'coord-general',
    coordinationCode: 'coord-general',
    coordinationName: 'Coordinación General',
    createdByUserId: 'e2e-supervisor',
    createdByUserName: 'Supervisora E2E',
    categoryId: 'category-ops',
    categoryCode: 'OPS',
    categoryName: 'Gestión operativa',
    severity: 'LOW',
    status: 'RESOLVED',
    occurredAt: '2026-07-25T09:15:00.000Z',
    createdAt: '2026-07-25T09:20:00.000Z',
    updatedAt: '2026-07-26T10:00:00.000Z',
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem('novex.auth.accessToken.v1', 'e2e-token')
      localStorage.setItem('novex.auth.session.v1', JSON.stringify(user))
    },
    { user: session },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode: 'SUPERVISOR_GENERAL',
            coordinationId: 'coord-general',
            coordinationCode: 'coord-general',
          },
        },
      })
      return
    }

    if (url.pathname.endsWith('/coordinations')) {
      await route.fulfill({ json: coordinations })
      return
    }

    if (/\/situations\/[^/]+\/analysis\/history$/.test(url.pathname)) {
      await route.fulfill({ json: { items: [], total: 1, latestVersion: 1 } })
      return
    }

    if (/\/situations\/[^/]+\/analysis$/.test(url.pathname)) {
      await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
      return
    }

    if (/\/situations\/[^/]+\/recommendations$/.test(url.pathname)) {
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }

    if (url.pathname.endsWith('/situations')) {
      await route.fulfill({
        json: { items: situations, total: situations.length, page: 1, limit: 100 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  })
})

test('valida la nueva jerarquía visual del registro', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/situaciones')

  await expect(page.getByRole('heading', { name: 'Situaciones registradas' })).toBeVisible()
  await expect(page.locator('.novex-execution-summary__item')).toHaveCount(4)
  await expect(page.locator('.novex-events-table__grid--registry th')).toHaveCount(7)
  await expect(page.locator('#registry-filter-panel')).toBeHidden()

  await page.screenshot({
    path: 'test-results/registry-redesign-desktop.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Filtros' }).click()
  await expect(page.locator('#registry-filter-panel')).toBeVisible()
  await expect(page.getByLabel('Filtrar por estado')).toBeVisible()
  await page.waitForTimeout(250)

  await page.screenshot({
    path: 'test-results/registry-redesign-filters.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Filtros' }).click()
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
  await page.screenshot({
    path: 'test-results/registry-redesign-compact.png',
    fullPage: true,
  })
})
