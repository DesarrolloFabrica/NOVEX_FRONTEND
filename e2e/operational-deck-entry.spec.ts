import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * ENTRADA AL MAZO: la mesa se retira y queda el mazo origen.
 *
 * Comprueba la composición de DECK_SELECTED tal y como la resuelve el navegador:
 * quién se queda, quién se va, quién sigue siendo alcanzable con el teclado y
 * dónde acaba cada pieza. Las hijas siguen cerradas en esta fase, así que aquí
 * no se comprueba ningún abanico.
 *
 * Fichero propio, como la composición simple: son dos escenas distintas y un
 * fallo debe decir de inmediato cuál de las dos se rompió.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const SLOT = '[data-testid="coordination-table-slot"]'
const PANEL = '[data-testid="coordination-problem-panel"]'
const PEEK = '[data-testid="coordination-deck-peek"]'
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

async function openExperience(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await waitForCardArt(page)
}

/** Las caras ilustradas pesan y se piden las nueve a la vez: sin esto, una
 *  captura en frío sale con las cartas vacías. */
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

/** Posición y opacidad de cada slot. Se lee una vez tras asentarse, para que
 *  la medición no caiga en el mismo fotograma que la última transición. */
async function sceneSignature(page: Page): Promise<string> {
  return page.evaluate((slotSelector) => {
    const slots = Array.from(
      document.querySelectorAll(slotSelector),
    ) as HTMLElement[]
    return slots
      .map((slot) => {
        const rect = slot.getBoundingClientRect()
        return `${Math.round(rect.x)}:${Math.round(rect.y)}:${getComputedStyle(slot).opacity}`
      })
      .join('|')
  }, SLOT)
}

async function settle(page: Page) {
  await waitForCardArt(page)

  /*
   * Se espera a que no quede ninguna TRANSICIÓN en marcha, no a que dos
   * lecturas de posición coincidan.
   *
   * La diferencia importa porque el mazo se asienta con 90 ms de espera: durante
   * ese hueco nada se mueve todavía, así que dos muestras seguidas salían
   * idénticas y la medición se tomaba con el padre aún en su hueco del arco
   * —medido: centro en 549 en vez de 210—. Una transición en su fase de espera
   * sigue contando como `running`, de modo que esta condición sí la ve.
   *
   * Se filtran solo las transiciones: el aura de una coordinación crítica es una
   * animación en bucle y nunca terminaría.
   */
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .every((animation) => animation.playState !== 'running'),
    undefined,
    { timeout: 10_000 },
  )

  // Una muestra final para que la medición no caiga en el mismo fotograma en
  // que termina la última transición.
  await sceneSignature(page)
}

/**
 * El preview decorativo de la subbaraja se abre al señalar al padre.
 *
 * Se sondea la posición del canto en vez de esperar un plazo fijo: lo que se
 * afirma es que la subbaraja SUBE, no cuánto tarda. Con una espera fija, una
 * máquina cargada lee el canto todavía cerrado y el fallo no dice nada sobre el
 * producto.
 */
async function expectPreviewOpens(page: Page) {
  const peek = page.locator(PEEK).first()
  const closed = (await peek.boundingBox())!.y

  await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
  await expect
    .poll(async () => (await peek.boundingBox())!.y, { timeout: 5_000 })
    .toBeLessThan(closed - 10)
}

async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.locator(PANEL)).toHaveAttribute('data-code', code)
  await settle(page)
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

/** Cartas que un usuario puede alcanzar: ni ocultas ni retiradas del foco. */
async function reachableCards(page: Page): Promise<string[]> {
  return page.evaluate((cardSelector) => {
    const cards = Array.from(
      document.querySelectorAll(cardSelector),
    ) as HTMLElement[]
    return cards
      .filter((card) => {
        const style = getComputedStyle(card)
        if (style.visibility === 'hidden' || style.opacity === '0') return false
        // `inert` en un ancestro retira el subárbol entero del tabulador.
        if (card.closest('[inert]')) return false
        // Las cartas de la MANO no son de la mesa: tienen su propio fichero.
        return !card.closest('[data-testid="coordination-deck-fan-slot"]')
      })
      .map((card) => card.dataset.code ?? '')
  }, CARD)
}

/** Recorrido REAL del tabulador dentro de la mesa. */
async function tabbableCards(page: Page): Promise<string[]> {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  const visited: string[] = []

  for (let step = 0; step < 25; step += 1) {
    await page.keyboard.press('Tab')
    const code = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      if (!active) return null
      const card = active.closest('[data-testid="coordination-card"]')
      return card ? ((card as HTMLElement).dataset.code ?? null) : null
    })
    if (code && !visited.includes(code)) visited.push(code)
  }

  return visited
}

async function measure(page: Page, label: string) {
  await settle(page)
  const viewport = page.viewportSize()!
  const shell = await boxOf(page, '[data-testid="operational-cards-experience"]')
  const composition = await boxOf(page, '[data-testid="operational-composition"]')
  const table = await boxOf(page, '[data-testid="coordination-table"]')
  const character = await boxOf(page, '[data-testid="direction-character"]')
  const panel = (await page.locator(PANEL).count())
    ? await boxOf(page, PANEL)
    : null
  const parent = (await page.locator(`${SLOT}[data-deck-role="origin"]`).count())
    ? await boxOf(page, `${SLOT}[data-deck-role="origin"]`)
    : null

  const round = (value: number) => Number(value.toFixed(1))

  const measurement = {
    label,
    viewport,
    shell: { x: shell.x, y: round(shell.y), width: shell.width, height: round(shell.height) },
    composition: {
      x: composition.x,
      y: round(composition.y),
      width: round(composition.width),
      height: round(composition.height),
    },
    table: { x: table.x, y: round(table.y), width: round(table.width), height: round(table.height) },
    parentCard: parent && {
      x: round(parent.x),
      y: round(parent.y),
      width: round(parent.width),
      height: round(parent.height),
      centerX: round(parent.x + parent.width / 2),
      centerY: round(parent.y + parent.height / 2),
    },
    /** Hueco entre el mazo y el borde derecho de su columna: ahí irá la mano. */
    gapParentToFutureHand: parent
      ? round(composition.x + composition.width - (parent.x + parent.width))
      : null,
    panel: panel && {
      x: round(panel.x),
      y: round(panel.y),
      width: round(panel.width),
      height: round(panel.height),
    },
    character: {
      x: round(character.x),
      centerX: round(character.x + character.width / 2),
      width: round(character.width),
      height: round(character.height),
    },
    visibleTopLevelCards: (await reachableCards(page)).length,
    decorativeChildPeeks: await page.locator(PEEK).count(),
    overflow: await page.evaluate(() => ({
      x:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      y:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    })),
  }

  console.log(`MEASURE ${JSON.stringify(measurement)}`)
  return measurement
}

test.describe('entrada al mazo · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('D1 · la mesa global sigue intacta y con su preview de subbaraja', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'GLOBAL')
    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator(`${SLOT}[data-deck-role]`)).toHaveCount(0)
    expect(await reachableCards(page)).toHaveLength(9)

    // El preview decorativo del padre sigue abriéndose en reposo: es la
    // affordance que dice «esta carta contiene algo», y no se toca.
    await expectPreviewOpens(page)

    await page.mouse.move(5, 5)
    await page.waitForTimeout(350)
    await measure(page, 'GLOBAL')
    await page.screenshot({
      path: testInfo.outputPath('deck-a-global-1440x900.png'),
      fullPage: false,
    })
  })

  test('D2 · escoger el mazo retira la mesa y deja el origen', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const global = await measure(page, 'GLOBAL (referencia)')

    await select(page, PARENT)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')

    const deck = await measure(page, 'DECK_SELECTED')

    // UNA sola carta principal en escena, y es el padre.
    expect(await reachableCards(page)).toEqual([PARENT])
    await expect(page.locator(`${SLOT}[data-deck-role="origin"]`)).toHaveCount(1)
    await expect(page.locator(`${SLOT}[data-deck-role="retired"]`)).toHaveCount(8)
    // Las ocho siguen montadas: volver no reconstruye nada.
    await expect(page.locator(SLOT)).toHaveCount(9)
    await expect(
      page.locator(`${CARD}[data-code="${PARENT}"]`),
    ).toHaveAttribute('aria-pressed', 'true')

    // MAZO ORIGEN: a la izquierda de su columna, con sitio libre a su derecha
    // para la mano que aún no se reparte, y sin pegarse al borde.
    expect(deck.parentCard!.centerX).toBeLessThan(
      deck.composition.x + deck.composition.width / 2,
    )
    expect(deck.parentCard!.x).toBeGreaterThan(deck.composition.x + 20)
    expect(deck.gapParentToFutureHand!).toBeGreaterThan(
      deck.parentCard!.width * 3,
    )
    // Y se movió de verdad respecto a su hueco del arco.
    expect(deck.parentCard!.centerX).not.toBeCloseTo(global.composition.width / 2, 0)

    // El mazo sigue leyéndose como mazo: sus cinco cantos siguen detrás.
    await expect(page.locator(PEEK)).toHaveCount(5)
    await expect(page.locator(`${PEEK}[aria-hidden="true"]`)).toHaveCount(5)
    await expect(page.locator(`${PEEK} button`)).toHaveCount(0)

    // Panel en el carril derecho, no colgando de la carta.
    expect(deck.panel!.x).toBeGreaterThan(deck.table.x + deck.table.width - 1)
    expect(deck.panel!.y).toBeLessThan(deck.table.y + deck.table.height)
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)

    // Todavía no hay retorno narrativo propio del mazo.
    await expect(page.getByTestId('return-to-table')).toHaveCount(0)

    expect(deck.overflow.x).toBeLessThanOrEqual(0)
    expect(deck.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('deck-b-deck-1440x900.png'),
      fullPage: false,
    })
  })

  test('D2b · ninguna carta retirada sigue siendo alcanzable con el teclado', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    // En reposo el tabulador recorre las nueve.
    expect(await tabbableCards(page)).toHaveLength(9)

    await select(page, PARENT)

    // Con el mazo escogido, solo el padre. Una carta invisible que siguiera
    // recibiendo el foco dejaría al usuario de teclado en un sitio que no ve.
    // Solo el padre entre las principales, y a continuación su mano: las ocho
    // retiradas no aparecen.
    expect(await tabbableCards(page)).toEqual([
      PARENT,
      'coord-bellas-artes',
      'coord-empresarial',
      'coord-ingenierias',
      'coord-transversales',
      'coord-negocios',
    ])
    await expect(page.locator(`${SLOT}[inert]`)).toHaveCount(8)
  })

  test('D3 · de composición simple a mazo, sin pasar por la mesa global', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-b2b')
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'SIMPLE_SELECTED')
    const simple = await measure(page, 'SIMPLE_SELECTED coord-b2b')
    await page.screenshot({
      path: testInfo.outputPath('deck-c-simple-1440x900.png'),
      fullPage: false,
    })

    await select(page, PARENT)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
    const deck = await measure(page, 'DECK_SELECTED desde simple')

    // El carril no se movió ni se desmontó por el camino: mismo sitio, mismo
    // ancho, y el contenido cambió de coordinación.
    expect(deck.panel!.x).toBeCloseTo(simple.panel!.x, 0)
    expect(deck.panel!.width).toBeCloseTo(simple.panel!.width, 0)
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)

    // Y la mesa simple se convirtió en mazo: ocho fuera, una en escena.
    expect(await reachableCards(page)).toEqual([PARENT])
    await expect(page.getByTestId('return-to-table')).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('deck-d-simple-to-deck-1440x900.png'),
      fullPage: false,
    })
  })

  test('D4 · volver a la Dirección restaura la mesa entera', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const before = await measure(page, 'GLOBAL (antes)')

    await select(page, PARENT)
    // Mientras no exista «Recoger mazo», el retorno disponible es la miga.
    await page.getByTestId('breadcrumb-direction').click()

    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'GLOBAL')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator(`${SLOT}[data-deck-role]`)).toHaveCount(0)
    await expect(page.locator(`${SLOT}[inert]`)).toHaveCount(0)

    const after = await measure(page, 'GLOBAL (restaurado)')

    // Las nueve vuelven, a su arco y a su sitio, y el personaje al suyo.
    expect(await reachableCards(page)).toHaveLength(9)
    expect(after.table.width).toBeCloseTo(before.table.width, 0)
    expect(after.character.centerX).toBeCloseTo(before.character.centerX, 0)

    // Y el preview de subbaraja vuelve a funcionar: la mesa global recupera su
    // affordance completa, no solo su dibujo.
    await expectPreviewOpens(page)

    await page.mouse.move(5, 5)
    await page.waitForTimeout(350)
    await page.screenshot({
      path: testInfo.outputPath('deck-e-global-restored-1440x900.png'),
      fullPage: false,
    })
  })

  test('D5 · con teclado se llega exactamente al mismo mazo', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="${PARENT}"]`).focus()
    await page.keyboard.press('Enter')

    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
    await settle(page)

    expect(await reachableCards(page)).toEqual([PARENT])
    await expect(page.locator(`${SLOT}[data-deck-role="retired"]`)).toHaveCount(8)

    // El foco no se queda en una carta que acaba de salir de escena.
    const focusedInsideRetired = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[inert]')),
    )
    expect(focusedInsideRetired).toBe(false)
  })

  test('D6 · movimiento reducido llega al mismo mazo sin recorrido', async ({
    page,
  }) => {
    test.slow()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, PARENT)

    const durations = await page.evaluate((slotSelector) => {
      const slots = Array.from(
        document.querySelectorAll(slotSelector),
      ) as HTMLElement[]
      return slots.map((slot) => {
        const style = getComputedStyle(slot)
        return {
          duration: Number.parseFloat(style.transitionDuration),
          delay: Number.parseFloat(style.transitionDelay),
        }
      })
    }, SLOT)
    expect(durations).toHaveLength(9)
    expect(durations.every((value) => value.duration < 0.01)).toBe(true)
    expect(durations.every((value) => value.delay < 0.01)).toBe(true)

    const deck = await measure(page, 'DECK_SELECTED movimiento reducido')
    expect(await reachableCards(page)).toEqual([PARENT])
    expect(deck.parentCard!.centerX).toBeLessThan(
      deck.composition.x + deck.composition.width / 2,
    )
    expect(deck.overflow.x).toBeLessThanOrEqual(0)
    expect(deck.overflow.y).toBeLessThanOrEqual(0)
  })
})

test.describe('entrada al mazo · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('D7 · la misma composición de mazo escala sin desbordar', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, PARENT)
    const deck = await measure(page, 'DECK_SELECTED 1920')

    expect(await reachableCards(page)).toEqual([PARENT])
    expect(deck.parentCard!.centerX).toBeLessThan(
      deck.composition.x + deck.composition.width / 2,
    )
    expect(deck.gapParentToFutureHand!).toBeGreaterThan(
      deck.parentCard!.width * 3,
    )
    expect(deck.panel!.x).toBeGreaterThan(deck.table.x + deck.table.width - 1)
    expect(deck.panel!.x + deck.panel!.width).toBeLessThanOrEqual(
      deck.shell.x + deck.shell.width + 1,
    )
    expect(deck.overflow.x).toBeLessThanOrEqual(0)
    expect(deck.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('deck-f-deck-1920x1080.png'),
      fullPage: false,
    })
  })
})
