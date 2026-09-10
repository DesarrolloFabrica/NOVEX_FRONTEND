import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Selección de coordinación y LEVEL 1.
 *
 * El API de situaciones acepta un solo `status` por petición, así que cada
 * coordinación nueva cuesta DOS peticiones (OPEN + IN_PROGRESS) y volver a una
 * ya visitada cuesta cero.
 *
 * Vive en su propio fichero para no mezclarse con el estado global en reposo:
 * son dos superficies distintas y así un fallo dice de inmediato cuál falló.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'

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

const UUID_OF = {
  general: '00000000-0000-4000-8000-000000000001',
  operacionesAcademicas: '00000000-0000-4000-8000-000000000008',
  especializaciones: '00000000-0000-4000-8000-000000000006',
} as const

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

function situationFixture(
  id: string,
  title: string,
  severity: string,
  status: string,
) {
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
    status,
    occurredAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  }
}

/** Problemas por coordinación y estado. `coord-general` queda sin ninguno. */
const PROBLEMS: Record<string, Record<string, unknown[]>> = {
  [UUID_OF.operacionesAcademicas]: {
    OPEN: [
      situationFixture('ing-1', 'Aulas sin conectividad', 'CRITICAL', 'OPEN'),
      situationFixture('ing-2', 'Retraso en laboratorios', 'LOW', 'OPEN'),
      situationFixture('ing-3', 'Docente sin asignar', 'MEDIUM', 'OPEN'),
    ],
    IN_PROGRESS: [
      situationFixture('ing-4', 'Cupos insuficientes', 'HIGH', 'IN_PROGRESS'),
      situationFixture(
        'ing-5',
        'Equipos en mantenimiento',
        'MEDIUM',
        'IN_PROGRESS',
      ),
    ],
  },
  [UUID_OF.especializaciones]: {
    OPEN: [situationFixture('neg-1', 'Convenio vencido', 'HIGH', 'OPEN')],
    IN_PROGRESS: [],
  },
  [UUID_OF.general]: { OPEN: [], IN_PROGRESS: [] },
}

/**
 * Corta las fuentes externas: `index.html` enlaza Google Fonts y sin salida a
 * internet esa petición cuelga, de modo que el evento `load` no se dispara.
 */
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

async function installApi(page: Page, options: { fail?: boolean } = {}) {
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
      if (options.fail) {
        await route.fulfill({ status: 500, json: { message: 'E2E' } })
        return
      }
      const coordinationId = url.searchParams.get('coordinationId') ?? ''
      const status = url.searchParams.get('status') ?? ''
      const items = PROBLEMS[coordinationId]?.[status] ?? []
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return requested
}

async function openExperience(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
}

function level1Calls(requested: readonly string[]): string[] {
  return requested.filter((entry) => entry.includes('/situations'))
}


/**
 * Selecciona una coordinación pulsándola DONDE ESTÁ, en la mesa.
 *
 * Hasta R4.2 había que traerla antes al slot frontal de un carrusel, porque el
 * modo seleccionado escondía las demás coordinaciones. Con la selección
 * in-place las nueve están siempre en pantalla y en su sitio, así que el cambio
 * de coordinación es un único clic directo. La ausencia de rodeo es parte de lo
 * que se está comprobando: si algún día hiciera falta un paso intermedio, este
 * helper dejaría de compilar en lugar de esconderlo.
 */
async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).click()
  await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
    'data-code',
    code,
  )
}

const PANEL = '[data-testid="coordination-problem-panel"]'
const SLOT = '[data-testid="coordination-table-slot"]'

test.describe('selección in-place de coordinación', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el hover orienta al personaje sin cambiar su estado', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    const character = page.getByTestId('direction-character')
    await expect(character).toHaveAttribute('data-orientation', 'NEUTRAL')
    await expect(character).toHaveAttribute('data-interaction', 'IDLE')

    // Extremo izquierdo del arco.
    await page.locator(`${CARD}[data-code="coord-general"]`).hover()
    await expect(character).toHaveAttribute('data-orientation', 'LEFT')
    await expect(character).toHaveAttribute('data-interaction', 'HOVER')
    // El estado sigue siendo el de la Dirección, no el de la carta.
    await expect(character).toHaveAttribute('data-status', 'CRITICO')

    // Extremo derecho del arco. Operación Académica es el nodo CENTRAL de los
    // nueve, así que ya no sirve para comprobar el giro: ahí el personaje mira
    // al frente, que es justo lo que debe hacer.
    await page.locator(`${CARD}[data-code="coord-fabrica-contenidos"]`).hover()
    await expect(character).toHaveAttribute('data-orientation', 'RIGHT')
    await expect(character).toHaveAttribute('data-status', 'CRITICO')
  })

  test('la coordinación seleccionada se queda EN SU SITIO', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    // Geometría de las nueve antes de seleccionar. Se lee de la matriz del
    // slot y no del rectángulo, que mezclaría traslación con rotación.
    const geometry = () =>
      page.evaluate(
        (selector) =>
          Array.from(document.querySelectorAll(selector)).map((slot) => {
            const matrix = new DOMMatrix(getComputedStyle(slot).transform)
            return [
              slot
                .querySelector('[data-testid="coordination-card"]')!
                .getAttribute('data-code'),
              Math.round(matrix.e),
              Math.round(matrix.f),
              Math.round(Math.atan2(matrix.b, matrix.a) * 1000),
            ].join('/')
          }),
        SLOT,
      )

    const resting = await geometry()
    expect(resting).toHaveLength(9)

    await select(page, 'coord-operaciones-academicas')

    // Ni una carta cambia de sitio. Es la regla congelada de la memoria
    // espacial, y una selección es precisamente el momento en que más se
    // necesita: quien acaba de pulsar una coordinación tiene que poder saltar a
    // su vecina sin releer los rótulos.
    expect(await geometry()).toEqual(resting)
  })

  test('seleccionar la pone bajo observación sin abrir otra escena', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    // La mesa sigue siendo la mesa: nueve cartas, ningún carrusel.
    await expect(page.getByTestId('coordination-table')).toBeVisible()
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
    /* Estos dos `testid` ya no los produce ningún componente: R5.2 borró
       `CoordinationCarousel`. Las aserciones se conservan como guardia contra
       su reaparición —el modo seleccionado in-place existe precisamente para
       no volver a tener dos escenas— y no porque quede código que las emita. */
    await expect(page.getByTestId('coordination-carousel')).toHaveCount(0)
    await expect(page.getByTestId('carousel-slot')).toHaveCount(0)
    await expect(page.getByTestId('active-coordination-card')).toHaveCount(0)

    // Una observada y ocho acompañando atenuadas, no ocultas.
    await expect(page.locator(`${SLOT}[data-state="selected"]`)).toHaveCount(1)
    await expect(page.locator(`${SLOT}[data-state="dimmed"]`)).toHaveCount(8)

    const panel = page.getByTestId('coordination-problem-panel')
    await expect(panel).toBeVisible()
    // El estado del panel es el de LEVEL 0: no se recalcula con la lista.
    await expect(panel).toHaveAttribute('data-status', 'CRITICO')

    await expect(page.getByTestId('operational-breadcrumb')).toContainText(
      'Operación Académica',
    )
    await expect(page.getByTestId('breadcrumb-direction')).toBeVisible()

    const character = page.getByTestId('direction-character')
    await expect(character).toHaveAttribute('data-interaction', 'SELECTED')
    await expect(character).toHaveAttribute('data-status', 'CRITICO')

    // Problemas ordenados por prioridad, con título y severidad.
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    await expect(page.getByTestId('problem-row').first()).toContainText(
      'Aulas sin conectividad',
    )
    await expect(
      page.getByTestId('problem-row').first().getByTestId('problem-row-severity'),
    ).toHaveText('Crítica')

    // Dos peticiones LEVEL 1, con el UUID y sin estados cerrados.
    expect(level1Calls(requested)).toHaveLength(2)
    expect(
      level1Calls(requested).every((entry) =>
        entry.includes(UUID_OF.operacionesAcademicas),
      ),
    ).toBe(true)
    expect(level1Calls(requested).join(' ')).not.toContain('CLOSED')
    expect(level1Calls(requested).join(' ')).not.toContain('RESOLVED')
    expect(
      requested.filter((entry) => entry.includes('/operational-overview')),
    ).toHaveLength(1)

    // La página no necesita scroll: miga, personaje, mesa y panel caben.
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector('.novex-os-deck__content')
      return {
        page:
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
        deck: scroller ? scroller.scrollHeight - scroller.clientHeight : 0,
        x:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      }
    })
    expect(overflow.x).toBeLessThanOrEqual(0)
    expect(overflow.page).toBeLessThanOrEqual(0)
    expect(overflow.deck).toBeLessThanOrEqual(1)

    // La miga es completamente visible, no la recorta el chrome.
    const crumbBox = await page.getByTestId('operational-breadcrumb').boundingBox()
    expect(crumbBox).not.toBeNull()
    expect(crumbBox!.y).toBeGreaterThan(0)

    // Aproximadamente 3 filas visibles sin desplazar la lista.
    const listBox = await page
      .getByTestId('coordination-panel-problems')
      .boundingBox()
    const rowBox = await page.getByTestId('problem-row').first().boundingBox()
    expect(listBox).not.toBeNull()
    expect(rowBox).not.toBeNull()
    const visibleRows = listBox!.height / rowBox!.height
    expect(visibleRows).toBeGreaterThan(2.2)
    expect(visibleRows).toBeLessThan(4)

    await page.screenshot({
      path: testInfo.outputPath('selected-in-place-1440x900.png'),
      fullPage: false,
    })
  })

  test('el panel se ancla a la carta que lo abre', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    // Se recorren las cinco posiciones señaladas como de riesgo: primer nodo,
    // nodo central, último, el mazo y el nodo de presentación legacy.
    for (const code of [
      'coord-general',
      'coord-especializaciones',
      'coord-operaciones-academicas',
      'coord-homologaciones',
      'coord-fabrica-contenidos',
    ]) {
      await select(page, code)

      const geometry = await page.evaluate(
        ({ panelSelector, target }) => {
          const panel = document
            .querySelector(panelSelector)!
            .getBoundingClientRect()
          const card = document
            .querySelector(
              `[data-testid="coordination-card"][data-code="${target}"]`,
            )!
            .getBoundingClientRect()
          const host = document
            .querySelector('.novex-os-deck__content')!
            .getBoundingClientRect()
          return {
            panelCentre: panel.left + panel.width / 2,
            cardCentre: card.left + card.width / 2,
            escapesLeft: panel.left < host.left - 1,
            escapesRight: panel.right > host.right + 1,
            below: panel.top >= card.bottom - 30,
          }
        },
        { panelSelector: PANEL, target: code },
      )

      // Cae debajo de su carta y cerca de ella, nunca centrado por defecto.
      expect(geometry.below, `${code}: el panel cuelga de su carta`).toBe(true)
      expect(
        Math.abs(geometry.panelCentre - geometry.cardCentre),
        `${code}: el panel sigue a su carta`,
      ).toBeLessThan(180)

      // Y nunca se sale del área de contenido, ni en los extremos.
      expect(geometry.escapesLeft, `${code}: no se sale por la izquierda`).toBe(
        false,
      )
      expect(geometry.escapesRight, `${code}: no se sale por la derecha`).toBe(
        false,
      )
    }
  })

  test('cambio directo entre coordinaciones y vuelta con caché', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    expect(level1Calls(requested)).toHaveLength(2)

    // Cambio directo: un clic sobre la vecina, sin pasar por el estado global.
    await select(page, 'coord-especializaciones')
    await expect(page.getByTestId('problem-row')).toHaveCount(1)
    await expect(page.getByTestId('operational-breadcrumb')).toContainText(
      'Especializaciones',
    )
    // La anterior vuelve al reposo sin desmontarse: sigue en la mesa.
    await expect(page.locator(`${SLOT}[data-state="selected"]`)).toHaveCount(1)
    await expect(
      page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`),
    ).toHaveAttribute('aria-pressed', 'false')
    // Nunca se pasó por el estado global: la miga no desapareció por el camino.
    await expect(page.getByTestId('operational-breadcrumb')).toBeVisible()
    expect(level1Calls(requested)).toHaveLength(4)

    await page.screenshot({
      path: testInfo.outputPath('selected-direct-switch-1440x900.png'),
      fullPage: false,
    })

    // Volver a una ya cargada no cuesta ninguna petición: estaba en caché.
    await select(page, 'coord-operaciones-academicas')
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    expect(level1Calls(requested)).toHaveLength(4)
  })

  test('el cambio directo también funciona con el teclado', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    await page.locator(`${CARD}[data-code="coord-b2b"]`).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
      'data-code',
      'coord-b2b',
    )

    await page.locator(`${CARD}[data-code="coord-saber-pro"]`).focus()
    await page.keyboard.press('Space')
    await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
      'data-code',
      'coord-saber-pro',
    )
  })

  test('las migas devuelven al estado global', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-especializaciones')

    await page.getByTestId('breadcrumb-direction').click()

    await expect(page.getByTestId('coordination-problem-panel')).toHaveCount(0)
    await expect(page.getByTestId('operational-breadcrumb')).toHaveCount(0)
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
    await expect(page.locator(`${SLOT}[data-state="resting"]`)).toHaveCount(9)
    await expect(page.locator(`${CARD}[aria-pressed="true"]`)).toHaveCount(0)
    await expect(page.getByTestId('direction-character')).toHaveAttribute(
      'data-interaction',
      'IDLE',
    )
  })

  test('una coordinación sin problemas dice Todo bajo control', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-general')

    await expect(page.getByTestId('coordination-panel-empty')).toHaveText(
      'Todo bajo control',
    )
    await expect(page.getByTestId('problem-row')).toHaveCount(0)
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)

    await page.screenshot({
      path: testInfo.outputPath('selected-stable-empty-1440x900.png'),
      fullPage: false,
    })
  })

  test('un fallo de LEVEL 1 no se disfraza de Todo bajo control', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page, { fail: true })
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    await expect(page.getByTestId('coordination-panel-error')).toBeVisible()
    await expect(page.getByTestId('coordination-panel-empty')).toHaveCount(0)
    // La coordinación sigue seleccionada y con su estado de LEVEL 0.
    await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
      'data-status',
      'CRITICO',
    )
    // Y se puede cambiar a otra, que es lo que un error no debe bloquear.
    await select(page, 'coord-especializaciones')
  })

  test('aria-pressed distingue a la observada, y los problemas son botones', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    await expect(page.locator(`${CARD}[aria-pressed="true"]`)).toHaveCount(1)
    await expect(page.locator(`${CARD}[aria-pressed="false"]`)).toHaveCount(8)
    await expect(page.locator(`${CARD}[aria-pressed="true"]`)).toHaveAttribute(
      'data-code',
      'coord-operaciones-academicas',
    )

    await expect(page.getByTestId('problem-row').first()).toHaveAttribute(
      'aria-label',
      /Severidad Crítica/,
    )
  })

  test('las otras ocho siguen recibiendo el puntero', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    // Atenuadas no es lo mismo que decorativas: el clic directo sobre una
    // vecina es la navegación principal del modo seleccionado, así que ninguna
    // puede quedar tapada por el panel ni por la carta elevada.
    const unreachable = await page.evaluate((panelSelector) => {
      const panel = document.querySelector(panelSelector)!.getBoundingClientRect()
      return Array.from(
        document.querySelectorAll('[data-testid="coordination-card"]'),
      )
        .map((card) => {
          const rect = card.getBoundingClientRect()
          // Se muestrea por encima del panel: donde el panel solapa a una carta
          // es legítimo que gane él, porque es el contenido de la observada.
          const y = Math.min(rect.top + rect.height / 2, panel.top - 8)
          const hit = document.elementFromPoint(rect.left + rect.width / 2, y)
          return card.contains(hit) ? null : card.getAttribute('data-code')
        })
        .filter(Boolean)
    }, PANEL)

    expect(unreachable).toEqual([])
  })

  test('Operación Académica seleccionada conserva su mazo, sin abrirlo', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')

    // La noción de mazo se mantiene: las cinco subordinaciones siguen asomando
    // detrás de su padre.
    await expect(page.getByTestId('coordination-deck-peek')).toHaveCount(5)

    // Pero NO se despliegan. Con LEVEL 1 abierto, una subbaraja subiendo al
    // mismo hueco competiría con la lectura y empujaría hacia abajo justo a la
    // carta que tiene que quedarse quieta. El despliegue interactivo es R7.
    const rise = async () =>
      page.evaluate(() => {
        const stack = document.querySelector(
          '[data-testid="coordination-deck-stack"][data-code="coord-operaciones-academicas"]',
        )!
        const card = stack
          .querySelector('[data-testid="coordination-card"]')!
          .getBoundingClientRect()
        return Math.round(
          Math.max(
            ...Array.from(
              stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
            ).map((peek) => card.top - peek.getBoundingClientRect().top),
          ),
        )
      })

    const closed = await rise()
    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).hover()
    await page.waitForTimeout(500)

    // Abrir la subbaraja levanta el abanico unos 44 px sobre el borde de la
    // carta; aquí el ascenso no se mueve más de un píxel, que es el acuse de
    // recibo del propio shell (`button:hover { translateY(-1px) }`) sobre la
    // carta y no sobre los peeks.
    expect(Math.abs((await rise()) - closed)).toBeLessThanOrEqual(2)
    expect(await rise()).toBeLessThan(0)
  })
})

test.describe('selección in-place · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('se llega al mismo estado final sin recorrido', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    // `reducedMotion` en la configuración del proyecto no alcanza a la página:
    // `matchMedia` responde `false`. Emularlo aquí sí funciona, y comprobarlo
    // antes evita que el test pase por no estar midiendo nada.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openExperience(page)
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)

    await select(page, 'coord-operaciones-academicas')

    // El panel llega entero y opaco, sin desplazamiento pendiente.
    const panel = page.getByTestId('coordination-problem-panel')
    await expect(panel).toBeVisible()
    const settled = await panel.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        opacity: Number(style.opacity),
        translateY: Math.round(new DOMMatrix(style.transform).f),
      }
    })
    expect(settled.opacity).toBe(1)
    expect(settled.translateY).toBe(0)

    // Y la mesa no anima el cambio de énfasis.
    const durations = await page
      .locator('.coordination-deck-stack')
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          Number.parseFloat(getComputedStyle(node).transitionDuration),
        ),
      )
    expect(durations.length).toBe(9)
    expect(durations.every((value) => value < 0.01)).toBe(true)
  })
})

test.describe('selección in-place · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('personaje, mesa completa y panel caben sin scroll', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await select(page, 'coord-operaciones-academicas')
    await expect(page.getByTestId('problem-row')).toHaveCount(5)

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

    await expect(page.getByTestId('direction-character')).toBeVisible()
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
    await expect(page.getByTestId('carousel-slot')).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('selected-in-place-1920x1080.png'),
      fullPage: false,
    })
  })
})
