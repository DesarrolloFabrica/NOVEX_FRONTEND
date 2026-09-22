import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Apertura hacia ARRIBA y cesión de la mesa (R4.2).
 *
 * R4.1 dejó la subbaraja correcta pero abriéndose hacia abajo, sobre el mantel.
 * R4.2 invierte el gesto —el mazo se levanta y abre sus cartas hacia el
 * observador— y, para que quepa, el resto de la mesa CEDE: las otras ocho
 * coordinaciones bajan un poco, tanto más cuanto más cerca están del mazo
 * abierto.
 *
 * Lo que se vigila aquí es exactamente eso y sus dos líneas rojas:
 *
 *  - la cesión es SOLO vertical y SOLO temporal. Ni x, ni rotación, ni orden;
 *    la memoria espacial de la mesa es una regla congelada desde R3 y una
 *    coordinación no cambia de sitio ni siquiera un instante;
 *  - la subbaraja invade el aire entre la mesa y el personaje, pero no lo toca,
 *    no tapa la lectura institucional y no cruza la cabecera.
 *
 * La lectura visual de las mini cartas vive en `operational-subdeck-visual`, y
 * el ciclo de apertura y cierre en `operational-table-hover`.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const PEEK = '[data-testid="coordination-deck-peek"]'
const SLOT = '.operational-table__slot'

/** La ÚNICA coordinación con subordinaciones, y además la central del arco. */
const PARENT = 'coord-operaciones-academicas'
/** Sin subordinaciones: señalarla no debe mover la mesa. */
const CHILDLESS = 'coord-saber-pro'

/**
 * Orden declarado de la mesa de producto. La cesión se pondera por la
 * DISTANCIA en este orden, así que se fija aquí: si alguien reordenara la mesa
 * sin darse cuenta, el gradiente dejaría de corresponderse con lo que se ve.
 */
const TABLE_ORDER = [
  'coord-general',
  'coord-b2b',
  'coord-desarrollo-profesional',
  'coord-especializaciones',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-homologaciones',
  'coord-fabrica-contenidos',
]

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
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: operationalOverviewFixture({ severe: true }) })
      return
    }
    await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 100 } })
  })
}

async function openTable(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await expect(page.getByTestId('coordination-table')).toBeVisible()
}

interface Snapshot {
  code: string
  /** Esquina superior izquierda SIN rotación: es la traslación pura del slot. */
  x: number
  y: number
  /** Grados de la matriz del slot, para vigilar que la rotación no se toca. */
  rotation: number
  /**
   * Elevación del mazo, leída de `.coordination-deck-stack`.
   *
   * Va en un nodo distinto del slot a propósito: el slot es la única autoridad
   * de POSICIÓN en la mesa y la elevación es un gesto de interacción. Además,
   * el shell aplica `.novex-os button:hover { transform: translateY(-1px) }`
   * con una especificidad que ninguna regla sobre la carta puede superar, y la
   * pila —un `div`— queda fuera de ese selector.
   */
  lift: number
  zIndex: string
  yieldPx: string
}

/**
 * Geometría de las nueve cartas, leída de la matriz de transformación.
 *
 * Se descompone la matriz en lugar de usar `getBoundingClientRect` porque el
 * rectángulo de una carta rotada mezcla traslación y giro: un cambio de
 * rotación se leería como desplazamiento y al revés. Aquí los tres ejes quedan
 * separados, que es justo lo que hay que poder afirmar por separado.
 *
 * Se esperan dos fotogramas antes de medir: tras un cambio de estado, la
 * primera lectura de estilo puede devolver todavía la matriz anterior.
 */
async function snapshot(page: Page): Promise<Snapshot[]> {
  return page.evaluate(async (slotSelector) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
    )
    return Array.from(document.querySelectorAll(slotSelector)).map((slot) => {
      const style = getComputedStyle(slot as HTMLElement)
      const matrix = new DOMMatrix(style.transform)
      const stack = slot.querySelector('[data-testid="coordination-deck-stack"]')
      const lift = stack
        ? new DOMMatrix(getComputedStyle(stack as HTMLElement).transform).f
        : 0
      return {
        code:
          slot
            .querySelector('[data-testid="coordination-card"]')
            ?.getAttribute('data-code') ?? '?',
        x: Math.round(matrix.e * 100) / 100,
        y: Math.round(matrix.f * 100) / 100,
        rotation:
          Math.round(Math.atan2(matrix.b, matrix.a) * (1800 / Math.PI)) / 10,
        lift: Math.round(lift * 100) / 100,
        zIndex: style.zIndex,
        yieldPx: (slot as HTMLElement).dataset.yield ?? '',
      }
    })
  }, SLOT)
}

/** Cuánto ASOMA la subbaraja sobre el borde alto de su padre, en píxeles. */
async function rise(page: Page, code = PARENT): Promise<number> {
  return page.evaluate((parent) => {
    const stack = document.querySelector(
      `[data-testid="coordination-deck-stack"][data-code="${parent}"]`,
    )
    if (!stack) return -1
    const card = stack
      .querySelector('[data-testid="coordination-card"]')!
      .getBoundingClientRect()
    const peeks = Array.from(
      stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
    )
    if (peeks.length === 0) return 0
    return Math.round(
      Math.max(...peeks.map((peek) => card.top - peek.getBoundingClientRect().top)),
    )
  }, code)
}

/** Señala el mazo y espera a que la mesa haya cedido de verdad. */
async function openParent(page: Page) {
  await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
  await expect
    .poll(async () => rise(page), { timeout: 5_000 })
    .toBeGreaterThan(25)
}

test.describe('mesa que cede · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('la subbaraja se abre POR ENCIMA del borde alto del padre', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    // En reposo la baraja cerrada crece hacia abajo: el ascenso es negativo.
    expect(await rise(page)).toBeLessThan(0)

    await openParent(page)

    // Y al abrirse cruza el borde alto: es el gesto de sacar el mazo de la
    // mesa, no el de desplegarlo sobre el mantel.
    const above = await page.evaluate((parent) => {
      const stack = document.querySelector(
        `[data-testid="coordination-deck-stack"][data-code="${parent}"]`,
      )!
      const card = stack
        .querySelector('[data-testid="coordination-card"]')!
        .getBoundingClientRect()
      return Array.from(
        stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => peek.getBoundingClientRect().top < card.top)
    }, PARENT)

    expect(above).toHaveLength(5)
    expect(above.every(Boolean)).toBe(true)
  })

  test('el mazo señalado se eleva y las otras ocho bajan', async ({ page }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    await openParent(page)
    const open = await snapshot(page)

    for (const [index, before] of resting.entries()) {
      const slotDelta = open[index].y - before.y
      const liftDelta = open[index].lift - before.lift

      if (before.code === PARENT) {
        // El SLOT del mazo abierto no se mueve —su sitio en la mesa es
        // intocable— y quien sube es la pila que hay dentro. Dentro de la
        // banda autorizada: lo bastante para leerse como «este mazo sale de la
        // mesa», no tanto como para despegarse de ella.
        expect(slotDelta, `${before.code} no cambia de sitio`).toBe(0)
        expect(liftDelta, `${before.code} se eleva`).toBeLessThanOrEqual(-20)
        expect(liftDelta, `${before.code} no se despega`).toBeGreaterThanOrEqual(
          -35,
        )
      } else {
        expect(slotDelta, `${before.code} cede`).toBeGreaterThan(0)
        // Y las demás NO se elevan: la mesa cede, no se agita.
        expect(liftDelta, `${before.code} no se eleva`).toBe(0)
      }
    }
  })

  test('la cesión se pondera por distancia al mazo abierto', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    // El orden declarado es la base del gradiente: si cambiara, la ponderación
    // dejaría de coincidir con lo que se ve en pantalla.
    expect((await snapshot(page)).map((slot) => slot.code)).toEqual(TABLE_ORDER)

    const resting = await snapshot(page)
    await openParent(page)
    const open = await snapshot(page)

    const centre = TABLE_ORDER.indexOf(PARENT)
    const byDistance = new Map<number, number[]>()
    for (const [index, before] of resting.entries()) {
      if (before.code === PARENT) continue
      const distance = Math.abs(index - centre)
      const delta = open[index].y - before.y
      byDistance.set(distance, [...(byDistance.get(distance) ?? []), delta])
    }

    // Las dos vecinas a la misma distancia ceden lo mismo: la mesa se hunde
    // simétricamente y el mazo abierto no se descentra.
    for (const [distance, deltas] of byDistance) {
      expect(Math.abs(deltas[0] - deltas[1]), `distancia ${distance}`).toBeLessThan(2)
    }

    // Y la cesión decrece hacia los extremos. Si todas bajaran igual, la mesa
    // entera parecería caerse en lugar de abrirse en un punto.
    const media = [...byDistance.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, deltas]) => deltas.reduce((t, v) => t + v, 0) / deltas.length)
    for (let index = 1; index < media.length; index += 1) {
      expect(media[index]).toBeLessThan(media[index - 1])
    }

    // Las inmediatas ceden de verdad; las extremas apenas acompañan.
    expect(media[0]).toBeGreaterThanOrEqual(26)
    expect(media[0]).toBeLessThanOrEqual(30)
    expect(media.at(-1)!).toBeGreaterThanOrEqual(8)
    expect(media.at(-1)!).toBeLessThanOrEqual(12)
  })

  test('la mesa cede en vertical y NADA más: ni x, ni giro, ni orden', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    await openParent(page)
    const open = await snapshot(page)

    // La regla congelada desde R3: una coordinación nunca cambia de sitio, y
    // «temporalmente» tampoco. El estado puede cambiar el énfasis, jamás el
    // mapa: quien aprendió dónde está Saber Pro la encuentra ahí siempre.
    expect(open.map((slot) => slot.code)).toEqual(resting.map((s) => s.code))
    for (const [index, before] of resting.entries()) {
      expect(open[index].x, `${before.code} conserva su x`).toBe(before.x)
      expect(open[index].rotation, `${before.code} conserva su giro`).toBe(
        before.rotation,
      )
    }
  })

  test('al retirar el puntero la mesa vuelve a su geometría exacta', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    await openParent(page)
    expect((await snapshot(page)).map((s) => s.y)).not.toEqual(
      resting.map((s) => s.y),
    )

    await page.mouse.move(10, 10)
    await expect.poll(async () => rise(page)).toBeLessThan(0)

    // Exacta, no aproximada: la cesión es un préstamo, no un reacomodo.
    await expect
      .poll(async () => (await snapshot(page)).map((s) => `${s.x}/${s.y}/${s.rotation}`))
      .toEqual(resting.map((s) => `${s.x}/${s.y}/${s.rotation}`))
  })

  test('el foco por teclado hace ceder la mesa igual que el puntero', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect.poll(async () => rise(page)).toBeGreaterThan(25)
    const hovered = await snapshot(page)

    await page.mouse.move(10, 10)
    await expect.poll(async () => rise(page)).toBeLessThan(0)

    await page.locator(`${CARD}[data-code="${PARENT}"]`).focus()
    await expect.poll(async () => rise(page)).toBeGreaterThan(25)
    const focused = await snapshot(page)

    // El teclado no es un camino de segunda: llega a la MISMA mesa.
    expect(focused.map((s) => s.y)).toEqual(hovered.map((s) => s.y))
    expect(focused.map((s) => s.y)).not.toEqual(resting.map((s) => s.y))
  })

  test('señalar una coordinación SIN subordinaciones no mueve la mesa', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    const before = await page
      .locator(`${CARD}[data-code="${CHILDLESS}"]`)
      .evaluate((node) => node.getBoundingClientRect().top)

    await page.locator(`${CARD}[data-code="${CHILDLESS}"]`).hover()

    // Se espera al acuse de recibo del propio nodo —una elevación plana, sin
    // mazo que sacar— para no medir la mesa antes de que el hover se aplique.
    await expect
      .poll(async () =>
        page
          .locator(`${CARD}[data-code="${CHILDLESS}"]`)
          .evaluate((node) => node.getBoundingClientRect().top),
      )
      .toBeLessThan(before)

    const open = await snapshot(page)

    // No hay nada que abrir, así que no hay nada a lo que hacer sitio. Ceder
    // aquí sería movimiento gratuito, y la mesa se movería casi siempre.
    for (const slot of open) {
      expect(slot.yieldPx, `${slot.code} no cede`).toBe('0')
    }
    for (const [index, before] of resting.entries()) {
      if (before.code === CHILDLESS) continue
      expect(open[index].y, `${before.code} no se mueve`).toBe(before.y)
    }
  })

  test('con la mesa cedida las vecinas siguen recibiendo el puntero', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openParent(page)

    const reachable = await page.evaluate((codes) => {
      return codes.map((code) => {
        const card = document.querySelector(
          `[data-testid="coordination-card"][data-code="${code}"]`,
        )!
        const rect = card.getBoundingClientRect()
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )
        return { code, ok: card.contains(hit) }
      })
    }, TABLE_ORDER.filter((code) => code !== PARENT))

    for (const neighbour of reachable) {
      expect(neighbour.ok, `${neighbour.code} recibe el puntero`).toBe(true)
    }
  })

  test('la subbaraja invade el aire libre sin tocar al personaje ni al resumen', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openParent(page)

    const clearance = await page.evaluate((parent) => {
      const box = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect() ?? null
      const stack = document.querySelector(
        `[data-testid="coordination-deck-stack"][data-code="${parent}"]`,
      )!
      const fan = Array.from(
        stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => peek.getBoundingClientRect())
      const top = Math.min(...fan.map((rect) => rect.top))
      const figure = box('.direction-character__figure')
      const status = box('[data-testid="direction-character-status"]')
      const header = box('[data-testid="eoc-chrome"]')
      const table = box('[data-testid="coordination-table"]')
      return {
        top,
        figureBottom: figure?.bottom ?? null,
        statusBottom: status?.bottom ?? null,
        headerBottom: header?.bottom ?? null,
        tableTop: table?.top ?? null,
      }
    }, PARENT)

    // Nada de esto es opcional: encima de la mesa vive el personaje y su
    // estado, y taparlos convertiría un gesto de exploración en una pérdida
    // de información.
    expect(clearance.statusBottom).not.toBeNull()
    expect(clearance.top).toBeGreaterThan(clearance.statusBottom!)
    expect(clearance.top).toBeGreaterThan(clearance.figureBottom!)
    expect(clearance.top).toBeGreaterThan(clearance.headerBottom!)

    // Y sí ocupa el aire que había libre: si no rebasara el borde alto de la
    // mesa, el abanico no estaría usando ese hueco en absoluto.
    expect(clearance.top).toBeLessThan(clearance.tableTop!)
  })

  test('la mesa cedida no desborda la página', async ({ page }) => {
    await install(page)
    await openTable(page)
    await openParent(page)

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
  })
})

test.describe('mesa que cede · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('se llega a la misma cesión, sin recorrido', async ({ page }) => {
    await install(page)
    // `reducedMotion` en la configuración del proyecto no alcanza a la página:
    // `matchMedia` responde `false`. Emularlo aquí sí funciona, y comprobarlo
    // antes evita que el test pase por no estar midiendo nada.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openTable(page)
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)

    const resting = await snapshot(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()

    // Sin transición la cesión es inmediata: se mide sin esperar a nada.
    const open = await snapshot(page)
    const centre = TABLE_ORDER.indexOf(PARENT)
    for (const [index, before] of resting.entries()) {
      if (index === centre) continue
      expect(open[index].y - before.y, `${before.code} ha cedido ya`).toBeGreaterThan(0)
    }

    // Y el slot no anima: la geometría se entiende quieta.
    const durations = await page
      .locator(SLOT)
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          Number.parseFloat(getComputedStyle(node).transitionDuration),
        ),
      )
    expect(durations.length).toBe(9)
    expect(durations.every((value) => value < 0.01)).toBe(true)
  })
})

test.describe('mesa que cede · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('mismo gradiente y mismas cotas a 1920', async ({ page }) => {
    await install(page)
    await openTable(page)

    const resting = await snapshot(page)
    await openParent(page)
    const open = await snapshot(page)

    const centre = TABLE_ORDER.indexOf(PARENT)
    const deltas = resting.map((before, index) => open[index].y - before.y)

    // La cesión va en píxeles, no en unidades de carta: es un empujón de
    // interacción, no geometría de mesa, y a 1920 tiene que valer lo mismo.
    expect(Math.round(deltas[centre - 1])).toBeGreaterThanOrEqual(26)
    expect(Math.round(deltas[centre - 1])).toBeLessThanOrEqual(30)
    expect(Math.round(deltas[0])).toBeGreaterThanOrEqual(8)
    expect(Math.round(deltas[0])).toBeLessThanOrEqual(12)

    // Y el abanico sigue por debajo del resumen institucional, que a 1920 baja
    // con el resto del escenario.
    const clearance = await page.evaluate((parent) => {
      const stack = document.querySelector(
        `[data-testid="coordination-deck-stack"][data-code="${parent}"]`,
      )!
      const top = Math.min(
        ...Array.from(
          stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
        ).map((peek) => peek.getBoundingClientRect().top),
      )
      const status = document
        .querySelector('[data-testid="direction-character-status"]')!
        .getBoundingClientRect()
      return top - status.bottom
    }, PARENT)
    expect(clearance).toBeGreaterThan(0)
  })

  test('sin desbordar y con las vecinas alcanzables', async ({ page }) => {
    await install(page)
    await openTable(page)
    await openParent(page)

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

    await expect(page.locator(PEEK)).toHaveCount(5)
  })
})
