import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * LISTA PERSISTENTE DE PROBLEMAS.
 *
 * La lectura de LEVEL 1 dejó de aparecer bajo la carta y pasó a vivir en la
 * región `problem-list` del shell, que existe SIEMPRE. Este fichero comprueba
 * esa mudanza de punta a punta: qué dice la región sin selección, qué dice con
 * una coordinación simple, con un mazo y con una hija, qué pasa al cambiar de
 * coordinación en caliente, y que la isla del problema sigue abriéndose por la
 * misma ruta y devolviendo al mismo sitio.
 *
 * Y sobre todo: que el panel antiguo NO sigue montado en la escena de cartas.
 * Dos lecturas de los mismos problemas serían dos verdades.
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

const LIST = '[data-testid="coordination-problem-list"]'
const STAGE = '[data-testid="shell-stage"]'
const REGION = '[data-testid="shell-region-problem-list"]'
const PROBLEM_ROW = '[data-testid="problem-row"]'
const FAN_SLOT_SEL = '[data-testid="coordination-deck-fan-slot"]'
const DECK_PARENT = 'coord-operaciones-academicas'
const DECK_CHILD = 'coord-ingenierias'

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
 * Cotas de la migración, medidas en el navegador. Lo que importa aquí no es la
 * estética de la lista, sino que quepa en su región sin empujar nada: la banda
 * superior no crece, la baraja no se mueve y la ruta no desplaza.
 */
async function measure(page: Page, label: string) {
  await settle(page)

  const region = await boxOf(page, REGION)
  const stage = await boxOf(page, STAGE)
  const hasList = (await page.locator(LIST).count()) > 0
  const list = hasList ? await boxOf(page, LIST) : null

  const scroll = hasList
    ? await page.evaluate((selector) => {
        const el = document.querySelector(
          `${selector} [data-testid="coordination-panel-problems"]`,
        ) as HTMLElement | null
        if (!el) return null
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollable: el.scrollHeight > el.clientHeight + 1,
        }
      }, LIST)
    : null

  const arc = await page.evaluate((slotSelector) => {
    const slots = Array.from(
      document.querySelectorAll(slotSelector),
    ) as HTMLElement[]
    const visible = slots.filter((slot) => {
      const style = getComputedStyle(slot)
      return style.visibility !== 'hidden' && style.opacity !== '0'
    })
    if (visible.length === 0) return null
    const rects = visible.map((slot) => slot.getBoundingClientRect())
    const left = Math.min(...rects.map((rect) => rect.left))
    const right = Math.max(...rects.map((rect) => rect.right))
    return {
      left: Math.round(left),
      right: Math.round(right),
      width: Math.round(right - left),
    }
  }, SLOT)

  const cardWidth = await page.evaluate((slotSelector) => {
    const slot = document.querySelector(slotSelector) as HTMLElement | null
    return slot ? Math.round(slot.getBoundingClientRect().width * 10) / 10 : null
  }, SLOT)

  const measurement = {
    label,
    viewport: page.viewportSize(),
    region: {
      x: round(region.x),
      y: round(region.y),
      width: round(region.width),
      height: round(region.height),
    },
    list: list && {
      x: round(list.x),
      y: round(list.y),
      width: round(list.width),
      height: round(list.height),
      bottom: round(list.y + list.height),
    },
    listScroll: scroll,
    stage: {
      x: round(stage.x),
      y: round(stage.y),
      width: round(stage.width),
      height: round(stage.height),
    },
    cardWidth,
    arc,
    legacyPanels: await page
      .locator('[data-testid="coordination-panel-lane"]')
      .count(),
    listsInsideStage: await page.locator(`${STAGE} ${LIST}`).count(),
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

  console.log(`LIST ${JSON.stringify(measurement)}`)
  return measurement
}

/** La condición estructural de la fase: una sola lectura, y fuera de la mesa. */
function expectSingleReadingOutsideStage(measurement: {
  legacyPanels: number
  listsInsideStage: number
  list: { bottom: number } | null
  stage: { y: number }
}) {
  expect(measurement.legacyPanels).toBe(0)
  expect(measurement.listsInsideStage).toBe(0)
  if (measurement.list) {
    expect(measurement.list.bottom).toBeLessThanOrEqual(measurement.stage.y + 1)
  }
}

test.describe('lista persistente de problemas · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('A · sin coordinación la región invita a elegir una', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const region = page.getByTestId('shell-region-problem-list')
    await expect(region).toBeVisible()
    await expect(region).toContainText('Seleccione una coordinación')
    await expect(page.locator(LIST)).toHaveCount(0)
    await expect(page.locator(PROBLEM_ROW)).toHaveCount(0)

    // El marcador no puede parecer un control: nada enfocable dentro.
    expect(await region.locator('button, a, input, [tabindex]').count()).toBe(0)

    const global = await measure(page, 'GLOBAL')
    expectSingleReadingOutsideStage(global)
    expect(global.overflow.x).toBeLessThanOrEqual(0)
    expect(global.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f2-1-global-placeholder-1440x900.png'),
      fullPage: false,
    })
  })

  test('B · observar B2B llena la región con sus problemas reales', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')

    const list = page.locator(LIST)
    await expect(list).toHaveAttribute('data-level1', 'ready')
    await expect(list).toContainText('B2B')
    await expect(page.locator(PROBLEM_ROW)).toHaveCount(3)
    await expect(page.locator(PROBLEM_ROW).first()).toContainText(
      'Aulas sin conectividad en sede norte',
    )

    // La severidad viaja en TEXTO, no solo en color, y sobrevive a la mudanza.
    await expect(
      page.getByTestId('problem-row-severity').first(),
    ).toHaveText('Crítica')
    // Filas que son botones de verdad: alcanzables con teclado.
    await expect(page.locator(`${PROBLEM_ROW}`).first()).toHaveRole('button')
    // El rótulo de la región se retira cuando la lista ya se presenta sola.
    await expect(
      page.getByTestId('shell-region-problem-list'),
    ).not.toContainText('Seleccione una coordinación')

    const simple = await measure(page, 'SIMPLE_SELECTED coord-b2b')
    expectSingleReadingOutsideStage(simple)
    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)
    expect(simple.routeScroll!.scrollTop).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('f2-2-b2b-1440x900.png'),
      fullPage: false,
    })
  })

  test('C · cambiar de coordinación cambia la lista sin pasar por el vacío', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')

    // El cambio es DIRECTO: la región nunca vuelve al marcador por el camino.
    await page.locator(`${CARD}[data-code="coord-saber-pro"]`).click()
    await expect(page.locator(LIST)).toHaveAttribute(
      'data-code',
      'coord-saber-pro',
    )
    await expect(
      page.getByTestId('shell-region-problem-list'),
    ).not.toContainText('Seleccione una coordinación')
    await expect(page.locator(LIST)).toHaveCount(1)
    await settle(page)

    await expect(page.locator(LIST)).toContainText('Saber Pro')
    await expect(page.locator(PROBLEM_ROW)).toHaveCount(3)

    await page.screenshot({
      path: testInfo.outputPath('f2-3-saber-pro-1440x900.png'),
      fullPage: false,
    })
  })

  test('D · volver a la mesa devuelve la región a su marcador', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')
    await page.getByTestId('return-to-table').click()

    await expect(page.locator(LIST)).toHaveCount(0)
    await expect(page.getByTestId('shell-region-problem-list')).toContainText(
      'Seleccione una coordinación',
    )
    await expect(page.locator(CARD)).toHaveCount(9)
  })

  test('E · un mazo observado lee los problemas del padre', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, DECK_PARENT)

    await expect(page.locator(LIST)).toHaveAttribute('data-code', DECK_PARENT)
    await expect(page.locator(LIST)).toContainText('Operación Académica')
    await expect(page.locator(FAN_SLOT_SEL)).toHaveCount(5)

    const deck = await measure(page, 'DECK_SELECTED padre')
    expectSingleReadingOutsideStage(deck)
    expect(deck.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f2-4-deck-parent-1440x900.png'),
      fullPage: false,
    })
  })

  test('F · una hija observada lee SUS problemas, no los del padre', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, DECK_PARENT)
    await selectChild(page, DECK_CHILD)

    await expect(page.locator(LIST)).toHaveAttribute('data-code', DECK_CHILD)
    await expect(page.locator(LIST)).toContainText('Ingenierías')
    // La mano sigue abierta: observar una hija no recompone el mazo.
    await expect(page.locator(FAN_SLOT_SEL)).toHaveCount(5)

    const child = await measure(page, 'DECK_SELECTED hija')
    expectSingleReadingOutsideStage(child)

    await page.screenshot({
      path: testInfo.outputPath('f2-5-deck-child-1440x900.png'),
      fullPage: false,
    })
  })

  test('G+H · el problema abre su isla y cerrarla devuelve a la misma lista', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, DECK_PARENT)
    await selectChild(page, DECK_CHILD)

    const fanBefore = await page.locator(FAN_SLOT_SEL).count()

    await page.locator(PROBLEM_ROW).first().click()
    await expect(page.getByTestId('problem-island')).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('f2-6-island-from-child-1440x900.png'),
      fullPage: false,
    })

    await page.getByTestId('island-close').click()
    await expect(page.getByTestId('problem-island')).toHaveCount(0)
    await settle(page)

    // Mismo contexto: misma hija observada, misma lista y misma mano.
    await expect(page.locator(LIST)).toHaveAttribute('data-code', DECK_CHILD)
    await expect(page.locator(PROBLEM_ROW)).toHaveCount(3)
    expect(await page.locator(FAN_SLOT_SEL).count()).toBe(fanBefore)
    await expect(
      page.getByTestId('operational-cards-experience'),
    ).toHaveAttribute('data-composition-mode', 'DECK_SELECTED')
  })

  test('I+J · la escena de cartas ya no monta panel ni reserva carril', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const global = await measure(page, 'GLOBAL (referencia)')

    await selectCard(page, 'coord-b2b')
    const simple = await measure(page, 'SIMPLE_SELECTED')

    // Ni panel montado, ni carril, ni lista dentro del escenario.
    expect(simple.legacyPanels).toBe(0)
    expect(simple.listsInsideStage).toBe(0)
    await expect(page.getByTestId('coordination-panel-anchor')).toHaveCount(0)

    /*
     * Y la prueba de que el carril no está simplemente vacío: la mesa ocupa el
     * mismo arco y el mismo tamaño de carta que en reposo. Mientras existía,
     * observar una coordinación le restaba ancho a la mesa.
     */
    expect(simple.arc!.width).toBe(global.arc!.width)
    expect(simple.cardWidth).toBe(global.cardWidth)
  })

  test('K · la región no crece con el contenido ni empuja la baraja', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    const before = await measure(page, 'GLOBAL antes')
    await selectCard(page, 'coord-b2b')
    const after = await measure(page, 'SIMPLE_SELECTED')

    // La banda superior no crece con el contenido: es la condición que impide
    // que una coordinación con muchos problemas empuje la baraja.
    expect(after.region.height).toBe(before.region.height)
    expect(after.stage.y).toBe(before.stage.y)
    expect(after.stage.height).toBe(before.stage.height)

    // Y si la lista no cabe, cede ella: scroll interno, nunca de ruta.
    expect(after.routeScroll!.scrollTop).toBe(0)
    expect(after.overflow.x).toBeLessThanOrEqual(0)
    expect(after.overflow.y).toBeLessThanOrEqual(0)
  })
})

test.describe('lista persistente de problemas · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('L · la misma migración escala sin desbordar', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openShell(page)

    await selectCard(page, 'coord-b2b')
    const simple = await measure(page, 'SIMPLE_SELECTED 1920')
    expectSingleReadingOutsideStage(simple)
    expect(simple.overflow.x).toBeLessThanOrEqual(0)
    expect(simple.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f2-7-b2b-1920x1080.png'),
      fullPage: false,
    })

    await page.getByTestId('return-to-table').click()
    await expect(page.locator(LIST)).toHaveCount(0)

    await selectCard(page, DECK_PARENT)
    await selectChild(page, DECK_CHILD)
    const child = await measure(page, 'DECK_SELECTED hija 1920')
    expectSingleReadingOutsideStage(child)
    expect(child.overflow.y).toBeLessThanOrEqual(0)

    await page.screenshot({
      path: testInfo.outputPath('f2-8-deck-child-1920x1080.png'),
      fullPage: false,
    })
  })
})
