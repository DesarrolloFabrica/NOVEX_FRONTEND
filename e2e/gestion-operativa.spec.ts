import { expect, test } from 'playwright/test'

const session = {
  id: 'e2e-supervisor',
  name: 'Supervisora E2E',
  role: 'supervisor',
  onboardingCompleted: true,
  onboardingSeenAt: '2026-07-22T00:00:00.000Z',
}

const situation = {
  id: '6ce4e56e-1111-4111-8111-111111111111',
  title: 'Interrupción parcial de la plataforma académica',
  description: 'Degradación observada durante el inicio de matrículas.',
  coordinationId: 'coord-general',
  coordinationCode: 'coord-especializaciones',
  coordinationName: 'Especializaciones',
  createdByUserId: 'e2e-supervisor',
  createdByUserName: 'ZUANY ALEJANDRO ACUÑA VELEZ',
  assignedUserId: null,
  assignedUserName: null,
  categoryId: 'category-tech',
  categoryCode: 'TECH',
  categoryName: 'Degradación tecnológica',
  severity: 'MEDIUM',
  status: 'OPEN',
  lastStatusComment: null,
  resolvedAt: null,
  closedAt: null,
  occurredAt: '2026-07-28T15:00:00.000Z',
  createdAt: '2026-07-28T15:25:00.000Z',
  updatedAt: '2026-07-28T15:25:00.000Z',
}

const recommendations = {
  situationId: situation.id,
  items: [
    {
      id: 'rec-1',
      situationId: situation.id,
      title: 'Escalamiento Vertical Inmediato',
      description: 'Ampliar capacidad del clúster.',
      priority: 'CRITICAL',
      status: 'PENDING',
      generatedBy: 'AI',
      assignedUserId: null,
      assignedUserName: null,
      dueAt: null,
      completedAt: null,
      executionNotes: null,
      createdAt: situation.createdAt,
      updatedAt: situation.updatedAt,
    },
    {
      id: 'rec-2',
      situationId: situation.id,
      title: 'Comunicación de Contingencia',
      description: 'Informar a la comunidad académica.',
      priority: 'MEDIUM',
      status: 'PENDING',
      generatedBy: 'AI',
      assignedUserId: null,
      assignedUserName: null,
      dueAt: null,
      completedAt: null,
      executionNotes: null,
      createdAt: situation.createdAt,
      updatedAt: situation.updatedAt,
    },
  ],
  total: 2,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem(
        'novex.auth.accessToken.v1',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtc3VwZXJ2aXNvciIsImVtYWlsIjoiZTJlQG5vdmV4LnRlc3QiLCJyb2xlSWQiOiJyb2xlLWUyZSIsInJvbGVDb2RlIjoiQU5BTElTVEEiLCJjb29yZGluYXRpb25JZCI6bnVsbCwicGVybWlzc2lvbnMiOlsiQVVUSF9WSUVXX1BST0ZJTEUiLCJDT09SRElOQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX0NSRUFURSIsIlNJVFVBVElPTlNfVVBEQVRFIiwiQUlfQU5BTFlaRSIsIkFJX1ZJRVdfUkVQT1JUUyIsIlJFUE9SVFNfVklFVyJdLCJzdGF0dXMiOiJBQ1RJVkUifQ.e2e',
      )
      localStorage.setItem('novex.auth.session.v1', JSON.stringify(user))
    },
    { user: session },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

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
            coordinationId: 'coord-general',
            coordinationCode: 'coord-general',
          },
        },
      })
      return
    }

    if (path.endsWith('/situations') && route.request().method() === 'GET') {
      await route.fulfill({
        json: { items: [situation], total: 1, page: 1, limit: 100 },
      })
      return
    }

    if (path.endsWith(`/situations/${situation.id}`)) {
      await route.fulfill({ json: situation })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/recommendations`)) {
      await route.fulfill({ json: recommendations })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/timeline`)) {
      await route.fulfill({
        json: {
          situationId: situation.id,
          items: [
            {
              id: 'tl-1',
              situationId: situation.id,
              userId: session.id,
              userName: session.name,
              eventType: 'SITUATION_CREATED',
              title: 'Situación registrada',
              description: `Se registró la situación "${situation.title}".`,
              metadata: { status: 'OPEN' },
              createdAt: situation.createdAt,
            },
          ],
          total: 1,
        },
      })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/analysis/history`)) {
      await route.fulfill({
        json: {
          situationId: situation.id,
          items: [],
          total: 0,
          latestVersion: null,
        },
      })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/analysis`)) {
      await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/impact`)) {
      await route.fulfill({ status: 404, json: { message: 'Sin impacto' } })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/affected-coordinations`)) {
      await route.fulfill({
        json: {
          situationId: situation.id,
          impactAssessmentId: null,
          items: [],
          total: 0,
        },
      })
      return
    }

    if (path.endsWith(`/situations/${situation.id}/evidences`)) {
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  })
})

test('centro de gestión operativa: ciclo de vida y recomendaciones de solo lectura', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/gestion')

  await expect(
    page.getByRole('heading', { name: 'Gestión de situaciones' }),
  ).toBeVisible()
  await expect(
    page.locator('.novex-execution-summary__item span', {
      hasText: 'Registradas',
    }),
  ).toBeVisible()
  await expect(
    page.locator('.novex-execution-summary__item span', {
      hasText: 'En atención',
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: /Interrupción parcial/i }).click()

  await expect(page.getByText('Expediente operativo')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Estado operacional' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Actualizar estado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Recomendaciones IA' }),
  ).toBeVisible()
  await expect(page.getByText('Inmediata', { exact: true })).toBeVisible()
  await expect(page.getByText('Escalamiento Vertical Inmediato')).toBeVisible()

  await expect(page.locator('.novex-ops-dossier select')).toHaveCount(0)
  await expect(page.locator('.novex-recommendation-item__status')).toHaveCount(
    0,
  )

  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Actualizar estado' }),
  ).toBeVisible()
  await expect(
    page.locator('.novex-ops-modal__radio', { hasText: 'En atención' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Actualizar estado' }),
  ).toHaveCount(0)
})
