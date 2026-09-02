import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Experiencia ADMIN de estado operacional — fase 4.
 *
 * Cubre la cadena ruta -> API -> estado -> contrato -> 15 coordinaciones.
 * Todavía NO hay cartas, arco, flip, aura, personaje ni isla: esos tests
 * llegan con las fases que los construyen.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

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
      sub: 'e2e-admin',
      email: 'admin@novex.test',
      roleId: 'role-admin',
      roleCode: 'ADMIN',
      coordinationId: null,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

const session = {
  id: 'e2e-admin',
  name: 'Administrador E2E',
  role: 'supervisor',
  roleCode: 'ADMIN',
  roleName: 'Administrador',
  permissions: PERMISSIONS,
  onboardingStep: 100,
  onboardingCompleted: true,
}

async function installAdminSession(page: Page) {
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
}

/**
 * Cuenta las peticiones al API y responde solo lo que la experiencia debe
 * necesitar. Cualquier otra ruta se registra y devuelve 404 para que un
 * consumo inesperado sea visible en la aserción de LEVEL 0.
 */
async function installApi(
  page: Page,
  options: {
    analystRegistryActiveProblems?: number
    overviewStatus?: number
    overviewBody?: unknown
  } = {},
) {
  const requested: string[] = []

  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    requested.push(path)

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }

    if (path.endsWith('/operational-overview')) {
      if (options.overviewStatus && options.overviewStatus !== 200) {
        await route.fulfill({
          status: options.overviewStatus,
          json: { message: 'E2E' },
        })
        return
      }
      await route.fulfill({
        json:
          options.overviewBody ??
          operationalOverviewFixture({
            analystRegistryActiveProblems:
              options.analystRegistryActiveProblems ?? 0,
          }),
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return requested
}

test('ADMIN entra a /centro-operacional y ve el estado operacional real', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installAdminSession(page)
  const requested = await installApi(page)

  await page.goto('/centro-operacional')

  const experience = page.getByTestId('operational-cards-experience')
  await expect(experience).toBeVisible()
  await expect(page.getByTestId('direction-status')).toHaveAttribute(
    'data-status',
    'ALERTA',
  )
  await expect(page.getByTestId('coordinations-count')).toHaveText(
    'Coordinaciones recibidas: 15',
  )
  await expect(page.getByTestId('overview-totals')).toHaveText(
    'Críticas 1 · En alerta 1 · Estables 13',
  )

  const items = page.getByTestId('coordination-scaffold-item')
  await expect(items).toHaveCount(15)

  // Coordinación General es una coordinación más de las 15.
  await expect(
    page.locator('[data-testid="coordination-scaffold-item"][data-code="coord-general"]'),
  ).toBeVisible()

  // Las 15 identidades visuales resuelven por code.
  await expect(
    page.locator('[data-testid="coordination-scaffold-item"][data-identity="resolved"]'),
  ).toHaveCount(15)
  await expect(page.getByTestId('identity-inconsistency')).toHaveCount(0)

  // Registro de analista en cero: no aparece ningún control adicional.
  await expect(page.getByTestId('analyst-registry-placeholder')).toHaveCount(0)

  // LEVEL 0 es una sola petición y no arrastra el agregado legacy.
  const overviewCalls = requested.filter((path) =>
    path.endsWith('/operational-overview'),
  )
  expect(overviewCalls).toHaveLength(1)
  expect(
    requested.filter(
      (path) =>
        path.includes('/situations') ||
        path.includes('/network-status') ||
        path.includes('/dashboard') ||
        path.includes('/analysis') ||
        path.includes('/recommendations') ||
        path.includes('/evidences') ||
        path.includes('/timeline'),
    ),
  ).toEqual([])
})

test('un fallo de LEVEL 0 se comunica como DESCONOCIDO, nunca como estable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installAdminSession(page)
  await installApi(page, { overviewStatus: 500 })

  await page.goto('/centro-operacional')

  await expect(page.getByTestId('operational-cards-error')).toBeVisible()
  await expect(page.getByTestId('direction-status')).toHaveAttribute(
    'data-status',
    'DESCONOCIDO',
  )
  await expect(page.getByTestId('coordinations-count')).toHaveCount(0)
  await expect(page.getByTestId('coordination-scaffold-item')).toHaveCount(0)
})

test('un contrato inutilizable no pinta datos inventados', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installAdminSession(page)
  await installApi(page, {
    overviewBody: { directionStatus: 'ESTABLE', coordinations: 'nope' },
  })

  await page.goto('/centro-operacional')

  await expect(page.getByTestId('operational-cards-error')).toBeVisible()
  await expect(page.getByTestId('direction-status')).toHaveAttribute(
    'data-status',
    'DESCONOCIDO',
  )
})

test('el Registro de analista solo aparece cuando tiene problemas activos', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installAdminSession(page)
  await installApi(page, { analystRegistryActiveProblems: 3 })

  await page.goto('/centro-operacional')

  const placeholder = page.getByTestId('analyst-registry-placeholder')
  await expect(placeholder).toBeVisible()
  await expect(placeholder).toContainText('3 problemas activos')
  // Sigue sin ser carta ni coordinación 16.
  await expect(page.getByTestId('coordination-scaffold-item')).toHaveCount(15)
})

test('las secciones hijas del Centro Operacional siguen accesibles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installAdminSession(page)
  await installApi(page)

  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toBeVisible()

  for (const label of ['Panorama global', 'Inteligencia IA', 'Auditoría']) {
    await page.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(/\/centro-operacional\/(panorama|inteligencia|reportes)/)
    await expect(page.getByTestId('operational-cards-experience')).toHaveCount(0)
  }

  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByTestId('operational-cards-experience')).toBeVisible()
})
