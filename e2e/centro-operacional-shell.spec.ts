import { expect, test, type Page } from 'playwright/test'

/**
 * Shell del Centro Operacional — FASE 1 (retiro de la navegación legacy).
 *
 * Verdades que protege este fichero:
 * - las pantallas legacy (Dashboard, Red de impacto, Situaciones, Gestión,
 *   Panorama, Inteligencia IA, Auditoría y sus alias) ya no son destinos:
 *   redirigen al Centro Operacional, sin carril;
 * - el Centro no ofrece pestañas legacy ni menú «Plataforma»;
 * - usuario/rol, ayuda y cerrar sesión siguen disponibles (desde la Fase 1.5,
 *   en la hamburguesa flotante: el Centro ya no monta cabecera);
 * - la Administración (solo ADMIN) se conserva y se alcanza desde ese menú,
 *   sin carril.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

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

async function install(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
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

  // Estas rutas no se están probando por su contenido, solo por la presencia
  // del carril. Aun así el mock tiene que respetar la FORMA de cada respuesta:
  // varios catálogos devuelven un array desnudo y, si se les entrega un objeto,
  // la página entera cae al ErrorBoundary del router y se lleva el carril por
  // delante, produciendo un falso positivo de regresión.
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (pathname.endsWith('/coordinations/graph')) {
      await route.fulfill({ json: { coordinations: [], dependencies: [] } })
      return
    }
    if (
      /\/(users|roles|permissions|coordinations|operational-areas|incident-categories)$/.test(
        pathname,
      )
    ) {
      await route.fulfill({ json: [] })
      return
    }
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 100 } })
  })
}

const LEGACY_ROUTES = [
  '/dashboard',
  '/red-impacto',
  '/situaciones',
  '/gestion',
  '/centro-operacional/panorama',
  '/centro-operacional/inteligencia',
  '/centro-operacional/reportes',
  '/intelligence',
  '/operational-events',
  '/situation-management',
  '/legacy-monitoring',
  '/monitoring',
] as const

for (const route of LEGACY_ROUTES) {
  test(`${route} redirige al Centro Operacional sin carril`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page)
    await page.goto(route)

    await expect(page).toHaveURL(/\/centro-operacional$/, { timeout: 30_000 })
    // Fase 1.5: sin cabecera; la navegación vive en la hamburguesa flotante.
    await expect(page.getByTestId('shell-menu-trigger')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('eoc-chrome')).toHaveCount(0)
    await expect(page.locator('.novex-os-rail')).toHaveCount(0)
  })
}

test('el registro legado no rebota: un rol sin creación cae en el Centro', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page)
  await page.goto('/situaciones/nueva')
  await expect(page).toHaveURL(/\/centro-operacional$/, { timeout: 30_000 })
})

test('el Centro no ofrece navegación legacy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page)
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('eoc-chrome')).toHaveCount(0)
  // Los enlaces de navegación viven ahora en el menú: se revisan con él abierto.
  await page.getByTestId('shell-menu-trigger').click({ timeout: 30_000 })
  const menu = page.getByTestId('shell-menu-panel')
  await expect(menu).toBeVisible()

  await expect(page.getByTestId('platform-menu-trigger')).toHaveCount(0)
  await expect(page.locator('.eoc-subnav')).toHaveCount(0)
  for (const label of [
    'Panorama global',
    'Inteligencia IA',
    'Auditoría',
    'Dashboard',
    'Red de impacto',
    'Situaciones registradas',
    'Gestión de situaciones',
  ]) {
    await expect(page.getByRole('link', { name: label })).toHaveCount(0)
  }
  // Ningún enlace de la página apunta a una ruta legacy.
  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  expect(
    hrefs.filter((href) =>
      /^\/(dashboard|red-impacto|situaciones|gestion)\b|\/centro-operacional\/(panorama|inteligencia|reportes)/.test(
        href ?? '',
      ),
    ),
  ).toEqual([])

  // Identidad del usuario en el menú y nombre accesible de la pantalla (sin
  // cabecera visible: el h1 es solo para tecnologías de apoyo).
  await expect(menu).toContainText('Administrador E2E')
  await expect(
    page.getByRole('heading', { name: 'Centro operacional', level: 1 }),
  ).toHaveCount(1)
})

test('usuario, rol, Administración y cerrar sesión siguen accesibles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page)
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('eoc-chrome')).toHaveCount(0)

  // Fase 1.5: usuario, rol, destinos y sesión viven en la hamburguesa.
  const trigger = page.getByTestId('shell-menu-trigger')
  await trigger.click({ timeout: 30_000 })
  const menu = page.getByTestId('shell-menu-panel')
  await expect(menu).toContainText('Administrador E2E')
  await expect(menu).toContainText('Administrador')

  // El ADMIN conserva la Administración.
  const admin = page.getByTestId('shell-menu-option-admin')
  await expect(admin).toBeVisible()
  await expect(page.getByTestId('shell-menu-logout')).toBeVisible()
  // El tutorial está suspendido (sin pasos en este entorno): no se ofrece.
  await expect(page.getByTestId('shell-menu-tutorial')).toHaveCount(0)

  await admin.click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.locator('.novex-os-rail')).toHaveCount(0)

  // Y vuelve al Centro por el menú de usuario de la Administración, que
  // conserva su cabecera.
  await page.getByRole('button', { name: /Menú de usuario/ }).click()
  await page.getByRole('menuitem', { name: 'Centro operacional' }).click()
  await expect(page).toHaveURL(/\/centro-operacional$/)

  // Cerrar sesión lleva al login.
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-logout').click()
  await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 })
})
