import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Gramática de las tarjetas (R5.1).
 *
 * Las fases anteriores fueron añadiendo estados —reposo, hover, foco,
 * seleccionada, atenuada, mazo abierto— cada uno resuelto en su momento. Lo que
 * se fija aquí es que los seis se comporten como UN LENGUAJE y no como seis
 * soluciones que coinciden en la misma pantalla:
 *
 *  - todos los realces se expresan con los mismos recursos —elevación, z, aura,
 *    contraste— y se diferencian en intensidad, no en naturaleza;
 *  - la atenuación funciona igual sobre una carta clara y sobre una oscura, sin
 *    una sola excepción por coordinación;
 *  - el estado operacional se lee en los cuatro estados de la carta;
 *  - cada nodo del árbol tiene UNA autoridad de transform y no se la disputa a
 *    otro.
 *
 * El ciclo de apertura de la subbaraja vive en `operational-table-hover`, la
 * cesión de la mesa en `operational-table-yield`, y el modo seleccionado
 * completo en `operational-cards-selection`.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const STACK = '[data-testid="coordination-deck-stack"]'
const SLOT = '.operational-table__slot'
const PILL = '[data-testid="coordination-card-status"]'

/** Única con subordinaciones. */
const PARENT = 'coord-operaciones-academicas'
/** Sin subordinaciones, ilustrada y CLARA. */
const ILLUSTRATED = 'coord-fabrica-contenidos'
/** Sin subordinaciones, ilustrada y OSCURA (Servicio vía artCode). Caso límite. */
const DARK = 'coord-homologaciones'
const SIMPLE = 'coord-saber-pro'

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

/**
 * Lectura del velo de atenuación de una carta.
 *
 * Se esperan dos fotogramas: tras un cambio de estado, la primera lectura de
 * estilo puede devolver todavía el valor anterior.
 */
async function veil(page: Page, code: string) {
  return page.evaluate(async (target) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
    )
    const card = document.querySelector(
      `[data-testid="coordination-card"][data-code="${target}"]`,
    )!
    const after = getComputedStyle(card, '::after')
    const pill = card.querySelector('[data-testid="coordination-card-status"]')!
    return {
      opacity: Number(after.opacity),
      zIndex: after.zIndex,
      height: Math.round(Number.parseFloat(after.height)),
      // Alto de MAQUETA, no el del rectángulo envolvente: la carta está
      // rotada y su `getBoundingClientRect` es mayor que la caja real.
      cardHeight: (card as HTMLElement).offsetHeight,
      pillZIndex: getComputedStyle(pill).zIndex,
      stackFilter: getComputedStyle(card.closest('.coordination-deck-stack')!)
        .filter,
    }
  }, code)
}

/**
 * Espera a que las transiciones de estado hayan terminado.
 *
 * Sin esto las lecturas salen a medio camino y, peor, salen DISTINTAS según el
 * orden en que se pidan: la primera carta que se mide devuelve el valor viejo
 * y la segunda el nuevo, de modo que una comparación entre dos cartas falla
 * por temporización y parece una diferencia de presentación. El velo tarda
 * 200 ms y la elevación 220 ms.
 */
async function settle(page: Page) {
  await page.waitForTimeout(350)
}

async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.getByTestId('coordination-table')).toHaveAttribute(
    'data-selected',
    code,
  )
  // Se aparta el puntero: si no, la carta pulsada queda además en hover y las
  // lecturas mezclan dos estados.
  await page.mouse.move(4, 4)
  await settle(page)
}

test.describe('gramática de tarjetas · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('en reposo ninguna carta lleva velo', async ({ page }) => {
    await install(page)
    await openTable(page)

    for (const code of [ILLUSTRATED, DARK, PARENT]) {
      const state = await veil(page, code)
      expect(state.opacity, `${code} sin velo en reposo`).toBe(0)
    }
  })

  test('el velo cubre la carta entera, no una tira', async ({ page }) => {
    // Regresión con nombre y apellidos: este velo comparte pseudo-elemento con
    // el hairline de identidad que antes vivía en `::after`, y aquella regla
    // declaraba `height: 2px`. Con `top` y `bottom` fijados por `inset`, una
    // altura explícita gana por sobre-restricción y el velo se convertía en una
    // línea de dos píxeles: presente en el CSS, invisible en pantalla y
    // silencioso en cualquier prueba que solo mirase la opacidad.
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    const state = await veil(page, ILLUSTRATED)
    expect(state.height).toBeGreaterThan(state.cardHeight - 4)
  })

  test('la atenuación es un VELO, no un filtro de brillo', async ({ page }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    const state = await veil(page, ILLUSTRATED)
    expect(state.opacity).toBeGreaterThan(0.3)
    // `brightness()` es multiplicativo y castiga a cada carta en proporción a
    // lo clara que sea. Si vuelve a aparecer, la carta oscura se hunde.
    expect(state.stackFilter).toBe('none')
  })

  test('clara y oscura se atenúan EXACTAMENTE igual', async ({ page }) => {
    // El corazón de la fase: una regla general, sin excepciones por
    // coordinación. Si algún día alguien añade un `if servicio then…`, esta
    // igualdad se rompe.
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    // Se sondea hasta que el velo ha llegado: su valor CONVERGE, y lo que se
    // afirma es que las dos cartas acaban en el mismo sitio, no cuánto tardan.
    await expect
      .poll(async () => (await veil(page, ILLUSTRATED)).opacity)
      .toBeGreaterThan(0.3)

    const illustrated = await veil(page, ILLUSTRATED)
    const dark = await veil(page, DARK)

    expect(dark.opacity).toBe(illustrated.opacity)
    expect(dark.zIndex).toBe(illustrated.zIndex)
  })

  test('el velo queda por DEBAJO del nombre y del estado', async ({ page }) => {
    // Es lo que permite atenuar sin volver ilegible: se apaga la identidad
    // ilustrada —la parte ruidosa— y se conservan las dos cosas que la carta
    // tiene que seguir diciendo aunque esté en segundo plano.
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    for (const code of [ILLUSTRATED, DARK]) {
      const state = await veil(page, code)
      expect(Number(state.zIndex), `${code}: velo`).toBeLessThan(
        Number(state.pillZIndex),
      )
    }
  })

  test('el estado se lee en los cuatro estados de la carta', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const pillOf = (code: string) =>
      page.locator(`${CARD}[data-code="${code}"] ${PILL}`)

    // Reposo.
    await expect(pillOf(DARK)).toBeVisible()
    const resting = await pillOf(DARK).textContent()
    expect(resting?.trim()).toBeTruthy()

    // Hover.
    await page.locator(`${CARD}[data-code="${DARK}"]`).hover()
    await expect(pillOf(DARK)).toBeVisible()

    // Seleccionada.
    await select(page, DARK)
    await expect(pillOf(DARK)).toBeVisible()
    await expect(pillOf(DARK)).toHaveText(resting!.trim())

    // Atenuada: sigue en pantalla y con el MISMO texto. El estado operacional
    // no depende del protagonismo de la carta.
    await select(page, SIMPLE)
    await expect(pillOf(DARK)).toBeVisible()
    await expect(pillOf(DARK)).toHaveText(resting!.trim())
  })

  test('señalar una carta atenuada le devuelve su presencia entera', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    expect((await veil(page, ILLUSTRATED)).opacity).toBeGreaterThan(0.3)

    await page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`).hover()
    // Se sondea en vez de esperar un plazo fijo: el valor CONVERGE a 0 y lo
    // que se afirma es el destino, no cuánto tarda en llegar.
    await expect
      .poll(async () => (await veil(page, ILLUSTRATED)).opacity)
      .toBe(0)
  })

  test('el foco por teclado equivale al puntero', async ({ page }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    /*
     * Se compara la elevación DESCOMPUESTA y con tolerancia, no la cadena de
     * la matriz. La curva del shell es un ease-out de cola larga, así que dos
     * lecturas igual de válidas pueden diferir en la última centésima; exigir
     * cadenas idénticas convertiría este test en un detector de milisegundos
     * en vez de en la comprobación de que teclado y puntero llegan al MISMO
     * gesto.
     */
    const liftOfStack = () =>
      page.evaluate((selector) => {
        const m = new DOMMatrix(
          getComputedStyle(document.querySelector(selector)!).transform,
        )
        return { scale: m.a, y: m.f }
      }, `${STACK}[data-code="${ILLUSTRATED}"]`)

    await page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`).hover()
    await expect
      .poll(async () => (await veil(page, ILLUSTRATED)).opacity)
      .toBe(0)
    await settle(page)
    const hovered = await liftOfStack()
    expect(hovered.scale, 'el puntero agranda el mazo').toBeGreaterThan(1)
    expect(hovered.y, 'el puntero eleva el mazo').toBeLessThan(-2)
    expect((await veil(page, ILLUSTRATED)).opacity).toBe(0)

    await page.mouse.move(4, 4)
    await settle(page)

    /*
     * Se llega con el TABULADOR, no con `.focus()`.
     *
     * `:focus-visible` no es «tiene el foco»: es «el foco debe verse», y el
     * navegador lo decide por la última modalidad de entrada. Después de un
     * clic —y seleccionar una coordinación es un clic— un foco programático
     * NO lo activa, así que un test que use `.focus()` aquí mide un estado
     * que ningún usuario de teclado llega a ver. Se enfoca la carta anterior
     * y se pulsa Tab: eso cambia la modalidad a teclado y avanza al siguiente
     * nodo, que en orden de DOM es el que interesa.
     */
    await page.locator(`${CARD}[data-code="${DARK}"]`).focus()
    await page.keyboard.press('Tab')
    await expect(page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`)).toBeFocused()
    await expect
      .poll(async () => (await veil(page, ILLUSTRATED)).opacity)
      .toBe(0)
    await settle(page)
    const focused = await liftOfStack()

    // El teclado no es un camino de segunda: misma elevación y misma claridad.
    expect(Math.abs(focused.scale - hovered.scale)).toBeLessThan(0.01)
    expect(Math.abs(focused.y - hovered.y)).toBeLessThan(1)
  })

  test('jerarquía de apilado: observada > señalada > reposo', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)
    await page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`).hover()
    await settle(page)

    const z = await page.evaluate(
      ({ slotSelector, selected, hovered }) => {
        const read = (code: string) => {
          const slot = document
            .querySelector(`[data-testid="coordination-card"][data-code="${code}"]`)!
            .closest(slotSelector)!
          return Number(getComputedStyle(slot).zIndex)
        }
        const resting = Array.from(document.querySelectorAll(slotSelector))
          .filter((slot) => (slot as HTMLElement).dataset.state === 'dimmed')
          .map((slot) => Number(getComputedStyle(slot).zIndex))
        return {
          selected: read(selected),
          hovered: read(hovered),
          restingMax: Math.max(...resting),
        }
      },
      { slotSelector: SLOT, selected: SIMPLE, hovered: ILLUSTRATED },
    )

    // La alternativa señalada sube por encima de sus vecinas —con solape del
    // 25 % quedar debajo la dejaría recortada justo al apuntarla— pero NO
    // eclipsa a la observada, que es la referencia de la lectura en curso.
    expect(z.hovered).toBeGreaterThan(60 - 1)
    expect(z.selected).toBeGreaterThan(z.hovered)
  })

  test('una autoridad de transform por nodo', async ({ page }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)

    const read = () =>
      page.evaluate(
      ({ selected, dimmed }) => {
        const of = (code: string) => {
          const card = document.querySelector(
            `[data-testid="coordination-card"][data-code="${code}"]`,
          )!
          // Se compara la MATRIZ, no la cadena: un nodo sin transform puede
          // computar `none` o la identidad según haya tenido transición, y las
          // dos significan exactamente lo mismo.
          const moves = (value: string) => {
            if (value === 'none') return false
            const m = new DOMMatrix(value)
            return (
              Math.abs(m.a - 1) > 0.001 ||
              Math.abs(m.d - 1) > 0.001 ||
              Math.abs(m.b) > 0.001 ||
              Math.abs(m.e) > 0.1 ||
              Math.abs(m.f) > 0.1
            )
          }
          return {
            slot: moves(
              getComputedStyle(card.closest('.operational-table__slot')!).transform,
            ),
            stack: moves(
              getComputedStyle(card.closest('.coordination-deck-stack')!).transform,
            ),
            card: moves(getComputedStyle(card).transform),
          }
        }
        return { selected: of(selected), dimmed: of(dimmed) }
      },
      { selected: SIMPLE, dimmed: ILLUSTRATED },
      )

    // El realce entra con transición; se espera a que haya llegado antes de
    // repartir culpas entre las tres capas.
    await expect.poll(async () => (await read()).selected.stack).toBe(true)
    const owners = await read()

    // La CARTA nunca transforma. Es la regla que se rompió en R4.1 sin que
    // nadie lo notara: había un `transform` declarado en `.coordination-card`
    // que el hover global de botón del shell ganaba siempre, así que la hoja
    // decía una cosa y la pantalla hacía otra.
    expect(owners.selected.card, 'la carta observada no transforma').toBe(false)
    expect(owners.dimmed.card, 'la carta atenuada no transforma').toBe(false)

    // El SLOT posiciona: siempre desplaza, seleccionada o no.
    expect(owners.selected.slot).toBe(true)
    expect(owners.dimmed.slot).toBe(true)

    // El MAZO expresa el énfasis: la observada lo tiene, la atenuada en reposo
    // no. Así se sabe que el realce no se coló en la capa de posición.
    expect(owners.selected.stack, 'el mazo observado se realza').toBe(true)
    expect(owners.dimmed.stack, 'el mazo atenuado está quieto').toBe(false)
  })

  test('la observada se endereza a MEDIAS: sigue en la curva', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const before = await page.evaluate(
      (code) =>
        new DOMMatrix(
          getComputedStyle(
            document
              .querySelector(
                `[data-testid="coordination-card"][data-code="${code}"]`,
              )!
              .closest('.operational-table__slot')!,
          ).transform,
        ),
      SIMPLE,
    )
    const baseAngle =
      Math.atan2(before.b, before.a) * (180 / Math.PI)

    await select(page, SIMPLE)

    /*
     * El ángulo final es la SUMA de dos capas: el slot pone la rotación del
     * arco y el mazo la contrarrota en parte. Se sondea hasta que la
     * contrarrotación ha entrado —llega con transición— porque leer antes
     * devuelve el ángulo del arco intacto, que es indistinguible de «la
     * contrarrotación no existe» y convertiría este test en un falso negativo
     * intermitente.
     */
    const readAngle = () =>
      page.evaluate((code) => {
        const card = document.querySelector(
          `[data-testid="coordination-card"][data-code="${code}"]`,
        )!
        const slot = new DOMMatrix(
          getComputedStyle(card.closest('.operational-table__slot')!).transform,
        )
        const stack = new DOMMatrix(
          getComputedStyle(card.closest('.coordination-deck-stack')!).transform,
        )
        const deg = (m: DOMMatrix) => Math.atan2(m.b, m.a) * (180 / Math.PI)
        return { total: deg(slot) + deg(stack), counter: deg(stack) }
      }, SIMPLE)

    await expect
      .poll(async () => Math.abs((await readAngle()).counter) > 0.5)
      .toBe(true)
    const { total: angle } = await readAngle()

    // Ni queda como estaba —no habría señal— ni completamente recta —rompería
    // el arco y se leería como extraída de la mesa—. La mitad es la que se
    // eligió comparando capturas de los tres valores.
    expect(Math.abs(angle)).toBeLessThan(Math.abs(baseAngle) * 0.75)
    expect(Math.abs(angle)).toBeGreaterThan(Math.abs(baseAngle) * 0.25)
  })

  test('un nodo sin subordinaciones no insinúa que las tenga', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const stack = page.locator(`${STACK}[data-code="${ILLUSTRATED}"]`)
    await expect(stack).toHaveAttribute('data-children', '0')
    await expect(
      stack.locator('[data-testid="coordination-deck-peek"]'),
    ).toHaveCount(0)

    // Y al señalarlo se comporta como carta simple: acusa recibo y nada más.
    const before = await stack.evaluate((node) => getComputedStyle(node).transform)
    expect(before).toBe('none')

    await page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`).hover()
    await expect
      .poll(async () => stack.evaluate((node) => getComputedStyle(node).transform))
      .not.toBe('none')

    // El nombre accesible tampoco puede mencionar subordinaciones.
    const label = await page
      .locator(`${CARD}[data-code="${ILLUSTRATED}"]`)
      .getAttribute('aria-label')
    expect(label).not.toContain('subordinaci')
  })

  test('el mazo abierto cambia sus cantos por la mano real', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    // En reposo el mazo se lee como mazo: cinco cantos decorativos detrás.
    const peeks = page.locator(
      `${STACK}[data-code="${PARENT}"] [data-testid="coordination-deck-peek"]`,
    )
    await expect(peeks).toHaveCount(5)

    await select(page, PARENT)

    /*
     * Abierto, esos cantos dejan de dibujarse y en su lugar están las cinco
     * cartas de verdad. Mantener ambos representaría diez veces cinco
     * coordinaciones, que es justo la duplicación que no debe existir.
     */
    await expect(
      page.locator(
        `${STACK}[data-code="${PARENT}"] [data-testid="coordination-deck-peek"]:visible`,
      ),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="coordination-deck-fan-slot"]'),
    ).toHaveCount(5)
  })

  test('nada de esto desborda la página', async ({ page }) => {
    await install(page)
    await openTable(page)
    await select(page, SIMPLE)
    await page.locator(`${CARD}[data-code="${ILLUSTRATED}"]`).hover()

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

test.describe('gramática de tarjetas · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('se llega al mismo velo sin recorrido', async ({ page }) => {
    await install(page)
    // `reducedMotion` del proyecto no alcanza a la página: `matchMedia`
    // responde `false`. Emularlo aquí sí funciona, y comprobarlo antes evita
    // que el test pase por no estar midiendo nada.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openTable(page)
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)

    // Con una coordinación SIMPLE observada: lo que se mide es el velo de las
    // NO observadas, y con un mazo abierto las otras ocho se retiran de la
    // escena en lugar de atenuarse.
    await page.locator(`${CARD}[data-code="${SIMPLE}"]`).click()
    await page.mouse.move(4, 4)
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
        ),
    )

    // Sin transición el velo está puesto ya, sin esperar a un reloj.
    expect((await veil(page, ILLUSTRATED)).opacity).toBeGreaterThan(0.3)

    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="coordination-card"]')).map(
        (card) =>
          Number.parseFloat(
            getComputedStyle(card, '::after').transitionDuration,
          ),
      ),
    )
    expect(durations).toHaveLength(9)
    expect(durations.every((value) => value < 0.01)).toBe(true)
  })
})
