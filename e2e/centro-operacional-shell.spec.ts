import { expect, test, type Page } from 'playwright/test'

/**
 * Shell del Centro Operacional: reparto del carril de plataforma.
 *
 * Desde R2 el Centro Operacional NO monta el carril vertical. Este fichero
 * recorre las demás rutas que montan `NovexRoom` y verifica que el carril
 * sigue en el DOM y sigue siendo tabulable, que el grid de la sala conserva
 * sus dos columnas, y que sin carril el logout y la navegación de plataforma
 * siguen alcanzables.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'SITUATIONS_CREATE',
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

/** Rutas que montan `NovexRoom` y NO son el Centro Operacional. */
const RAIL_ROUTES = [
  '/dashboard',
  '/red-impacto',
  '/situaciones',
  '/situaciones/nueva',
  '/gestion',
  '/admin',
] as const

for (const route of RAIL_ROUTES) {
  test(`conserva el carril en ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page)
    await page.goto(route)

    const rail = page.locator('.novex-os-rail')
    await expect(rail).toHaveCount(1, { timeout: 30_000 })
    await expect(rail).toBeVisible()

    // Sigue navegable con teclado: el carril no es decorativo.
    const focusables = await page
      .locator('.novex-os-rail a, .novex-os-rail button')
      .count()
    expect(focusables).toBeGreaterThan(0)

    const grid = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.novex-os') as Element)
          .gridTemplateColumns,
    )
    expect(grid.startsWith('228px')).toBe(true)

    console.log(
      `\n@@RAIL@@ ${JSON.stringify({ route, focusables, grid })}\n`,
    )
  })
}

test('el Centro Operacional es la unica ruta sin carril, en sus cuatro secciones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page)

  for (const route of [
    '/centro-operacional',
    '/centro-operacional/panorama',
    '/centro-operacional/inteligencia',
    '/centro-operacional/reportes',
  ]) {
    await page.goto(route)
    await expect(page.getByTestId('eoc-chrome')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.novex-os-rail')).toHaveCount(0)
    // Nada del carril queda en el orden de foco.
    await expect(
      page.locator('.novex-os-rail a, .novex-os-rail button'),
    ).toHaveCount(0)
    const grid = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.novex-os') as Element)
          .gridTemplateColumns,
    )
    console.log(`\n@@NORAIL@@ ${JSON.stringify({ route, grid })}\n`)
  }
})

/** §11 — sin carril, cerrar sesion y el perfil siguen alcanzables. */
test('logout y perfil siguen accesibles sin carril', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page)
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('eoc-chrome')).toBeVisible({ timeout: 30_000 })

  // Identidad visible en el disparador del menú de usuario.
  const userTrigger = page.getByRole('button', {
    name: /Menú de usuario/,
  })
  await expect(userTrigger).toBeVisible()
  await userTrigger.click()
  await expect(
    page.getByRole('menuitem', { name: 'Cerrar sesión' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  // Navegación de plataforma alcanzable en el menú compacto.
  const platform = page.getByTestId('platform-menu-trigger')
  await expect(platform).toBeVisible()
  await platform.click()
  const popover = page.getByTestId('platform-menu-popover')
  await expect(popover).toBeVisible()
  const destinations = await popover.getByRole('menuitem').allInnerTexts()
  console.log(`\n@@PLATFORM@@ ${JSON.stringify({ destinations })}\n`)
  // El destino de la experiencia activa no se ofrece dentro de ella misma.
  expect(destinations.join(' | ')).not.toContain('Centro operacional')

  // Las cuatro secciones del Centro siguen visibles y horizontales.
  for (const label of [
    'Inicio',
    'Panorama global',
    'Inteligencia IA',
    'Auditoría',
  ]) {
    await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible()
  }

  // La identificación de pantalla sobrevive a la simplificación del header.
  await expect(
    page.getByRole('heading', { name: 'Centro operacional', level: 1 }),
  ).toBeVisible()
})
