import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * SHELL del Centro Operacional: dos zonas y un control inferior.
 *
 * Comprueba la estructura y, sobre todo, LA FRONTERA: nada de lo que se dibuja
 * en la banda de la baraja puede meterse en el carril de indicadores ni salirse
 * por el borde izquierdo. Esa era la condición que la prueba espacial dejó sin
 * cumplir mientras el tamaño de carta salía del viewport.
 *
 * Las regiones superiores y el carril son todavía superficies vacías: su
 * contenido llega en fases posteriores, y aquí solo se afirma que existen y
 * dónde caen.
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
  situationFixture('p-1', 'Aulas sin conectividad en sede norte', 'CRITICAL'),
  situationFixture('p-2', 'Convenio empresarial vencido', 'HIGH'),
  situationFixture('p-3', 'Docente sin asignar', 'MEDIUM'),
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
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())

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

interface Box {
  x: number
  y: number
  width: number
  height: number
}

async function boxOf(page: Page, selector: string): Promise<Box> {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `sin caja para ${selector}`).not.toBeNull()
  return box!
}

const round = (value: number) => Number(value.toFixed(1))

/**
 * Envolvente de TODO lo que la mesa dibuja: cartas del arco y de la mano. Es lo
 * que decide si algo invade el carril o se sale por la izquierda; la caja del
 * contenedor no lo diría, porque las cartas están en absoluto y pueden
 * desbordarla.
 */
async function drawnCards(page: Page) {
  return page.evaluate(
    ({ slotSelector, fanSelector }) => {
      const nodes = [
        ...Array.from(document.querySelectorAll(slotSelector)),
        ...Array.from(document.querySelectorAll(fanSelector)),
      ] as HTMLElement[]
      const visible = nodes.filter((node) => {
        const style = getComputedStyle(node)
        return style.visibility !== 'hidden' && style.opacity !== '0'
      })
      if (visible.length === 0) return null
      const rects = visible.map((node) => node.getBoundingClientRect())
      return {
        count: visible.length,
        left: Math.round(Math.min(...rects.map((rect) => rect.left))),
        right: Math.round(Math.max(...rects.map((rect) => rect.right))),
        top: Math.round(Math.min(...rects.map((rect) => rect.top))),
        bottom: Math.round(Math.max(...rects.map((rect) => rect.bottom))),
      }
    },
    { slotSelector: SLOT, fanSelector: FAN_SLOT },
  )
}

async function measure(page: Page, label: string) {
  await settle(page)

  const shell = await boxOf(page, '[data-testid="operational-shell"]')
  const main = await boxOf(page, '[data-testid="shell-main"]')
  const kpi = await boxOf(page, '[data-testid="shell-region-action"]')
  const top = await boxOf(page, '[data-testid="shell-top"]')
  const stage = await boxOf(page, '[data-testid="shell-stage"]')
  const bottom = await boxOf(page, '[data-testid="shell-bottom"]')
  const drawn = await drawnCards(page)

  const cardWidth = await page.evaluate(() => {
    const table = document.querySelector('[data-testid="coordination-table"]')
    if (!table) return null
    const slot = table.querySelector(
      '[data-testid="coordination-table-slot"]',
    ) as HTMLElement | null
    return slot ? Math.round(slot.getBoundingClientRect().width * 10) / 10 : null
  })

  const measurement = {
    label,
    viewport: page.viewportSize(),
    shell: { x: round(shell.x), y: round(shell.y), width: round(shell.width), height: round(shell.height) },
    main: { x: round(main.x), width: round(main.width), height: round(main.height) },
    kpi: { x: round(kpi.x), width: round(kpi.width), height: round(kpi.height) },
    top: { y: round(top.y), height: round(top.height) },
    stage: { x: round(stage.x), y: round(stage.y), width: round(stage.width), height: round(stage.height) },
    bottom: { y: round(bottom.y), height: round(bottom.height) },
    /** Ancho del SLOT, que es el ancho de carta sin la sangría del giro. */
    slotWidth: cardWidth,
    cards: drawn,
    kpiLeftEdge: round(kpi.x),
    ratios: {
      main: round((main.width / shell.width) * 100),
      kpi: round((kpi.width / shell.width) * 100),
    },
    routeScrollShift: await page.evaluate(() => {
      const host = document.querySelector('.novex-os-deck__content')
      if (!host) return null
      return {
        scrollTop: Math.round(host.scrollTop),
        overflow: host.scrollHeight - host.clientHeight,
      }
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

  console.log(`SHELL ${JSON.stringify(measurement)}`)
  return measurement
}

/** La condición que da sentido a la fase: la mesa vive dentro de su banda. */
function expectInsideStage(measurement: {
  cards: { left: number; right: number } | null
  stage: { x: number; width: number }
  kpiLeftEdge: number
}) {
  expect(measurement.cards).not.toBeNull()
  // Ni una carta se mete en el carril de indicadores.
  expect(measurement.cards!.right).toBeLessThan(measurement.kpiLeftEdge)
  // Ni se sale por el borde izquierdo de su zona.
  expect(measurement.cards!.left).toBeGreaterThanOrEqual(
    measurement.stage.x - 1,
  )
}

/** Dónde cae el personaje respecto a su región y a la banda de la baraja. */
async function measureCharacter(page: Page, label: string) {
  await settle(page)

  const region = await boxOf(page, '[data-testid="shell-region-character"]')
  const figure = await boxOf(page, '.direction-character__figure')
  const summary = await boxOf(page, '[data-testid="direction-summary"]')
  const stage = await boxOf(page, '[data-testid="shell-stage"]')

  const measurement = {
    label,
    region: {
      top: round(region.y),
      bottom: round(region.y + region.height),
      width: round(region.width),
      height: round(region.height),
    },
    figure: {
      top: round(figure.y),
      bottom: round(figure.y + figure.height),
      width: round(figure.width),
      height: round(figure.height),
    },
    summary: {
      top: round(summary.y),
      bottom: round(summary.y + summary.height),
      height: round(summary.height),
    },
    stageTop: round(stage.y),
    orientation: await page
      .getByTestId('direction-character')
      .getAttribute('data-orientation'),
    interaction: await page
      .getByTestId('direction-character')
      .getAttribute('data-interaction'),
  }

  console.log(`CHARACTER ${JSON.stringify(measurement)}`)
  return measurement
}

async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.locator(PANEL)).toHaveAttribute('data-code', code)
  await settle(page)
}

test.describe('shell del Centro · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('la escena tiene sus regiones y la mesa vive dentro de su banda', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    // Las regiones existen como superficies reales.
    /*
     * Regiones de la fase 2: el detalle dejó de tener región propia —vive en el
     * panel derecho— y el carril de indicadores desapareció. Lo que se sigue
     * comprobando es que las CUATRO regiones de la escena existan y sean
     * visibles, que es lo que esta prueba protegía.
     */
    for (const region of [
      'character',
      'my-reports',
      'coordination-problems',
      'action',
    ]) {
      await expect(page.getByTestId(`shell-region-${region}`)).toBeVisible()
    }
    await expect(page.getByTestId('shell-main')).toBeVisible()
    await expect(page.getByTestId('shell-stage')).toBeVisible()
    await expect(page.getByTestId('shell-bottom')).toBeVisible()

    const global = await measure(page, 'GLOBAL 1440')
    await expect(page.locator(CARD)).toHaveCount(9)
    expectInsideStage(global)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)
    expect(global.routeScrollShift!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-1-global-1440x900.png'),
      fullPage: false,
    })
  })

  test('la composición simple no invade el carril', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await select(page, 'coord-b2b')
    const simple = await measure(page, 'SIMPLE_SELECTED 1440')

    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator(`${SLOT}[data-state="dimmed"]`)).toHaveCount(8)
    await expect(page.getByTestId('return-to-table')).toBeVisible()
    expectInsideStage(simple)
    expect(simple.overflow.x).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-2-simple-1440x900.png'),
      fullPage: false,
    })
  })

  test('el mazo y su mano no invaden el carril', async ({ page }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await select(page, PARENT)
    const deck = await measure(page, 'DECK_SELECTED padre 1440')

    await expect(page.locator(FAN_SLOT)).toHaveCount(5)
    await expect(page.locator(`${SLOT}[inert]`)).toHaveCount(8)
    expectInsideStage(deck)
    expect(deck.overflow.x).toBeLessThanOrEqual(0)
    expect(deck.routeScrollShift!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-3-deck-parent-1440x900.png'),
      fullPage: false,
    })

    await page
      .locator(`${FAN_SLOT}[data-code="coord-ingenierias"] button`)
      .click()
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )
    const child = await measure(page, 'DECK_SELECTED hija 1440')
    expectInsideStage(child)
    expect(child.routeScrollShift!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-4-deck-child-1440x900.png'),
      fullPage: false,
    })
  })

  /**
   * EL PERSONAJE VIVE EN SU REGIÓN.
   *
   * Mientras compartía columna con la mesa tenía que ceder alto cada vez que
   * se observaba una coordinación, y la subbaraja abierta llegaba a rozar la
   * lectura institucional. Con sitio propio eso deja de ser una calibración y
   * pasa a ser geometría: la figura no puede bajar a la banda de la baraja
   * porque no comparte espacio con ella en ningún estado.
   */
  test('el personaje vive en su región y no en la banda de la baraja', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    // Una sola instancia visible, y una sola región aria-live.
    await expect(page.getByTestId('direction-character')).toHaveCount(1)
    await expect(page.getByTestId('direction-summary')).toHaveCount(1)
    await expect(
      page.locator(
        '[data-testid="shell-region-character"] [data-testid="direction-character"]',
      ),
    ).toHaveCount(1)
    await expect(
      page.locator(
        '[data-testid="shell-region-character"] [data-testid="direction-summary"]',
      ),
    ).toHaveCount(1)

    const inGlobal = await measureCharacter(page, 'GLOBAL')

    await page.screenshot({
      path: testInfo.outputPath('shell-7-character-1440x900.png'),
      fullPage: false,
    })

    await select(page, 'coord-b2b')
    const inSimple = await measureCharacter(page, 'SIMPLE_SELECTED')

    await page.getByTestId('return-to-table').click()
    await expect(page.locator(PANEL)).toHaveCount(0)
    await select(page, PARENT)
    const inDeck = await measureCharacter(page, 'DECK_SELECTED')

    await page.screenshot({
      path: testInfo.outputPath('shell-8-character-deck-1440x900.png'),
      fullPage: false,
    })

    for (const state of [inGlobal, inSimple, inDeck]) {
      // La figura cabe en su región: no la desborda por arriba ni por abajo.
      expect(state.figure.top).toBeGreaterThanOrEqual(state.region.top - 1)
      expect(state.figure.bottom).toBeLessThanOrEqual(state.region.bottom + 1)
      // Y no baja a la banda de la baraja en ningún estado.
      expect(state.figure.bottom).toBeLessThanOrEqual(state.stageTop)
      expect(state.summary.bottom).toBeLessThanOrEqual(state.stageTop)
    }

    /*
     * Y NO SE ENCOGE al observar una coordinación. Antes cedía alto porque el
     * panel y la mesa se lo pedían; ahora su alto sale de una región que no
     * cambia de tamaño con la selección, así que la presencia del anfitrión
     * deja de depender de lo que esté pasando en la mesa.
     */
    expect(inSimple.figure.height).toBeCloseTo(inGlobal.figure.height, 0)
    expect(inDeck.figure.height).toBeCloseTo(inGlobal.figure.height, 0)
  })

  test('volver a la mesa global restaura su geometría', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const before = await measure(page, 'GLOBAL antes')

    await select(page, 'coord-b2b')
    await page.getByTestId('return-to-table').click()
    await expect(page.locator(PANEL)).toHaveCount(0)

    /*
     * El puntero se retira de la mesa antes de medir, y no para evitar un
     * fallo: para medir la GEOMETRÍA EN REPOSO, que es de lo que habla este
     * test. Al desaparecer la acción de retorno, el puntero que la pulsó queda
     * sobre el arco, y ahí la carta señalada se eleva —es lo que debe hacer—,
     * de modo que lo medido sería una mesa con un mazo levantado.
     *
     * Deja además fuera un peligro conocido y ajeno a esta fase: si el puntero
     * cae en la franja baja de una carta con subordinaciones, la elevación la
     * saca de debajo del cursor, la carta vuelve a bajar y el ciclo se repite.
     * Está reportado; no se enmascara aquí, se aparta.
     */
    await page.mouse.move(5, 5)

    const after = await measure(page, 'GLOBAL restaurado')

    /*
     * El tamaño de carta se deduce del contenedor, y el contenedor cambia de
     * ancho al entrar y salir de la composición simple. La comprobación que
     * importa es que al volver se llegue EXACTAMENTE a la misma mesa: un
     * destino calculado con el ancho anterior dejaría el arco descolocado.
     */
    expect(after.slotWidth).toBeCloseTo(before.slotWidth!, 0)
    expect(after.cards!.left).toBeCloseTo(before.cards!.left, -0.5)
    expect(after.cards!.right).toBeCloseTo(before.cards!.right, -0.5)
    expectInsideStage(after)
  })
})

test.describe('shell del Centro · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('la misma escena escala sin invadir el carril', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const global = await measure(page, 'GLOBAL 1920')
    expectInsideStage(global)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-5-global-1920x1080.png'),
      fullPage: false,
    })

    await select(page, PARENT)
    await page
      .locator(`${FAN_SLOT}[data-code="coord-ingenierias"] button`)
      .click()
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )
    const child = await measure(page, 'DECK_SELECTED hija 1920')
    expectInsideStage(child)
    expect(child.routeScrollShift!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('shell-6-deck-child-1920x1080.png'),
      fullPage: false,
    })
  })
})
