import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Preview de subbaraja en hover y foco (R4).
 *
 * Es un comportamiento visual, no navegación: lo que aquí se vigila es que la
 * subbaraja se abra con las dos entradas —puntero y teclado—, que se cierre al
 * salir, que NO introduzca controles ni paradas de tabulador, y que no le quite
 * el clic a ninguna coordinación vecina.
 *
 * La geometría de la apertura vive en las pruebas unitarias de `deckPeek`; aquí
 * solo se comprueba lo que necesita un navegador de verdad.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
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
 * Cuánto ASOMA la subbaraja por encima del borde alto del padre, en píxeles.
 *
 * Desde R4.2 el abanico se abre hacia arriba, así que la señal de apertura es
 * este ascenso. En reposo el valor es negativo —las cartas del mazo cerrado
 * quedan por debajo del borde del padre—, y al abrirse pasa a positivo. Se
 * mide contra el borde ALTO porque es la cota que la subbaraja no puede cruzar
 * sin tapar la lectura institucional.
 */
async function reach(page: Page, code = PARENT): Promise<number> {
  return page.evaluate((parentCode) => {
    const stack = document.querySelector(
      `[data-testid="coordination-deck-stack"][data-code="${parentCode}"]`,
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
      Math.max(
        ...peeks.map((peek) => card.top - peek.getBoundingClientRect().top),
      ),
    )
  }, code)
}

test.describe('preview de subbaraja · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('en reposo la mesa no cambia respecto a R3.3', async ({ page }) => {
    await install(page)
    await openTable(page)

    await expect(page.locator(CARD)).toHaveCount(9)
    // Baraja cerrada: los cantos asoman unas decenas de píxeles POR DEBAJO del
    // padre, no un abanico. Se mide contra el pie y no con `reach`, que desde
    // R4.2 vigila el ascenso: el reposo sigue creciendo hacia abajo y ese es
    // justamente el estado que aquí se congela.
    const skirt = await page.evaluate((selector) => {
      const stack = document.querySelector(selector)!
      const card = stack
        .querySelector('[data-testid="coordination-card"]')!
        .getBoundingClientRect()
      return Math.round(
        Math.max(
          ...Array.from(
            stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
          ).map((peek) => peek.getBoundingClientRect().bottom - card.bottom),
        ),
      )
    }, `[data-testid="coordination-deck-stack"][data-code="${PARENT}"]`)
    expect(skirt).toBeGreaterThan(3)
    expect(skirt).toBeLessThan(60)
  })

  test('el hover sobre el padre abre la subbaraja', async ({ page }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect
      .poll(async () => (await reach(page)) > closed + 25)
      .toBe(true)
  })

  test('y al salir el puntero vuelve al reposo', async ({ page }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)

    // Se lleva el puntero a una zona muerta de la escena, no a otra carta.
    await page.mouse.move(10, 10)
    await expect.poll(async () => reach(page)).toBe(closed)
  })

  test('el FOCO del padre abre la misma subbaraja', async ({ page }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    // Con teclado, para que `:focus-visible` se active como en uso real.
    await page.locator(`${CARD}[data-code="coord-especializaciones"]`).focus()
    await page.keyboard.press('Tab')
    await expect(
      page.locator(`${CARD}[data-code="${PARENT}"]`),
    ).toBeFocused()

    await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)
  })

  test('y al perder el foco vuelve al reposo', async ({ page }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="coord-especializaciones"]`).focus()
    await page.keyboard.press('Tab')
    await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)

    await page.keyboard.press('Tab')
    await expect.poll(async () => reach(page)).toBe(closed)
  })

  test('solo los nodos con hijas tienen preview', async ({ page }) => {
    await install(page)
    await openTable(page)

    // Fábrica está preparada como mazo pero hoy no tiene subordinaciones.
    const fabrica = page.locator(
      '[data-testid="coordination-deck-stack"][data-code="coord-fabrica-contenidos"]',
    )
    await expect(fabrica).toHaveAttribute('data-children', '0')
    await expect(fabrica.locator(PEEK)).toHaveCount(0)

    await page.locator(`${CARD}[data-code="coord-fabrica-contenidos"]`).hover()
    await expect(fabrica.locator(PEEK)).toHaveCount(0)
    expect(await reach(page, 'coord-fabrica-contenidos')).toBe(0)

    // Y un nodo plano tampoco inventa nada.
    await page.locator(`${CARD}[data-code="coord-saber-pro"]`).hover()
    await expect(page.locator(PEEK)).toHaveCount(5)
  })

  test('la subbaraja insinúa las CINCO hijas de Operación Académica', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    // La apertura tiene una transición de 240 ms, así que hay que esperar a que
    // termine antes de medir. Playwright declara `reducedMotion: 'reduce'` en la
    // configuración, pero esa emulación NO llega a la página en esta versión
    // —`matchMedia` la reporta como false, mientras que `colorScheme` sí llega—,
    // de modo que aquí la transición corre de verdad.
    await expect.poll(async () => (await reach(page)) > closed + 25).toBe(true)

    const stack = page.locator(
      `[data-testid="coordination-deck-stack"][data-code="${PARENT}"]`,
    )
    await expect(stack.locator(PEEK)).toHaveCount(5)

    const codes = await stack
      .locator(PEEK)
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-code')))
    expect(codes).toEqual([
      'coord-bellas-artes',
      'coord-empresarial',
      'coord-ingenierias',
      'coord-transversales',
      'coord-negocios',
    ])

    // Abiertas se reparten a los lados y son MINI cartas: más pequeñas que el
    // padre, sin competir con él.
    const geometry = await stack.evaluate((node) => {
      const card = node
        .querySelector('[data-testid="coordination-card"]')!
        .getBoundingClientRect()
      return Array.from(
        node.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => {
        const rect = peek.getBoundingClientRect()
        return { width: rect.width, centre: rect.left + rect.width / 2 - card.left }
      })
    })
    const parentWidth = (await page
      .locator(`${CARD}[data-code="${PARENT}"]`)
      .boundingBox())!.width

    for (const child of geometry) {
      expect(child.width).toBeLessThan(parentWidth * 0.8)
    }
    // Se abren en abanico: cada una a la derecha de la anterior.
    for (let index = 1; index < geometry.length; index += 1) {
      expect(geometry[index].centre).toBeGreaterThan(geometry[index - 1].centre)
    }
  })

  test('el preview no introduce controles ni paradas de tabulador', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()

    // Nueve controles en la mesa, uno por mazo: ni uno más con la subbaraja
    // abierta.
    await expect(
      page.locator('[data-testid="coordination-table-slot"] button'),
    ).toHaveCount(9)
    await expect(page.locator(`${PEEK}[tabindex]`)).toHaveCount(0)
    await expect(page.locator(`button${PEEK}`)).toHaveCount(0)

    // Y siguen fuera del árbol de accesibilidad.
    const hidden = await page
      .locator(PEEK)
      .evaluateAll((nodes) =>
        nodes.every((node) => node.getAttribute('aria-hidden') === 'true'),
      )
    expect(hidden).toBe(true)
  })

  test('con la subbaraja abierta las vecinas siguen recibiendo el clic', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()

    // La subbaraja no captura eventos, así que ninguna vecina puede quedarse
    // sin clic mientras está abierta.
    for (const neighbour of [
      'coord-proyeccion-social',
      'coord-especializaciones',
    ]) {
      const reachable = await page.evaluate((code) => {
        const card = document.querySelector(
          `[data-testid="coordination-card"][data-code="${code}"]`,
        )!
        const rect = card.getBoundingClientRect()
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )
        return card.contains(hit)
      }, neighbour)
      expect(reachable).toBe(true)
    }

    // Y de hecho se puede seleccionar una vecina con la subbaraja abierta.
    await page.locator(`${CARD}[data-code="coord-proyeccion-social"]`).click()
    await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
      'data-code',
      'coord-proyeccion-social',
    )
  })

  test('el clic del padre sigue seleccionando al padre', async ({ page }) => {
    await install(page)
    await openTable(page)

    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await page.locator(`${CARD}[data-code="${PARENT}"]`).click()

    // El preview no sustituye a la selección ni abre una navegación nueva: el
    // padre queda bajo observación con su panel, y la mesa sigue siendo la
    // mesa. Nunca se selecciona una hija por haber pasado el puntero.
    await expect(page.getByTestId('coordination-problem-panel')).toHaveAttribute(
      'data-code',
      PARENT,
    )
    await expect(page.getByTestId('coordination-table')).toBeVisible()
    await expect(
      page.locator('[data-testid="coordination-table-slot"]'),
    ).toHaveCount(9)
    // Y el mazo se abre: sus cinco subordinaciones pasan a estar repartidas
    // como cartas reales, que es lo que significa escoger un mazo.
    await expect(
      page.locator('[data-testid="coordination-deck-fan-slot"]'),
    ).toHaveCount(5)
  })

  test('la subbaraja abierta no desborda la página', async ({ page }) => {
    await install(page)
    await openTable(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect.poll(async () => (await reach(page)) > 30).toBe(true)

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

    // Y tampoco se sale del área de contenido.
    const escapes = await page.evaluate(() => {
      const host = document
        .querySelector('.novex-os-deck__content')
        ?.getBoundingClientRect()
      if (!host) return -1
      return Array.from(
        document.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).filter((peek) => {
        const rect = peek.getBoundingClientRect()
        return rect.bottom > host.bottom + 1 || rect.top < host.top - 1
      }).length
    })
    expect(escapes).toBe(0)
  })

  test('el padre queda siempre por delante de su subbaraja', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()

    const onTop = await page.evaluate((parentCode) => {
      const stack = document.querySelector(
        `[data-testid="coordination-deck-stack"][data-code="${parentCode}"]`,
      )!
      const card = stack.querySelector('[data-testid="coordination-card"]')!
      const rect = card.getBoundingClientRect()
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      )
      return card.contains(hit)
    }, PARENT)
    expect(onTop).toBe(true)
  })
})

test.describe('preview de subbaraja · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('se abre igual y sin desbordar a 1920', async ({ page }) => {
    await install(page)
    await openTable(page)

    const closed = await reach(page)
    await page.locator(`${CARD}[data-code="${PARENT}"]`).hover()
    await expect.poll(async () => (await reach(page)) > closed + 30).toBe(true)

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
