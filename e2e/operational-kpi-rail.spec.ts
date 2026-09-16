import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * CARRIL DE INDICADORES.
 *
 * El carril responde a lo observado: sin selección habla de la Dirección, y
 * con una coordinación —o una de sus subordinaciones— habla de ella. Este
 * fichero comprueba ese seguimiento de contexto y, sobre todo, LO QUE NO
 * CUESTA: ninguna de sus cifras puede provocar una petición, porque todas
 * salen de datos que la escena ya tenía cargados.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const SLOT = '[data-testid="coordination-table-slot"]'
const FAN_SLOT = '[data-testid="coordination-deck-fan-slot"]'
const PANEL = '[data-testid="coordination-problem-list"]'
const PARENT = 'coord-operaciones-academicas'

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

function situationFixture(id: string, title: string, severity: string) {
  return {
    id,
    title,
    description: '',
    coordinationId: null,
    coordinationCode: null,
    coordinationName: null,
    createdByUserId: 'user',
    createdByUserName: 'User',
    categoryId: 'cat',
    categoryCode: 'CAT',
    categoryName: 'Categoria',
    severity,
    status: 'OPEN',
    occurredAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  }
}

const PROBLEMS = [
  { ...situationFixture('p-1', 'Aulas sin conectividad en sede norte', 'CRITICAL'), slaHealth: 'overdue' },
  { ...situationFixture('p-2', 'Convenio empresarial vencido', 'HIGH'), slaHealth: 'at_risk' },
  { ...situationFixture('p-3', 'Docente sin asignar', 'MEDIUM'), slaHealth: 'on_track' },
]

async function installSession(page: Page) {
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
}

async function installApi(page: Page) {
  const requested: string[] = []

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    requested.push(`${url.pathname}${url.search}`)

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }

    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: operationalOverviewFixture({ severe: true }) })
      return
    }

    if (url.pathname.endsWith('/situations')) {
      const items = url.searchParams.get('status') === 'OPEN' ? PROBLEMS : []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return requested
}

async function waitForCardArt(page: Page) {
  await page.waitForFunction(
    () => {
      const faces = Array.from(
        document.querySelectorAll('.coordination-card__face img'),
      ) as HTMLImageElement[]
      return (
        faces.length > 0 &&
        faces.every((face) => face.complete && face.naturalWidth > 0)
      )
    },
    undefined,
    { timeout: 60_000 },
  )
}

async function settle(page: Page) {
  await waitForCardArt(page)
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSTransition ||
            (animation instanceof CSSAnimation &&
              animation.animationName.startsWith('deck-fan')),
        )
        .every((animation) => animation.playState !== 'running'),
    undefined,
    { timeout: 10_000 },
  )
}

const LIST = '[data-testid="coordination-problem-list"]'
const STAGE = '[data-testid="shell-stage"]'
const REGION = '[data-testid="shell-region-problem-list"]'
const PROBLEM_ROW = '[data-testid="problem-row"]'
const FAN_SLOT_SEL = '[data-testid="coordination-deck-fan-slot"]'
const DECK_PARENT = 'coord-operaciones-academicas'
const DECK_CHILD = 'coord-ingenierias'

const KPI = '[data-testid="operational-kpi"]'
const KPI_CARD = '[data-testid="kpi-card"]'

async function openShell(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await waitForCardArt(page)
}

async function selectCard(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.locator(LIST)).toHaveAttribute('data-code', code)
  await settle(page)
}

async function selectChild(page: Page, code: string) {
  await page.locator(`${FAN_SLOT_SEL}[data-code="${code}"] button`).click()
  await expect(page.locator(LIST)).toHaveAttribute('data-code', code)
  await settle(page)
}

/** Valor de un indicador por su identificador, tal y como se lee en pantalla. */
async function kpiValue(page: Page, id: string): Promise<string> {
  return (
    (await page
      .locator(`${KPI_CARD}[data-kpi="${id}"] [data-testid="kpi-value"]`)
      .textContent()) ?? ''
  ).trim()
}

const round = (value: number) => Math.round(value)

/**
 * Cotas del carril. Lo que se vigila es que las cifras quepan sin empujar nada:
 * la columna no crece, la baraja no se mueve y lo que sobra se desplaza dentro.
 */
async function measureKpis(page: Page, label: string) {
  await settle(page)

  const boxOf = async (selector: string) =>
    await page.locator(selector).first().boundingBox()

  const region = (await boxOf('[data-testid="shell-region-kpi"]'))!
  const header = await boxOf('[data-testid="shell-region-kpi"] .operational-shell__region-title')
  const grid = await boxOf('[data-testid="kpi-grid"]')
  const stage = (await boxOf('[data-testid="shell-stage"]'))!

  const cards = await page.locator(KPI_CARD).all()
  const cardHeights: number[] = []
  for (const card of cards) {
    const box = await card.boundingBox()
    if (box) cardHeights.push(round(box.height))
  }

  const scroll = await page.evaluate((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return null
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      scrollable: el.scrollHeight > el.clientHeight + 1,
    }
  }, KPI)

  const measurement = {
    label,
    viewport: page.viewportSize(),
    region: {
      x: round(region.x),
      y: round(region.y),
      width: round(region.width),
      height: round(region.height),
    },
    header: header && { y: round(header.y), height: round(header.height) },
    grid: grid && {
      y: round(grid.y),
      width: round(grid.width),
      height: round(grid.height),
    },
    cardCount: cardHeights.length,
    cardHeights,
    kpiScroll: scroll,
    stage: {
      x: round(stage.x),
      y: round(stage.y),
      width: round(stage.width),
      height: round(stage.height),
    },
    placeholders: await page.getByTestId('shell-kpi-slot').count(),
    routeScroll: await page.evaluate(() => {
      const host = document.querySelector('.novex-os-deck__content')
      return host
        ? {
            scrollTop: Math.round(host.scrollTop),
            overflow: host.scrollHeight - host.clientHeight,
          }
        : null
    }),
    overflow: await page.evaluate(() => ({
      x:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      y:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    })),
  }

  console.log(`KPI ${JSON.stringify(measurement)}`)
  return measurement
}

test.describe('carril de indicadores · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('A · sin selección, el carril habla de la Dirección', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const rail = page.locator(KPI)
    await expect(rail).toHaveAttribute('data-scope', 'DIRECTION')
    await expect(page.getByTestId('kpi-context')).toHaveText(
      'Dirección de Operaciones',
    )

    // Estado en TEXTO, no solo en color.
    await expect(page.getByTestId('kpi-status')).toContainText('Crítico')

    // Cifras de LEVEL 0: reparto de coordinaciones por estado.
    expect(await kpiValue(page, 'critical-coordinations')).toBe('7')
    expect(await kpiValue(page, 'alert-coordinations')).toBe('1')
    // Siete estables: el reparto del fixture es 7 / 1 / 7 sobre quince filas.
    expect(await kpiValue(page, 'stable-coordinations')).toBe('7')
    // Y el Registro de analista, que no tiene carta en la mesa.
    await expect(
      page.locator(`${KPI_CARD}[data-kpi="analyst-registry"]`),
    ).toBeVisible()

    // Sin lista de problemas no hay reparto por severidad que contar.
    await expect(page.getByTestId('kpi-severity')).toHaveCount(0)

    // Los huecos del wireframe ya no existen.
    await expect(page.getByTestId('shell-kpi-slot')).toHaveCount(0)
    await expect(page.locator(KPI)).not.toContainText('Indicador 1')

    const global = await measureKpis(page, 'GLOBAL')
    expect(global.placeholders).toBe(0)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f4-1-global-indicators-1440x900.png'),
      fullPage: false,
    })
  })

  test('B · observar B2B lleva el carril a B2B', async ({ page }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')

    await expect(page.locator(KPI)).toHaveAttribute('data-scope', 'COORDINATION')
    await expect(page.getByTestId('kpi-context')).toHaveText('B2B')

    // Cifras de la coordinación, coherentes con la lista de arriba.
    expect(await kpiValue(page, 'active-problems')).toBe('3')
    expect(await kpiValue(page, 'critical-problems')).toBe('1')

    // Reparto por severidad, con texto y número.
    const severity = page.getByTestId('kpi-severity')
    await expect(severity).toBeVisible()
    await expect(severity).toContainText('Críticos')
    await expect(severity).toContainText('Altos')

    // SLA: el fixture declara uno vencido.
    expect(await kpiValue(page, 'sla-overdue')).toBe('1')

    // Ya no quedan cifras de la Dirección en el carril.
    await expect(
      page.locator(`${KPI_CARD}[data-kpi="critical-coordinations"]`),
    ).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('f4-2-b2b-indicators-1440x900.png'),
      fullPage: false,
    })
  })

  test('C+K · el carril convive con la lista y el detalle', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('problem-detail')).toBeVisible()

    // Las tres lecturas hablan de lo mismo a la vez.
    await expect(page.getByTestId('kpi-context')).toHaveText('B2B')
    await expect(page.locator(LIST)).toHaveAttribute('data-code', 'coord-b2b')
    await expect(page.getByTestId('problem-detail')).toBeVisible()

    const withDetail = await measureKpis(page, 'B2B + detalle')
    expect(withDetail.overflow.x).toBeLessThanOrEqual(0)
    expect(withDetail.overflow.y).toBeLessThanOrEqual(0)
    expect(withDetail.routeScroll!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('f4-3-b2b-detail-indicators-1440x900.png'),
      fullPage: false,
    })
  })

  test('C · el cambio directo de coordinación no deja cifras viejas', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')
    await expect(page.getByTestId('kpi-context')).toHaveText('B2B')

    await page.locator(`${CARD}[data-code="coord-saber-pro"]`).click()

    // El contexto cambia de inmediato, sin pasar por la Dirección.
    await expect(page.getByTestId('kpi-context')).toHaveText('Saber Pro')
    await expect(page.locator(KPI)).toHaveAttribute(
      'data-scope',
      'COORDINATION',
    )
    await settle(page)

    await page.screenshot({
      path: testInfo.outputPath('f4-4-saber-pro-indicators-1440x900.png'),
      fullPage: false,
    })
  })

  test('D · volver a la Dirección devuelve el carril a la Dirección', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')
    await page.getByTestId('return-to-table').click()

    await expect(page.locator(KPI)).toHaveAttribute('data-scope', 'DIRECTION')
    await expect(page.getByTestId('kpi-context')).toHaveText(
      'Dirección de Operaciones',
    )
    // Ni una cifra local sobrevive.
    await expect(
      page.locator(`${KPI_CARD}[data-kpi="active-problems"]`),
    ).toHaveCount(0)
    await expect(page.getByTestId('kpi-severity')).toHaveCount(0)
  })

  test('E+F+G · mazo, hija y cambio entre hijas', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    // E · el padre.
    await selectCard(page, DECK_PARENT)
    await expect(page.getByTestId('kpi-context')).toHaveText(
      'Operación Académica',
    )
    expect(await kpiValue(page, 'active-problems')).toBe('3')

    await page.screenshot({
      path: testInfo.outputPath('f4-5-deck-parent-indicators-1440x900.png'),
      fullPage: false,
    })

    // F · una hija, con sus propias cifras y su propio nombre de producto.
    await selectChild(page, DECK_CHILD)
    await expect(page.getByTestId('kpi-context')).toHaveText('Ingenierías')
    await expect(page.locator(KPI)).toHaveAttribute(
      'data-scope',
      'COORDINATION',
    )
    await expect(page.locator(FAN_SLOT_SEL)).toHaveCount(5)

    await page.screenshot({
      path: testInfo.outputPath('f4-6-deck-child-indicators-1440x900.png'),
      fullPage: false,
    })

    // G · de una hija a otra: el contexto sigue a la selección.
    await selectChild(page, 'coord-negocios')
    await expect(page.getByTestId('kpi-context')).toHaveText('Negocios')
    await expect(page.getByTestId('kpi-context')).not.toHaveText('Ingenierías')
  })

  test('H · el carril no cuesta ni una petición nueva', async ({ page }) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openShell(page)

    /*
     * En GLOBAL el carril se dibuja con LEVEL 0 y nada más: si necesitara los
     * problemas de las nueve coordinaciones para dar un total, aquí habría
     * nueve peticiones de más.
     */
    expect(requested.filter((entry) => entry.includes('/situations'))).toHaveLength(0)

    await selectCard(page, 'coord-b2b')
    const afterSelect = requested.filter((entry) =>
      entry.includes('/situations'),
    ).length
    // Las dos de LEVEL 1 que ya pedía la lista: OPEN e IN_PROGRESS.
    expect(afterSelect).toBe(2)

    // Volver a la Dirección y regresar a B2B no cuesta nada: la caché sirve.
    await page.getByTestId('return-to-table').click()
    await expect(page.locator(KPI)).toHaveAttribute('data-scope', 'DIRECTION')
    await selectCard(page, 'coord-b2b')

    expect(
      requested.filter((entry) => entry.includes('/situations')),
    ).toHaveLength(afterSelect)
  })

  test('I · el carril cabe en su columna y no mueve la baraja', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const before = await measureKpis(page, 'GLOBAL antes')
    await selectCard(page, 'coord-b2b')
    const after = await measureKpis(page, 'B2B')

    // La columna no cambia de tamaño con el contenido.
    expect(after.region.width).toBe(before.region.width)
    expect(after.region.height).toBe(before.region.height)
    // Ni la baraja se mueve por lo que pase en el carril.
    expect(after.stage.x).toBe(before.stage.x)
    expect(after.stage.y).toBe(before.stage.y)
    expect(after.stage.width).toBe(before.stage.width)
    // Lo que sobre se desplaza por dentro, nunca por la ruta.
    expect(after.routeScroll!.scrollTop).toBe(0)
    expect(after.overflow.x).toBeLessThanOrEqual(0)
    expect(after.overflow.y).toBeLessThanOrEqual(0)
  })
})

test.describe('carril de indicadores · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('J · la misma lectura escala sin desbordar', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const global = await measureKpis(page, 'GLOBAL 1920')
    expect(global.placeholders).toBe(0)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f4-7-global-indicators-1920x1080.png'),
      fullPage: false,
    })

    await selectCard(page, DECK_PARENT)
    await selectChild(page, DECK_CHILD)
    await expect(page.getByTestId('kpi-context')).toHaveText('Ingenierías')

    const child = await measureKpis(page, 'DECK hija 1920')
    expect(child.overflow.x).toBeLessThanOrEqual(0)
    expect(child.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f4-8-deck-child-indicators-1920x1080.png'),
      fullPage: false,
    })
  })
})
