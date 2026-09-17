import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * PANEL DERECHO: reportar o resolver.
 *
 * Sustituye a la prueba del carril de indicadores. Se conservan sus
 * comprobaciones de GEOMETRÍA, que seguían siendo válidas y son las que
 * protegían la escena —la columna no crece, la baraja no se mueve, lo que sobra
 * se desplaza DENTRO y la ruta no abre scroll— y se cambian las que describían
 * cifras, porque esa pieza ya no existe.
 *
 * Lo que se añade es la responsabilidad nueva: los tres modos del panel y que
 * seleccionar una carta NO abra el formulario.
 */

const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const PANEL = '[data-testid="action-panel"]'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
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

const round = (value: number) => Math.round(value)

const MIS_REPORTES = [
  {
    id: 'mine-1',
    title: 'Reporte propio en otra área',
    severity: 'HIGH',
    status: 'OPEN',
    coordinationId: 'uuid-negocios',
    coordinationCode: 'coord-negocios',
    coordinationName: 'Negocios',
    createdByUserId: 'e2e-admin',
    createdByUserName: 'Administrador E2E',
    categoryId: 'cat',
    categoryCode: 'TECH',
    categoryName: 'Técnica',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    occurredAt: '2026-09-01T09:00:00.000Z',
    description: 'desc',
    relatedCoordinations: [],
    resolution: null,
    canResolve: false,
  },
  {
    id: 'mine-2',
    title: 'Reporte histórico sin área',
    severity: 'LOW',
    status: 'CLOSED',
    coordinationId: null,
    coordinationCode: null,
    coordinationName: null,
    createdByUserId: 'e2e-admin',
    createdByUserName: 'Administrador E2E',
    categoryId: 'cat',
    categoryCode: 'TECH',
    categoryName: 'Técnica',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    occurredAt: '2026-08-01T09:00:00.000Z',
    description: 'desc',
    relatedCoordinations: [],
    resolution: null,
    canResolve: false,
  },
]

async function install(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript((token) => {
    localStorage.setItem('novex.auth.accessToken.v1', token)
  }, accessToken())

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name } } })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: operationalOverviewFixture({ severe: true }) })
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
    if (url.pathname.endsWith('/situations')) {
      // «Mis reportes» y la lista por coordinación comparten endpoint: los
      // distingue el parámetro `mine`, que es lo que la fase 2 introdujo.
      const items = url.searchParams.get('mine') === 'true' ? MIS_REPORTES : []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100 },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

async function settle(page: Page) {
  await page.waitForTimeout(600)
}

/**
 * Espera a que la ESCENA deje de moverse antes de medirla.
 *
 * No es una espera arbitraria: es una condición. La banda de la baraja cae unos
 * 5 px durante el asentamiento inicial —medido: 371,5 px a los 200 ms y 366,5 a
 * partir de los 600— porque el encabezado de la plataforma se reajusta cuando
 * terminan de cargar sus tipografías. Una medida tomada dentro de esa ventana
 * describe un fotograma transitorio, y bajo la carga de la corrida completa esa
 * ventana se alarga lo suficiente para que una espera fija caiga dentro.
 *
 * Se lee la caja hasta que dos lecturas consecutivas coinciden.
 */
async function esperarEscenaEstable(page: Page, selector: string) {
  let previa: string | null = null
  for (let intento = 0; intento < 40; intento += 1) {
    const caja = await page.locator(selector).first().boundingBox()
    const actual = caja ? `${Math.round(caja.y)}:${Math.round(caja.height)}` : null
    if (actual !== null && actual === previa) return
    previa = actual
    await page.waitForTimeout(120)
  }
  throw new Error(`La escena no se estabilizó: ${selector}`)
}

test.describe('panel derecho · modos', () => {
  test.beforeEach(async ({ page }) => {
    await install(page)
    await page.goto('/centro-operacional')
    await settle(page)
  })

  test('arranca en reposo, no en el formulario', async ({ page }) => {
    await expect(page.locator(PANEL)).toHaveAttribute('data-mode', 'idle')
    await expect(page.getByTestId('action-panel-idle')).toBeVisible()
    await expect(page.getByTestId('report-form')).toHaveCount(0)
  })

  test('seleccionar una carta NO abre el formulario', async ({ page }) => {
    await page.locator(CARD).first().click({ force: true })
    await settle(page)

    // La carta cambia la lista central, no el modo del panel.
    await expect(page.locator(PANEL)).toHaveAttribute('data-mode', 'idle')
    await expect(page.getByTestId('report-form')).toHaveCount(0)
  })

  test('«Reportar problema» abre el formulario con su destino a la vista', async ({
    page,
  }) => {
    await page.locator(CARD).first().click({ force: true })
    await settle(page)
    await page.getByTestId('report-problem-button').click()
    await settle(page)

    await expect(page.locator(PANEL)).toHaveAttribute('data-mode', 'report')
    await expect(page.getByTestId('report-form-destination')).toBeVisible()
    // Severidad visible y con MEDIUM de partida, no oculta.
    await expect(page.getByTestId('report-severity-MEDIUM')).toBeChecked()
  })

  test('sin coordinación el formulario lo dice y no deja enviar', async ({
    page,
  }) => {
    await page.getByTestId('report-problem-button').click()
    await settle(page)

    await expect(page.getByTestId('report-form-no-destination')).toBeVisible()
    await expect(page.getByTestId('report-submit')).toBeDisabled()
  })
})

test.describe('«Mis reportes»', () => {
  test.beforeEach(async ({ page }) => {
    await install(page)
    await page.goto('/centro-operacional')
    await settle(page)
  })

  test('muestra los reportes propios sin depender de la carta', async ({
    page,
  }) => {
    await expect(page.getByTestId('my-reports-list')).toBeVisible()
    await expect(page.getByTestId('my-report-row')).toHaveCount(2)

    // Cambiar de carta no la recarga ni la filtra.
    await page.locator(CARD).first().click({ force: true })
    await settle(page)
    await expect(page.getByTestId('my-report-row')).toHaveCount(2)
  })

  test('un reporte sin coordinación se rotula como tal', async ({ page }) => {
    const fila = page.locator('[data-testid="my-report-row"][data-unassigned="true"]')
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('Sin coordinación')
  })

  test('el botón de reportar existe también con la lista cargada', async ({
    page,
  }) => {
    await expect(page.getByTestId('report-problem-button')).toBeVisible()
  })
})

/**
 * GEOMETRÍA. Heredada de la prueba del carril: son las cotas que impedían que
 * la columna derecha empujara la baraja o abriera scroll de ruta.
 */
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`geometría ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test('la columna no crece, la mesa no se mueve y no hay desbordamiento', async ({
      page,
    }) => {
      await install(page)
      await page.goto('/centro-operacional')
      await settle(page)
      await esperarEscenaEstable(page, '[data-testid="shell-stage"]')

      const boxOf = async (selector: string) =>
        (await page.locator(selector).first().boundingBox())!

      const shell = await boxOf('[data-testid="operational-shell"]')
      const region = await boxOf('[data-testid="shell-region-action"]')
      const stageAntes = await boxOf('[data-testid="shell-stage"]')

      // La columna derecha ocupa su reparto declarado y nada más.
      const proporcion = (region.width / shell.width) * 100
      expect(proporcion).toBeGreaterThan(25)
      expect(proporcion).toBeLessThan(34)

      // La baraja queda a la IZQUIERDA del panel: no lo invade.
      const cards = await boxOf(CARD)
      expect(cards.x).toBeLessThan(region.x)

      /*
       * CAMBIAR DE MODO NO RECOLOCA LA MESA.
       *
       * La medida de referencia se toma DESPUÉS de seleccionar la carta y con la
       * escena ya estable. Antes se tomaba en GLOBAL, así que la comparación
       * mezclaba dos cosas distintas —recomponer la baraja y abrir el panel— y
       * bastaba con que la primera medida cayera en el asentamiento inicial para
       * que fallara. De paso se comprueba que seleccionar la carta TAMPOCO la
       * mueve, que es una garantía que antes no estaba escrita.
       */
      await page.locator(CARD).first().click({ force: true })
      await settle(page)
      await esperarEscenaEstable(page, '[data-testid="shell-stage"]')

      const stageSeleccionada = await boxOf('[data-testid="shell-stage"]')
      expect(round(stageSeleccionada.y)).toBe(round(stageAntes.y))
      expect(round(stageSeleccionada.height)).toBe(round(stageAntes.height))

      await page.getByTestId('report-problem-button').click()
      await settle(page)
      await esperarEscenaEstable(page, '[data-testid="shell-stage"]')

      const stageDespues = await boxOf('[data-testid="shell-stage"]')
      expect(round(stageDespues.y)).toBe(round(stageSeleccionada.y))
      expect(round(stageDespues.height)).toBe(round(stageSeleccionada.height))

      // Lo que sobra se desplaza DENTRO del panel, no en la página.
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

      const scroll = await page.evaluate((selector) => {
        const el = document.querySelector(selector) as HTMLElement | null
        return el ? el.scrollHeight > el.clientHeight + 1 : null
      }, PANEL)
      // Con el formulario abierto el panel puede desplazarse por dentro; lo que
      // importa es que exista esa vía y no la de la ruta.
      expect(scroll).not.toBeNull()
    })
  })
}
