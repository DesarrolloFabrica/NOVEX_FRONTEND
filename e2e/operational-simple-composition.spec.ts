import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * COMPOSICIÓN SIMPLE: la mesa entera, con un nodo bajo observación.
 *
 * Vive en su propio fichero porque comprueba la GEOMETRÍA DE LA ESCENA, no la
 * selección: qué ocupa el escenario, cuánto mide el arco y qué se restaura al
 * volver. La selección en sí —peticiones, caché, aria-pressed, lista por
 * coordinación— ya tiene su fichero y no se repite aquí.
 *
 * Hasta F2 este fichero medía una COMPRESIÓN: la mesa cedía ancho a un carril
 * donde vivía el panel de LEVEL 1. Ese carril desapareció al mudarse la lectura
 * de problemas a su región del shell, así que lo que se afirma ahora es lo
 * contrario: que observar una coordinación NO mueve la mesa.
 *
 * Todas las cotas se miden en el navegador. La hoja de estilos deduce el tamaño
 * de carta del ancho real de la columna, así que un cálculo sobre el CSS no
 * demostraría nada: hay que preguntarle al layout resuelto.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const SLOT = '[data-testid="coordination-table-slot"]'
const PANEL = '[data-testid="coordination-problem-list"]'

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

/**
 * Problemas para las dos coordinaciones simples del recorrido. Se sirven a
 * cualquier `coordinationId` que los pida: aquí lo que se mide es la
 * composición, y un panel vacío no ejerce presión sobre el carril.
 */
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

async function openExperience(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
}

async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.locator(PANEL)).toHaveAttribute('data-code', code)
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

async function overflow(page: Page) {
  return page.evaluate(() => ({
    x:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    y:
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight,
  }))
}

/** Ancho del ARCO dibujado, no de la caja de la mesa: es lo que se comprime. */
async function arcWidth(page: Page): Promise<number> {
  return page.evaluate((slotSelector) => {
    const slots = Array.from(
      document.querySelectorAll(slotSelector),
    ) as HTMLElement[]
    const rects = slots.map((slot) => slot.getBoundingClientRect())
    const left = Math.min(...rects.map((rect) => rect.left))
    const right = Math.max(...rects.map((rect) => rect.right))
    return right - left
  }, SLOT)
}

/**
 * Espera a que las caras ilustradas estén cargadas.
 *
 * Los assets de las CoordCards pesan decenas de megas y las nueve se piden a la
 * vez, así que una captura tomada al abrir la escena en frío sale con las
 * cartas vacías: bordes, auras y píldoras en su sitio, pero sin arte. La
 * geometría no depende de ello —el hueco de la cara lo fija el CSS—, pero la
 * evidencia visual sí, y una captura sin arte no permite juzgar la composición.
 *
 * `Servicio` ya tiene cara propia (`servicio.png`); se espera a todas las
 * caras presentes en el DOM, no a un número fijo.
 */
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

/**
 * Espera a que la mesa deje de moverse.
 *
 * El regreso al estado global sí anima el transform de los slots durante 220 ms,
 * así que medir justo después devolvería una geometría intermedia. Se sondea el
 * ancho del arco hasta que dos lecturas seguidas coinciden, que es la condición
 * real que interesa y no una espera fija atada a la duración de hoy.
 */
async function settle(page: Page) {
  await waitForCardArt(page)
  let previous = Number.NaN

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const current = await arcWidth(page)
    if (Math.abs(current - previous) < 0.5) return
    previous = current
    await page.waitForTimeout(60)
  }
}

/**
 * Cotas de la composición, tal y como las resuelve el navegador. Se imprimen
 * para poder juzgar la calibración con números reales y se afirman a
 * continuación: la evidencia y la guardia son la misma medición.
 */
async function measure(page: Page, label: string) {
  await settle(page)
  const viewport = page.viewportSize()!
  const shell = await boxOf(page, '[data-testid="operational-cards-experience"]')
  const composition = await boxOf(page, '[data-testid="operational-composition"]')
  const table = await boxOf(page, '[data-testid="coordination-table"]')
  const character = await boxOf(page, '[data-testid="direction-character"]')
  const panel = await page.locator(PANEL).count()
    ? await boxOf(page, PANEL)
    : null
  const cards = await page.locator(CARD).all()
  const first = (await cards[0].boundingBox())!
  const last = (await cards[cards.length - 1].boundingBox())!
  const returnAction = (await page.getByTestId('return-to-table').count())
    ? await boxOf(page, '[data-testid="return-to-table"]')
    : null
  const selected = await page.locator(`${SLOT}[data-state="selected"]`).count()
    ? await boxOf(page, `${SLOT}[data-state="selected"]`)
    : null

  const measurement = {
    label,
    viewport,
    shell: {
      x: shell.x,
      y: Number(shell.y.toFixed(1)),
      width: shell.width,
      height: Number(shell.height.toFixed(1)),
      bottom: Number((shell.y + shell.height).toFixed(1)),
    },
    composition: {
      x: composition.x,
      y: Number(composition.y.toFixed(1)),
      width: composition.width,
      height: Number(composition.height.toFixed(1)),
    },
    /*
     * VACÍO INFERIOR. Definición estable: desde el borde inferior del contenido
     * más bajo de la columna izquierda —el retorno si existe, y si no la mesa—
     * hasta el borde inferior de la escena. Es lo que se percibe como escenario
     * muerto, y no depende de dónde acabe el carril del panel, que tiene su
     * propia altura.
     */
    emptyBelow: Number(
      (
        shell.y +
        shell.height -
        (returnAction
          ? returnAction.y + returnAction.height
          : table.y + table.height)
      ).toFixed(1),
    ),
    returnAction: returnAction && {
      y: Number(returnAction.y.toFixed(1)),
      height: Number(returnAction.height.toFixed(1)),
      centerX: Number((returnAction.x + returnAction.width / 2).toFixed(1)),
    },
    table: {
      x: Number(table.x.toFixed(1)),
      y: Number(table.y.toFixed(1)),
      width: Number(table.width.toFixed(1)),
      height: Number(table.height.toFixed(1)),
    },
    arcWidth: Number((await arcWidth(page)).toFixed(1)),
    panel: panel && {
      x: Number(panel.x.toFixed(1)),
      y: Number(panel.y.toFixed(1)),
      width: Number(panel.width.toFixed(1)),
      height: Number(panel.height.toFixed(1)),
    },
    gapTableToPanel: panel
      ? Number((panel.x - (table.x + table.width)).toFixed(1))
      : null,
    selectedCard: selected && {
      x: Number(selected.x.toFixed(1)),
      y: Number(selected.y.toFixed(1)),
      width: Number(selected.width.toFixed(1)),
      height: Number(selected.height.toFixed(1)),
    },
    firstCard: { x: Number(first.x.toFixed(1)), width: Number(first.width.toFixed(1)) },
    lastCard: { x: Number(last.x.toFixed(1)), width: Number(last.width.toFixed(1)) },
    character: {
      x: Number(character.x.toFixed(1)),
      centerX: Number((character.x + character.width / 2).toFixed(1)),
      width: Number(character.width.toFixed(1)),
      height: Number(character.height.toFixed(1)),
    },
    overflow: await overflow(page),
  }

  console.log(`MEASURE ${JSON.stringify(measurement)}`)
  return measurement
}

test.describe('composición simple · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('la escena global no reserva carril y la mesa ocupa el ancho', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const scene = page.getByTestId('operational-cards-experience')
    await expect(scene).toHaveAttribute('data-composition-mode', 'GLOBAL')
    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator(PANEL)).toHaveCount(0)

    const global = await measure(page, 'GLOBAL')
    // Sin carril, el arco usa casi todo el ancho de la escena.
    expect(global.arcWidth / global.shell.width).toBeGreaterThan(0.9)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('simple-c1-global-1440x900.png'),
      fullPage: false,
    })
  })

  test('B2B usa la mesa entera y lee sus problemas en la región', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const global = await measure(page, 'GLOBAL (referencia)')

    await select(page, 'coord-b2b')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'SIMPLE_SELECTED')

    // Las nueve siguen en la mesa: ni una se retira ni deja de ser objetivo.
    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator(`${SLOT}[data-state="selected"]`)).toHaveCount(1)
    await expect(page.locator(`${SLOT}[data-state="dimmed"]`)).toHaveCount(8)
    await expect(
      page.locator(`${CARD}[data-code="coord-b2b"]`),
    ).toHaveAttribute('aria-pressed', 'true')

    const simple = await measure(page, 'SIMPLE_SELECTED coord-b2b')

    /*
     * LA MESA YA NO SE COMPRIME, y esa es la consecuencia visible de la fase.
     *
     * La compresión existía para abrir un carril a la derecha donde cabía el
     * panel de LEVEL 1. Esa lectura vive ahora en la región de problemas, así
     * que no hay segunda columna que financiar: observar una coordinación deja
     * la mesa exactamente donde estaba, con el mismo arco y el mismo tamaño de
     * carta que en reposo. Es igualdad, no una banda de tolerancia: el ancho
     * de carta sale del ancho del contenedor, y el contenedor no cambia.
     */
    expect(simple.arcWidth).toBeCloseTo(global.arcWidth, 1)
    expect(simple.firstCard.width).toBeCloseTo(global.firstCard.width, 1)
    expect(simple.arcWidth / simple.shell.width).toBeGreaterThan(0.9)

    /*
     * BALANCE VERTICAL. La escena observada no puede quedarse notablemente más
     * baja que la global: esa diferencia era lo que se leía como escenario
     * abandonado debajo de las cartas.
     */
    expect(simple.shell.height / global.shell.height).toBeGreaterThan(0.92)

    /*
     * NO HAY CARRIL INTERNO. La lectura de problemas está ARRIBA, en su
     * región: por encima de la banda de la baraja, no a un lado de la mesa.
     * Si alguna vez volviera a caer dentro del escenario, esta cota lo dice.
     */
    expect(simple.panel).not.toBeNull()
    expect(simple.panel!.y + simple.panel!.height).toBeLessThanOrEqual(
      simple.shell.y + 1,
    )
    await expect(page.getByTestId("coordination-panel-lane")).toHaveCount(0)
    await expect(
      page.locator(
        '[data-testid="operational-cards-experience"] [data-testid="coordination-problem-list"]',
      ),
    ).toHaveCount(0)

    /*
     * EL PERSONAJE YA NO SE REENCUADRA, y no es una pérdida: es la mudanza.
     *
     * Mientras vivía dentro de la columna de la mesa, estrecharla lo
     * recentraba sobre las cartas. Ahora tiene región propia en el shell, así
     * que componer una coordinación simple no lo mueve ni un píxel: el
     * anfitrión de la escena deja de depender de lo que pase en la mesa, que
     * es justamente lo que se buscaba al darle sitio fijo.
     */
    expect(simple.character.centerX).toBe(global.character.centerX)
    expect(simple.character.height).toBe(global.character.height)


    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('simple-c2-b2b-1440x900.png'),
      fullPage: false,
    })
  })

  test('el cambio directo conserva la composición y el carril', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-b2b')
    const before = await measure(page, 'SIMPLE_SELECTED coord-b2b (antes)')

    await select(page, 'coord-saber-pro')
    const after = await measure(page, 'SIMPLE_SELECTED coord-saber-pro')

    // Nunca se pasó por el estado global: el modo no cambió de valor y el panel
    // no desapareció por el camino —lo demuestra su caja, que sigue en el mismo
    // carril con el mismo ancho—.
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'SIMPLE_SELECTED')
    expect(after.panel!.x).toBeCloseTo(before.panel!.x, 0)
    expect(after.panel!.width).toBeCloseTo(before.panel!.width, 0)
    expect(after.arcWidth).toBeCloseTo(before.arcWidth, 0)

    // La selección se mudó de carta, y la mesa no se reordenó: cada carta sigue
    // donde estaba.
    await expect(
      page.locator(`${CARD}[data-code="coord-saber-pro"]`),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.locator(`${CARD}[data-code="coord-b2b"]`),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(after.firstCard.x).toBeCloseTo(before.firstCard.x, 0)
    expect(after.lastCard.x).toBeCloseTo(before.lastCard.x, 0)

    await page.screenshot({
      path: testInfo.outputPath('simple-c3-saber-pro-1440x900.png'),
      fullPage: false,
    })
  })

  test('«Volver a la mesa» restaura la composición global', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const globalBefore = await measure(page, 'GLOBAL (antes)')

    await select(page, 'coord-saber-pro')
    const action = page.getByTestId('return-to-table')
    // Es un control real, con nombre accesible propio, y pertenece a la
    // composición de la mesa: no está dentro del panel.
    await expect(action).toBeVisible()
    await expect(action).toHaveText('Volver a la mesa')
    await expect(page.locator(`${PANEL} [data-testid="return-to-table"]`)).toHaveCount(0)
    await expect(
      page.locator(
        '[data-testid="operational-composition"] [data-testid="return-to-table"]',
      ),
    ).toHaveCount(1)

    await action.click()

    // El puntero se retira antes de medir: al recuperar la mesa su ancho, la
    // carta que quede bajo el cursor se eleva y ensancha su caja, y lo que
    // aquí se compara es la geometría restaurada, no un hover.
    await page.mouse.move(4, 4)

    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'GLOBAL')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.getByTestId('return-to-table')).toHaveCount(0)
    await expect(page.locator(`${SLOT}[data-state="dimmed"]`)).toHaveCount(0)

    const globalAfter = await measure(page, 'GLOBAL (restaurado)')

    // La mesa vuelve EXACTAMENTE a su geometría global, y el personaje a su
    // sitio: el retorno no deja una escena a medio camino.
    expect(globalAfter.arcWidth).toBeCloseTo(globalBefore.arcWidth, 0)
    expect(globalAfter.firstCard.x).toBeCloseTo(globalBefore.firstCard.x, 0)
    expect(globalAfter.lastCard.x).toBeCloseTo(globalBefore.lastCard.x, 0)
    expect(globalAfter.character.centerX).toBeCloseTo(
      globalBefore.character.centerX,
      0,
    )

    await page.screenshot({
      path: testInfo.outputPath('simple-c4-global-restored-1440x900.png'),
      fullPage: false,
    })
  })

  test('el mazo no adopta la mesa comprimida ni el retorno simple', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-b2b')
    const simple = await measure(page, 'SIMPLE_SELECTED coord-b2b (referencia)')

    await page.getByTestId('breadcrumb-direction').click()
    await expect(page.locator(PANEL)).toHaveCount(0)

    await select(page, 'coord-operaciones-academicas')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
    await page.waitForTimeout(500)
    const deck = await measure(page, 'DECK_SELECTED coord-operaciones-academicas')

    /*
     * Las dos composiciones observadas comparten la escena de dos columnas y el
     * carril del panel. Y desde que el tamaño de carta lo decide el CONTENEDOR,
     * comparten también la unidad: las dos encajan su geometría en la misma
     * columna, así que sus cartas miden lo mismo. Antes no: el mazo tomaba la
     * unidad del viewport y salía más grande.
     *
     * Queda anotado como consecuencia medida del cambio de fuente, no como
     * objetivo: el mazo solo necesita unos cuatro anchos y medio de carta y está
     * encajando en siete y pico, que es lo que mide el arco completo. Darle su
     * propio tramo es trabajo de la fase de recalibración.
     */
    expect(deck.firstCard.width).toBeCloseTo(simple.firstCard.width, 0)
    // Lo que el mazo NO adopta es el retorno de la composición simple.
    await expect(page.getByTestId('return-to-table')).toHaveCount(0)
    // El detalle del mazo abierto vive en su propio fichero de pruebas.
  })
})

test.describe('composición simple · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('la misma composición escala sin desbordar', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await settle(page)
    const globalArc = await arcWidth(page)
    await measure(page, 'GLOBAL 1920')

    await select(page, 'coord-b2b')
    const simple = await measure(page, 'SIMPLE_SELECTED coord-b2b 1920')

    // El mismo arco que en reposo: a 1920 tampoco hay carril que financiar.
    expect(simple.arcWidth).toBeCloseTo(globalArc, 1)
    // Y la lectura de problemas sigue por encima de la banda de la baraja.
    expect(simple.panel!.y + simple.panel!.height).toBeLessThanOrEqual(
      simple.shell.y + 1,
    )
    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)
    await expect(page.locator(CARD)).toHaveCount(9)

    await page.screenshot({
      path: testInfo.outputPath('simple-c5-b2b-1920x1080.png'),
      fullPage: false,
    })
  })
})

test.describe('composición simple · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('se llega a la misma composición sin recorrido', async ({ page }) => {
    test.slow()
    // La config global no llega al navegador de forma fiable; emular aquí es la
    // técnica comprobada.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-b2b')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'SIMPLE_SELECTED')

    // La compresión viaja por el transform de los slots, que es lo único que se
    // mueve al comprimirse la mesa. Con movimiento reducido llega igual, sin
    // recorrido.
    const durations = await page.evaluate((slotSelector) => {
      const slots = Array.from(
        document.querySelectorAll(slotSelector),
      ) as HTMLElement[]
      return slots.map((slot) =>
        Number.parseFloat(getComputedStyle(slot).transitionDuration),
      )
    }, SLOT)
    expect(durations).toHaveLength(9)
    expect(durations.every((value) => value < 0.01)).toBe(true)

    const simple = await measure(page, 'SIMPLE_SELECTED reduced-motion')
    expect(simple.panel!.y + simple.panel!.height).toBeLessThanOrEqual(
      simple.shell.y + 1,
    )
    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)
  })
})
