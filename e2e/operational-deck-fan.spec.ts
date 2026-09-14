import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * LA MANO: las cinco subordinaciones repartidas, ya interactivas.
 *
 * La entrada al mazo —quién se retira, dónde se planta el padre— tiene su propio
 * fichero. Aquí se comprueba lo que ocurre DENTRO del mazo abierto: que las
 * hijas son cartas y controles de verdad, que observar una no reordena la mano y
 * que padre e hijas comparten el mismo carril de panel.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const SLOT = '[data-testid="coordination-table-slot"]'
const FAN_SLOT = '[data-testid="coordination-deck-fan-slot"]'
const PANEL = '[data-testid="coordination-problem-panel"]'
const PEEK = '[data-testid="coordination-deck-peek"]'
const PARENT = 'coord-operaciones-academicas'

/** Las cinco hijas declaradas, en el orden de producto. */
const CHILDREN = [
  'coord-bellas-artes',
  'coord-empresarial',
  'coord-ingenierias',
  'coord-transversales',
  'coord-negocios',
] as const

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

/**
 * Espera a que la escena deje de moverse: ni transiciones ni el reparto de la
 * mano, que es una animación con escalonado. Sondear posiciones no serviría —el
 * mazo se asienta tras una espera, y durante ella nada se mueve—, así que se
 * espera a que no quede ninguna en marcha. El aura de una coordinación crítica
 * se descarta: es un bucle y nunca terminaría.
 */
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

async function openExperience(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await waitForCardArt(page)
}

async function openDeck(page: Page) {
  await page.locator(`${CARD}[data-code="${PARENT}"]`).click()
  await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)
  await settle(page)
}

/** Selecciona una carta de la mano y espera a que el panel hable de ella. */
async function selectChild(page: Page, code: string) {
  await page.locator(`${FAN_SLOT}[data-code="${code}"] button`).click()
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

/** Caja de cada carta de la mano: sirve para afirmar que nadie se mueve. */
async function fanBoxes(page: Page) {
  return page.evaluate((selector) => {
    return Array.from(document.querySelectorAll(selector)).map((slot) => {
      const rect = slot.getBoundingClientRect()
      return {
        code: (slot as HTMLElement).dataset.code ?? '',
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
      }
    })
  }, FAN_SLOT)
}

/** Cartas principales que un usuario puede alcanzar. */
async function reachableCards(page: Page): Promise<string[]> {
  return page.evaluate((cardSelector) => {
    return Array.from(document.querySelectorAll(cardSelector))
      .filter((card) => {
        const element = card as HTMLElement
        const style = getComputedStyle(element)
        if (style.visibility === 'hidden' || style.opacity === '0') return false
        if (element.closest('[inert]')) return false
        return !element.closest('[data-testid="coordination-deck-fan-slot"]')
      })
      .map((card) => (card as HTMLElement).dataset.code ?? '')
  }, CARD)
}

/** Recorrido REAL del tabulador por las cartas de la escena. */
async function tabbableCards(page: Page): Promise<string[]> {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  const visited: string[] = []

  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('Tab')
    const code = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      const card = active?.closest('[data-testid="coordination-card"]')
      return card ? ((card as HTMLElement).dataset.code ?? null) : null
    })
    if (code && !visited.includes(code)) visited.push(code)
  }

  return visited
}

async function measure(page: Page, label: string) {
  await settle(page)
  const round = (value: number) => Number(value.toFixed(1))
  const composition = await boxOf(page, '[data-testid="operational-composition"]')
  const parent = await boxOf(page, `${SLOT}[data-deck-role="origin"]`)
  const panel = await boxOf(page, PANEL)
  const character = await boxOf(page, '[data-testid="direction-character"]')
  const children = await fanBoxes(page)

  const fanLeft = Math.min(...children.map((child) => child.x))
  const fanRight = Math.max(...children.map((child) => child.x + child.width))

  const measurement = {
    label,
    viewport: page.viewportSize(),
    composition: {
      x: composition.x,
      y: round(composition.y),
      width: round(composition.width),
      height: round(composition.height),
    },
    parentCard: {
      x: round(parent.x),
      y: round(parent.y),
      width: round(parent.width),
      height: round(parent.height),
    },
    children,
    fan: {
      left: fanLeft,
      right: fanRight,
      width: fanRight - fanLeft,
      centerX: round((fanLeft + fanRight) / 2),
      centerY: round(
        children.reduce((sum, child) => sum + child.y, 0) / children.length,
      ),
    },
    parentToFirstChild: round(children[0].x - (parent.x + parent.width)),
    childSpacing: children
      .slice(1)
      .map((child, index) => child.x - children[index].x),
    panel: {
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
    visibleInteractiveChildren: await page
      .locator(`${FAN_SLOT} button`)
      .count(),
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

test.describe('mano del mazo · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('E1 · abrir el mazo reparte cinco cartas reales', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.screenshot({
      path: testInfo.outputPath('fan-a-global-1440x900.png'),
      fullPage: false,
    })

    await openDeck(page)

    // Una principal en escena y cinco hijas repartidas: seis miembros.
    expect(await reachableCards(page)).toEqual([PARENT])
    await expect(page.locator(FAN_SLOT)).toHaveCount(5)
    expect((await fanBoxes(page)).map((child) => child.code)).toEqual([
      ...CHILDREN,
    ])

    // Cartas de verdad: con su arte y con su propio estado, no fichas de color.
    await expect(
      page.locator(`${FAN_SLOT} .coordination-card__face img`),
    ).toHaveCount(5)
    const statuses = await page
      .locator(`${FAN_SLOT} ${CARD}`)
      .evaluateAll((cards) =>
        cards.map((card) => (card as HTMLElement).dataset.status),
      )
    expect(new Set(statuses).size).toBeGreaterThan(1)

    // El padre sigue siendo lo observado: la mano son opciones, no lecturas.
    await expect(page.locator(`${CARD}[data-code="${PARENT}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator(`${FAN_SLOT} [aria-pressed="true"]`)).toHaveCount(0)
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)

    // La mano no se duplica con los cantos del mazo cerrado.
    await expect(page.locator(`${PEEK}:visible`)).toHaveCount(0)

    await measure(page, 'DECK_SELECTED padre observado')
    await page.screenshot({
      path: testInfo.outputPath('fan-b-parent-1440x900.png'),
      fullPage: false,
    })
  })

  test('E2 · la hija observada se queda en su sitio de la mano', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)

    const before = await fanBoxes(page)
    await selectChild(page, 'coord-ingenierias')

    // Sigue siendo el mismo mazo abierto: no se ha vuelto a una mesa simple.
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')

    // Ni la mano se reordena ni ninguna carta cambia de sitio.
    expect(await fanBoxes(page)).toEqual(before)

    await expect(
      page.locator(
        `${FAN_SLOT}[data-code="coord-ingenierias"] [aria-pressed="true"]`,
      ),
    ).toHaveCount(1)
    await expect(page.locator(`${FAN_SLOT} [aria-pressed="true"]`)).toHaveCount(1)
    await expect(page.locator(`${CARD}[data-code="${PARENT}"]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )

    await measure(page, 'DECK_SELECTED hija observada')
    await page.screenshot({
      path: testInfo.outputPath('fan-c-child-1440x900.png'),
      fullPage: false,
    })
  })

  test('E3 · de hija a hija, sin cerrar ni reabrir la mano', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)
    await selectChild(page, 'coord-ingenierias')

    const before = await fanBoxes(page)
    const panelBefore = (await boxOf(page, PANEL)).x

    await selectChild(page, 'coord-negocios')

    expect(await fanBoxes(page)).toEqual(before)
    expect((await boxOf(page, PANEL)).x).toBeCloseTo(panelBefore, 0)
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-negocios',
    )
    await expect(
      page.locator(
        `${FAN_SLOT}[data-code="coord-ingenierias"] [aria-pressed="true"]`,
      ),
    ).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('fan-d-child-switch-1440x900.png'),
      fullPage: false,
    })
  })

  test('E4 · volver al padre NO cierra la mano', async ({ page }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)
    await selectChild(page, 'coord-negocios')

    const before = await fanBoxes(page)

    // La carta del padre sigue siendo un control: es la navegación de vuelta.
    await page.locator(`${CARD}[data-code="${PARENT}"]`).click()
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)
    await settle(page)

    await expect(page.locator(FAN_SLOT)).toHaveCount(5)
    expect(await fanBoxes(page)).toEqual(before)
    await expect(page.locator(`${CARD}[data-code="${PARENT}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator(`${FAN_SLOT} [aria-pressed="true"]`)).toHaveCount(0)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')

    await page.screenshot({
      path: testInfo.outputPath('fan-e-parent-again-1440x900.png'),
      fullPage: false,
    })
  })

  test('E5 · el tabulador recorre al padre y a sus cinco hijas, y nada más', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)

    expect(await tabbableCards(page)).toEqual([PARENT, ...CHILDREN])
    await expect(page.locator(`${SLOT}[inert]`)).toHaveCount(8)
  })

  test('E6 · con teclado se observa una hija igual que con el puntero', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)

    await page
      .locator(`${FAN_SLOT}[data-code="coord-transversales"] button`)
      .focus()
    await page.keyboard.press('Enter')

    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-transversales',
    )
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
    await expect(
      page.locator(
        `${FAN_SLOT}[data-code="coord-transversales"] [aria-pressed="true"]`,
      ),
    ).toHaveCount(1)
  })

  test('E7 · volver a la Dirección recoge la mano por completo', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)
    await selectChild(page, 'coord-bellas-artes')

    await page.getByTestId('breadcrumb-direction').click()
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'GLOBAL')

    // La mano desaparece del DOM: no quedan botones invisibles.
    await expect(page.locator(FAN_SLOT)).toHaveCount(0)
    expect(await tabbableCards(page)).toHaveLength(9)
    await expect(page.locator(PANEL)).toHaveCount(0)

    // Y la mesa global recupera su preview decorativo, que sigue siendo otro
    // concepto: cinco cantos sin foco.
    const peek = page.locator(PEEK).first()
    const closed = (await peek.boundingBox())!.y
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect
      .poll(async () => (await peek.boundingBox())!.y, { timeout: 5_000 })
      .toBeLessThan(closed - 10)
  })

  test('E8 · movimiento reducido reparte la mano sin recorrido', async ({
    page,
  }) => {
    test.slow()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)

    const animations = await page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map(
        (slot) => getComputedStyle(slot).animationName,
      )
    }, FAN_SLOT)
    expect(animations).toHaveLength(5)
    expect(animations.every((name) => name === 'none')).toBe(true)

    // Y la mano queda repartida igual: cinco cartas, cada una en su sitio.
    const boxes = await fanBoxes(page)
    expect(boxes.map((child) => child.code)).toEqual([...CHILDREN])
    expect(new Set(boxes.map((child) => child.x)).size).toBe(5)

    await selectChild(page, 'coord-ingenierias')
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )
  })

  test('E11 · abrir y cerrar la isla desde una hija devuelve a la misma hija', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)
    await selectChild(page, 'coord-ingenierias')

    const before = await fanBoxes(page)

    // El problema se abre desde el panel de la hija, por la ruta de siempre.
    await page.getByTestId('problem-row').first().click()
    await expect(page.getByTestId('problem-island')).toBeVisible()

    await page.getByTestId('island-close').click()
    await expect(page.getByTestId('problem-island')).toHaveCount(0)
    await settle(page)

    // Se vuelve exactamente a donde se estaba: misma hija observada, mismo
    // mazo abierto y la mano sin moverse.
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
    expect(await fanBoxes(page)).toEqual(before)
  })

  test('E10 · desde una composición simple se llega al mazo con su mano', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-b2b"]`).click()
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', 'coord-b2b')
    await settle(page)
    await expect(page.locator(FAN_SLOT)).toHaveCount(0)

    await openDeck(page)

    // Sin pasar por la Dirección: mano repartida y panel del padre.
    await expect(page.locator(FAN_SLOT)).toHaveCount(5)
    await expect(page.locator(PANEL)).toHaveAttribute('data-code', PARENT)
    expect(await reachableCards(page)).toEqual([PARENT])

    await page.screenshot({
      path: testInfo.outputPath('fan-f-simple-to-deck-1440x900.png'),
      fullPage: false,
    })
  })
})

test.describe('mano del mazo · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('E9 · la mano escala sin desbordar ni invadir el carril', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)
    await openDeck(page)

    const deck = await measure(page, 'DECK_SELECTED mano 1920')
    expect(deck.children).toHaveLength(5)

    await page.screenshot({
      path: testInfo.outputPath('fan-g-parent-1920x1080.png'),
      fullPage: false,
    })

    // La mano entera cabe en su columna y no se mete en el carril del panel.
    expect(deck.fan.right).toBeLessThan(deck.panel.x)
    expect(deck.fan.left).toBeGreaterThan(
      deck.parentCard.x + deck.parentCard.width - 1,
    )
    expect(deck.overflow.x).toBeLessThanOrEqual(0)
    expect(deck.overflow.y).toBeLessThanOrEqual(0)

    await selectChild(page, 'coord-ingenierias')
    await measure(page, 'DECK_SELECTED hija observada 1920')
    await expect(page.locator(PANEL)).toHaveAttribute(
      'data-code',
      'coord-ingenierias',
    )

    await page.screenshot({
      path: testInfo.outputPath('fan-h-child-1920x1080.png'),
      fullPage: false,
    })
  })
})
