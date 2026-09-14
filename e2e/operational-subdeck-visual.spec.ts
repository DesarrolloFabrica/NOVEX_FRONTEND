import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Representación visual de la subbaraja abierta (R4.1).
 *
 * R4 dejó la interacción correcta pero la lectura equivocada: cinco franjas de
 * color en lugar de cinco cartas subordinadas. Lo que aquí se vigila es lo que
 * arregla esa lectura —arte real de cada hija, mini abanico horizontal, énfasis
 * subordinado— más la comprobación de movimiento reducido, que hasta ahora se
 * daba por cubierta y no lo estaba.
 *
 * El comportamiento de apertura y cierre vive en `operational-table-hover`.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const PEEK = '[data-testid="coordination-deck-peek"]'
const FACE = '.coordination-deck-stack__peek-face'
const PARENT = 'coord-operaciones-academicas'
const STACK = `[data-testid="coordination-deck-stack"][data-code="${PARENT}"]`

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
  /*
   * Y a que el ARTE esté cargado antes de medir nada. Las cotas de esta suite
   * son diferencias entre una lectura en reposo y otra con el puntero encima:
   * si la primera se toma con la escena aún asentándose, la resta mide el
   * asentamiento y no el gesto. Con la mesa dentro de una banda del shell eso
   * dejó de ser teórico —medido: 88 px de «elevación» donde el gesto son 35—.
   */
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
 * Cuánto ASOMA la subbaraja por encima del borde alto del padre, en píxeles.
 *
 * Desde R4.2 el abanico se abre hacia arriba, así que la señal de apertura es
 * este ascenso. En reposo el valor es negativo —las cartas del mazo cerrado
 * quedan por debajo del borde del padre—, y al abrirse pasa a positivo. Se
 * mide contra el borde ALTO porque es la cota que la subbaraja no puede cruzar
 * sin tapar la lectura institucional.
 */
/** Alto real de una carta. La geometría de la mesa se expresa en esta unidad. */
async function cardHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="coordination-card"]')
    return card ? card.getBoundingClientRect().height : 1
  })
}

async function reach(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const stack = document.querySelector(selector)
    if (!stack) return -1
    const card = stack
      .querySelector('[data-testid="coordination-card"]')!
      .getBoundingClientRect()
    const peeks = Array.from(
      stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
    )
    if (peeks.length === 0) return 0
    return Math.round(
      Math.max(
        ...peeks.map((peek) => card.top - peek.getBoundingClientRect().top),
      ),
    )
  }, STACK)
}

async function openByHover(page: Page): Promise<number> {
  const closed = await reach(page)
  await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
  await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)
  return closed
}

test.describe('subbaraja abierta · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('en reposo el arte de las hijas está oculto', async ({ page }) => {
    await install(page)
    await openTable(page)

    // Las caras existen en el DOM pero no se ven: en reposo solo asoma el
    // canto, y una cara completa ahí no se reconocería.
    await expect(page.locator(FACE)).toHaveCount(5)

    const opacities = await page
      .locator(FACE)
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      )
    expect(opacities.every((value) => value < 0.05)).toBe(true)
  })

  test('abiertas son MINI CARTAS con el arte de cada hija', async ({ page }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    // Cada una pinta SU arte: ninguna toma prestada la cara de otra.
    const sources = await page
      .locator(FACE)
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')))
    expect(sources).toEqual([
      '/CoordCards/BellasArtes.png',
      '/CoordCards/transformacionEmpresarial.png',
      '/CoordCards/ingenierias.png',
      '/CoordCards/Transversales.png',
      '/CoordCards/negocios.png',
    ])

    // Y se ven de verdad, con la imagen cargada.
    const shown = await page.locator(FACE).evaluateAll((nodes) =>
      nodes.map((node) => ({
        opacity: Number(getComputedStyle(node).opacity),
        loaded: (node as HTMLImageElement).naturalWidth > 0,
      })),
    )
    expect(shown.every((face) => face.opacity > 0.9 && face.loaded)).toBe(true)
  })

  test('las hijas quedan subordinadas: menor tamaño y menor énfasis', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    const emphasis = await page.locator(STACK).evaluate((node) => {
      const card = node.querySelector('[data-testid="coordination-card"]')!
      const peek = node.querySelector('[data-testid="coordination-deck-peek"]')!
      return {
        parentOpacity: Number(getComputedStyle(card).opacity),
        childOpacity: Number(getComputedStyle(peek).opacity),
        childFilter: getComputedStyle(peek).filter,
        parentWidth: card.getBoundingClientRect().width,
        childWidth: peek.getBoundingClientRect().width,
      }
    })

    // El padre se queda al 100 %.
    expect(emphasis.parentOpacity).toBe(1)
    // La hija baja lo justo: subordinada, no un marcador de posición.
    expect(emphasis.childOpacity).toBeGreaterThanOrEqual(0.78)
    expect(emphasis.childOpacity).toBeLessThanOrEqual(0.88)
    expect(emphasis.childFilter).toContain('brightness')
    // Y es claramente más pequeña.
    expect(emphasis.childWidth).toBeLessThan(emphasis.parentWidth * 0.75)
  })

  test('el abanico se abre en HORIZONTAL, no en escalera vertical', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    const centres = await page
      .locator(`${STACK} ${PEEK}`)
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect()
          return { x: rect.left + rect.width / 2, y: rect.top }
        }),
      )

    // El reparto horizontal domina. Con la escalera de R4 era al contrario.
    const spanX = centres[4].x - centres[0].x
    const ys = centres.map((centre) => centre.y)
    const spanY = Math.max(...ys) - Math.min(...ys)
    expect(spanX).toBeGreaterThan(120)
    expect(spanX).toBeGreaterThan(spanY * 3)

    // Y el centro queda por encima de los extremos. Abriéndose hacia arriba la
    // curvatura se invierte respecto de R4.1: es la forma de una mano de cartas
    // sujeta por el pie, no la de un abanico colgando.
    expect(centres[2].y).toBeLessThan(centres[0].y)
    expect(centres[2].y).toBeLessThan(centres[4].y)
  })

  test('el foco por teclado abre las MISMAS cinco mini cartas', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="coord-especializaciones"]`).focus()
    await page.keyboard.press('Tab')
    await expect(page.locator(`${CARD}[data-code="${PARENT}"]`)).toBeFocused()
    await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)

    const shown = await page
      .locator(FACE)
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      )
    expect(shown).toHaveLength(5)
    expect(shown.every((value) => value > 0.9)).toBe(true)
  })

  test('el mazo señalado se eleva, pero sigue sin ser protagonista', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const card = page.locator(`${CARD}[data-code="${PARENT}"]`)
    const before = (await card.evaluate(
      (node) => node.getBoundingClientRect().width,
    )) as number

    const restingTop = await card.evaluate(
      (node) => node.getBoundingClientRect().top,
    )

    await card.hover()
    // Se espera a que la subbaraja esté abierta, no a un reloj: es la señal de
    // que el hover está realmente aplicado.
    // El ascenso se mide como FRACCIÓN del alto de carta, no en píxeles: la
    // apertura está definida en altos de carta y el tamaño de carta lo decide
    // ahora la banda que la aloja, no el viewport.
    await expect
      .poll(async () => (await reach(page)) / (await cardHeight(page)))
      .toBeGreaterThan(0.12)

    const open = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return { width: rect.width, top: rect.top }
    })

    // R4.1 dejó constancia de que este gesto NO ocurría: el shell aplica
    // `.novex-os button:not(:disabled):not(...):hover { transform:
    // translateY(-1px) }` con una especificidad que ninguna regla sobre
    // `.coordination-card` podía superar sin `!important`. R4.2 lo resuelve
    // moviendo la elevación a `.coordination-deck-stack`, que es un `div` y
    // por tanto queda fuera de ese selector. La cota vive aquí para que un
    // futuro retoque del shell no vuelva a anular el gesto en silencio.
    expect(restingTop - open.top).toBeGreaterThanOrEqual(20)
    expect(restingTop - open.top).toBeLessThanOrEqual(45)

    // Pero sigue sin ser el protagonista: la acción es la apertura, no el
    // padre creciendo. La escala se queda en el mínimo que hace legible la
    // elevación.
    expect(open.width / before).toBeGreaterThan(1)
    expect(open.width / before).toBeLessThanOrEqual(1.04)
  })

  test('abierta, la subbaraja no oculta ni bloquea a las vecinas', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    // Hasta R4.1 la garantía era geométrica: el abanico caía bajo el pie de
    // las vecinas y no podía solaparlas. Abriéndose hacia ARRIBA eso deja de
    // ser cierto —cruza la banda alta de las vecinas inmediatas— y la garantía
    // pasa a ser doble: la mesa CEDE para hacerle sitio, y la subbaraja no
    // captura el puntero. Lo que se vigila es que la píldora de estado siga
    // descubierta y que la vecina siga recibiendo el clic.
    const clearance = await page.evaluate(
      ({ stackSelector, neighbours }) => {
        const stack = document.querySelector(stackSelector)!
        const fan = Array.from(
          stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
        ).map((peek) => peek.getBoundingClientRect())
        return neighbours.map((code) => {
          const card = document.querySelector(
            `[data-testid="coordination-card"][data-code="${code}"]`,
          )!
          const rect = card.getBoundingClientRect()
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          )
          const pill = card.querySelector('[data-testid="coordination-card-status"]')
          const pillRect = pill?.getBoundingClientRect()
          return {
            code,
            reachable: card.contains(hit),
            pillClear:
              pillRect === undefined ||
              fan.every(
                (f) =>
                  f.bottom <= pillRect.top ||
                  f.top >= pillRect.bottom ||
                  f.right <= pillRect.left ||
                  f.left >= pillRect.right,
              ),
          }
        })
      },
      {
        stackSelector: STACK,
        neighbours: [
          'coord-especializaciones',
          'coord-proyeccion-social',
          'coord-saber-pro',
        ],
      },
    )

    for (const neighbour of clearance) {
      expect(
        neighbour.pillClear,
        `${neighbour.code} conserva su píldora de estado a la vista`,
      ).toBe(true)
      expect(neighbour.reachable, `${neighbour.code} recibe el puntero`).toBe(
        true,
      )
    }
  })

  test('las mini cartas siguen sin ser interactivas', async ({ page }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    await expect(
      page.locator('[data-testid="coordination-table-slot"] button'),
    ).toHaveCount(9)
    await expect(page.locator(`${PEEK}[tabindex]`)).toHaveCount(0)

    const inert = await page
      .locator(PEEK)
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.getAttribute('aria-hidden') === 'true' &&
            getComputedStyle(node).pointerEvents === 'none',
        ),
      )
    expect(inert).toBe(true)

    // El arte tampoco captura el puntero.
    const facesInert = await page
      .locator(FACE)
      .evaluateAll((nodes) =>
        nodes.every((node) => {
          const rect = node.getBoundingClientRect()
          // Se muestrea la banda ALTA, que es la parte visible del abanico
          // desde que se abre hacia arriba: el pie de cada hija queda detrás
          // del padre y ahí no probaría nada.
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + 6,
          )
          return hit === null || !node.contains(hit)
        }),
      )
    expect(facesInert).toBe(true)
  })

  test('abierta no desborda la página ni el área de contenido', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

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

    const escapes = await page.evaluate(() => {
      const host = document
        .querySelector('.novex-os-deck__content')
        ?.getBoundingClientRect()
      if (!host) return -1
      return Array.from(
        document.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).filter((peek) => {
        const rect = peek.getBoundingClientRect()
        return (
          rect.bottom > host.bottom + 1 ||
          rect.top < host.top - 1 ||
          rect.left < host.left - 1 ||
          rect.right > host.right + 1
        )
      }).length
    })
    expect(escapes).toBe(0)
  })
})

test.describe('subbaraja abierta · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  /**
   * La opción `reducedMotion: 'reduce'` de `playwright.config.ts` NO llega a la
   * página en esta versión de Playwright: `matchMedia` la reporta como false,
   * mientras que el `colorScheme` del mismo bloque sí se aplica. Por eso todas
   * las fases anteriores creyeron tener cubierta esta ruta sin tenerlo.
   *
   * La técnica que sí funciona es `page.emulateMedia()` en tiempo de ejecución,
   * comprobada leyendo `matchMedia` dentro de la propia prueba antes de afirmar
   * nada. No se reconfigura la suite entera: eso afecta a más de cien pruebas y
   * es una decisión aparte.
   */
  test('la emulación llega de verdad a la página', async ({ page }) => {
    await install(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openTable(page)

    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)
  })

  test('sin transiciones: la estructura no depende de la animación', async ({
    page,
  }) => {
    await install(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openTable(page)

    const durations = await page
      .locator(PEEK)
      .evaluateAll((nodes) =>
        nodes.flatMap((node) =>
          getComputedStyle(node)
            .transitionDuration.split(',')
            .map((part) => Number.parseFloat(part)),
        ),
      )
    expect(durations.length).toBeGreaterThan(0)

    // Efectivamente cero, no exactamente cero: quien neutraliza el movimiento
    // es la regla global del shell (`novex-os.css`), que usa
    // `transition-duration: 0.001ms !important` y por tanto computa 1e-06s.
    // Ese `!important` gana también sobre el bloque de la hoja de cartas.
    expect(durations.every((value) => value < 0.01)).toBe(true)
  })

  test('se llega a la misma geometría final, y se vuelve al reposo exacto', async ({
    page,
  }) => {
    await install(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openTable(page)

    // Sin transición la apertura es inmediata: no hace falta esperar.
    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    const open = await reach(page)
    expect(open).toBeGreaterThan(closed + 25)

    // El arte también aparece sin recorrido.
    const shown = await page
      .locator(FACE)
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      )
    expect(shown.every((value) => value > 0.9)).toBe(true)

    await page.mouse.move(10, 10)
    expect(await reach(page)).toBe(closed)
  })
})

test.describe('subbaraja abierta · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('mismas cinco mini cartas y sin desbordar', async ({ page }) => {
    await install(page)
    await openTable(page)
    await openByHover(page)

    await expect(page.locator(FACE)).toHaveCount(5)
    const shown = await page
      .locator(FACE)
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      )
    expect(shown.every((value) => value > 0.9)).toBe(true)

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
