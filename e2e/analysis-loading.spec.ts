import { expect, test } from 'playwright/test'

const situationId = '6ce4e56e-4444-4444-8444-444444444444'
const coordinationId = '5ce4e56e-1111-4111-8111-111111111111'
const categoryId = '4ce4e56e-1111-4111-8111-111111111111'

const session = {
  id: 'e2e-supervisor',
  name: 'Supervisora E2E',
  role: 'supervisor',
  onboardingCompleted: true,
  onboardingSeenAt: '2026-07-29T00:00:00.000Z',
}

const draft = {
  title: 'Interrupción del servicio de matrículas',
  description:
    'Durante la ventana de mayor demanda se detectó una degradación sostenida que impide completar el proceso de matrícula y afecta a estudiantes de varias coordinaciones.',
  coordinationId,
  reportedAt: '2026-07-30T08:00',
  detectionMethod: 'SISTEMA',
  detectionMethodOther: '',
  affectedParties: ['ESTUDIANTES', 'SISTEMAS'],
  affectedPartyOther: '',
  relatedCoordinationIds: [],
  additionalNotes: '',
}

const coordination = {
  id: coordinationId,
  code: 'coord-general',
  name: 'Coordinación General',
  shortName: 'General',
  description: null,
  color: '#a3ff5c',
  icon: 'grid',
  imageAsset: '',
  displayOrder: 1,
  isActive: true,
}

const category = {
  id: categoryId,
  code: 'TECH_DEGRADATION',
  name: 'Degradación tecnológica',
  description: null,
  displayOrder: 1,
  isActive: true,
}

const situation = {
  id: situationId,
  title: draft.title,
  description: draft.description,
  coordinationId,
  coordinationCode: coordination.code,
  coordinationName: coordination.name,
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
  occurredAt: '2026-07-30T13:00:00.000Z',
  createdAt: '2026-07-30T13:05:00.000Z',
  updatedAt: '2026-07-30T13:05:00.000Z',
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ user, captureDraft }) => {
      localStorage.setItem(
        'novex.auth.accessToken.v1',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtc3VwZXJ2aXNvciIsImVtYWlsIjoiZTJlQG5vdmV4LnRlc3QiLCJyb2xlSWQiOiJyb2xlLWUyZSIsInJvbGVDb2RlIjoiQU5BTElTVEEiLCJjb29yZGluYXRpb25JZCI6bnVsbCwicGVybWlzc2lvbnMiOlsiQVVUSF9WSUVXX1BST0ZJTEUiLCJDT09SRElOQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX0NSRUFURSIsIlNJVFVBVElPTlNfVVBEQVRFIiwiQUlfQU5BTFlaRSIsIkFJX1ZJRVdfUkVQT1JUUyIsIlJFUE9SVFNfVklFVyJdLCJzdGF0dXMiOiJBQ1RJVkUifQ.e2e',
      )
      localStorage.setItem('novex.auth.session.v1', JSON.stringify(user))
      localStorage.setItem(
        'novex.situationCapture.draft.v1',
        JSON.stringify(captureDraft),
      )
      localStorage.setItem('novex.situationCapture.step.v1', '2')
    },
    { user: session, captureDraft: draft },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode: 'ANALISTA',
            roleName: 'Analista',
            onboardingStep: 100,
            onboardingCompleted: true,
            onboardingSeenAt: '2026-07-22T00:00:00.000Z',
            coordinationId,
            coordinationCode: coordination.code,
          },
        },
      })
      return
    }

    if (path.endsWith('/coordinations')) {
      await route.fulfill({ json: [coordination] })
      return
    }

    if (path.endsWith('/intelligence/categories')) {
      await route.fulfill({ json: [category] })
      return
    }

    if (
      path.endsWith('/situations/register-with-analysis') &&
      method === 'POST'
    ) {
      // Mantiene la solicitud en curso para validar el estado de procesamiento.
      await new Promise((resolve) => setTimeout(resolve, 20_000))
      await route.fulfill({ json: { situation, analysis: { situationId } } })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  })
})

test('muestra el centro de análisis animado sin alterar el menú del wizard', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/situaciones/nueva')

  await page
    .getByRole('button', { name: 'Crear expediente e iniciar análisis IA' })
    .click()

  await expect(
    page.getByRole('heading', { name: 'Analizando la situación...' }),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Pasos del registro' }),
  ).toContainText('Interpretar')
  await expect(page.locator('.novex-analysis-report-card')).toHaveCount(4)
  await expect(
    page.getByRole('progressbar', { name: 'Progreso estimado del análisis' }),
  ).toHaveAttribute('aria-valuenow', /\d+/)

  await expect
    .poll(() =>
      page.locator('.novex-analysis-visual').evaluate((element) => {
        return getComputedStyle(element).backgroundImage.includes(
          'novex-analysis-core.png',
        )
      }),
    )
    .toBe(true)

  const animationName = await page
    .locator('.novex-analysis-connectors path')
    .first()
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(animationName).toBe('novex-analysis-data-flow')

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
    path: 'test-results/analysis-loading-desktop.png',
    fullPage: true,
  })
})

test('mantiene íntegro el centro de análisis en un escritorio compacto', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/situaciones/nueva')

  await page
    .getByRole('button', { name: 'Crear expediente e iniciar análisis IA' })
    .click()

  await expect(
    page.getByRole('heading', { name: 'Analizando la situación...' }),
  ).toBeVisible()
  await expect(page.locator('.novex-analysis-pipeline')).toBeInViewport()
  await expect(
    page.locator('.novex-analysis-report__security'),
  ).toBeInViewport()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
            document.documentElement.clientWidth &&
          document.documentElement.scrollHeight <=
            document.documentElement.clientHeight,
      ),
    )
    .toBe(true)

  await page.screenshot({
    path: 'test-results/analysis-loading-compact.png',
    fullPage: true,
  })
})

test('apila el informe y conserva scroll interno en tablet', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/situaciones/nueva')

  await page
    .getByRole('button', { name: 'Crear expediente e iniciar análisis IA' })
    .click()

  const workspace = page.locator('.novex-analysis-workspace')
  await expect(workspace).toBeVisible()
  await expect
    .poll(() =>
      workspace.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true)

  await page.screenshot({
    path: 'test-results/analysis-loading-tablet.png',
    fullPage: true,
  })

  await workspace.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(
    page.locator('.novex-analysis-report__security'),
  ).toBeInViewport()
  await expect(
    page.getByRole('navigation', { name: 'Pasos del registro' }),
  ).toBeVisible()
})
