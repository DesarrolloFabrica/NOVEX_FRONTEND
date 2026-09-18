import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Mesa operacional en reposo: nueve mazos de producto en un solo arco.
 *
 * Lo que aquí se comprueba solo puede comprobarse en navegador real: que las
 * cartas están donde el layout dice, que la mesa no desborda, que el foco
 * eleva la carta por encima de sus vecinas y que la selección —que R3 no
 * toca— sigue funcionando igual.
 *
 * Las invariantes de reparto y determinismo viven en las pruebas unitarias de
 * `tableLayout`; aquí no se repiten.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const SLOT = '[data-testid="coordination-table-slot"]'

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

test.describe('mesa en reposo · 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('los nueve mazos de producto están en la mesa, en UN solo arco', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator('[data-arc="0"]')).toHaveCount(9)
    await expect(page.locator('[data-arc="1"]')).toHaveCount(0)
  })

  test('Operación Académica se lee como mazo y las demás no', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const peeks = page.getByTestId('coordination-deck-peek')
    await expect(peeks).toHaveCount(5)

    // Los cinco peeks cuelgan del mazo de Operación Académica, no de otro.
    const stack = page.locator(
      '[data-testid="coordination-deck-stack"][data-code="coord-operaciones-academicas"]',
    )
    await expect(stack).toHaveAttribute('data-children', '5')
    await expect(stack.getByTestId('coordination-deck-peek')).toHaveCount(5)

    // Fábrica está preparada como mazo, pero sin peeks inventados.
    const fabrica = page.locator(
      '[data-testid="coordination-deck-stack"][data-code="coord-fabrica-contenidos"]',
    )
    await expect(fabrica).toHaveAttribute('data-children', '0')
    await expect(fabrica.getByTestId('coordination-deck-peek')).toHaveCount(0)

    // Los peeks asoman de verdad por DEBAJO de la carta.
    const below = await stack.evaluate((node) => {
      const card = node
        .querySelector('[data-testid="coordination-card"]')!
        .getBoundingClientRect()
      return Array.from(
        node.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => peek.getBoundingClientRect().bottom - card.bottom)
    })
    for (const margin of below) expect(margin).toBeGreaterThan(3)

    // Y NO esconden a la coordinación vecina. Es la regresión concreta que
    // costó el primer intento: con el mazo elevado sobre sus vecinas, los peeks
    // de Operación Académica tapaban la carta de Proyección Social y un nodo
    // principal desaparecía detrás de las subordinaciones de otro.
    const neighbourOnTop = await page.evaluate(() => {
      const neighbour = document.querySelector(
        '[data-testid="coordination-card"][data-code="coord-proyeccion-social"]',
      )
      if (!neighbour) return false
      const rect = neighbour.getBoundingClientRect()
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      )
      return neighbour.contains(hit)
    })
    expect(neighbourOnTop).toBe(true)
  })

  test('los peeks no añaden paradas de tabulador', async ({ page }) => {
    await install(page)
    await openTable(page)

    // Nueve controles en la mesa: uno por mazo, ninguno por subordinación.
    await expect(page.locator(`${SLOT} button`)).toHaveCount(9)
    await expect(
      page.locator('[data-testid="coordination-deck-peek"][tabindex]'),
    ).toHaveCount(0)

    // Y la estructura se anuncia por texto en el nombre accesible del padre.
    await expect(
      page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`),
    ).toHaveAttribute('aria-label', /5 subordinaciones./)
  })

  test('los cinco peeks se leen como cartas desalineadas, no como franjas', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const stack = page.locator(
      '[data-testid="coordination-deck-stack"][data-code="coord-operaciones-academicas"]',
    )
    const geometry = await stack.evaluate((node) => {
      const card = node
        .querySelector('[data-testid="coordination-card"]')!
        .getBoundingClientRect()
      return Array.from(
        node.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => {
        const rect = peek.getBoundingClientRect()
        return {
          dx: Math.round(rect.left - card.left),
          below: Math.round(rect.bottom - card.bottom),
        }
      })
    })

    expect(geometry).toHaveLength(5)

    // El desvío alterna de lado: es lo que deja ver una esquina propia de cada
    // carta en lugar de un canto continuo.
    expect(geometry.some((peek) => peek.dx > 0)).toBe(true)
    expect(geometry.some((peek) => peek.dx < 0)).toBe(true)

    // Y hay varias posiciones distintas, no una banda uniforme. Se piden tres y
    // no cinco a propósito: los cinco desvíos SÍ son distintos —lo comprueba
    // `deckPeek.test.ts` sobre los valores sin redondear—, pero al medirlos en
    // píxeles enteros dos pueden coincidir, y esa colisión depende del ancho de
    // carta, no de la geometría.
    expect(new Set(geometry.map((peek) => peek.dx)).size).toBeGreaterThanOrEqual(3)

    // La baraja engorda hacia abajo de forma monótona.
    for (let index = 1; index < geometry.length; index += 1) {
      expect(geometry[index].below).toBeGreaterThan(geometry[index - 1].below)
    }
  })

  test('el padre queda por delante de todas sus subordinaciones', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const ordering = await page.evaluate(() => {
      const stack = document.querySelector(
        '[data-testid="coordination-deck-stack"][data-code="coord-operaciones-academicas"]',
      )!
      const parent = Number(
        getComputedStyle(
          stack.querySelector('[data-testid="coordination-card"]')!,
        ).zIndex,
      )
      const peeks = Array.from(
        stack.querySelectorAll('[data-testid="coordination-deck-peek"]'),
      ).map((peek) => Number(getComputedStyle(peek).zIndex))
      return { parent, peeks }
    })

    for (const peek of ordering.peeks) {
      expect(peek).toBeLessThan(ordering.parent)
    }
    // Y entre ellas, en orden: la más profunda, más al fondo.
    for (let index = 1; index < ordering.peeks.length; index += 1) {
      expect(ordering.peeks[index]).toBeLessThan(ordering.peeks[index - 1])
    }
  })

  test('Servicio pinta su cara propia, no la de Homologaciones', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const servicio = page.locator(
      `${CARD}[data-code="coord-homologaciones"]`,
    )
    await expect(
      servicio.locator('.coordination-card__face img'),
    ).toHaveAttribute('src', '/CoordCards/servicio.png')
    await expect(servicio.locator('.coordination-card__island')).toHaveCount(0)
    await expect(servicio.locator('.coordination-card__name')).toHaveText(
      'Servicio',
    )

    // El estado sigue viniendo de su fila técnica, que es la que aporta los
    // problemas: solo cambia la cara.
    await expect(servicio).toHaveAttribute('data-status', 'CRITICO')
  })

  test('las subordinaciones NO aparecen como nodos principales', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    for (const child of [
      'coord-bellas-artes',
      'coord-empresarial',
      'coord-ingenierias',
      'coord-transversales',
      'coord-negocios',
    ]) {
      await expect(page.locator(`${CARD}[data-code="${child}"]`)).toHaveCount(0)
    }
    // Y la fila legacy tampoco.
    await expect(
      page.locator(`${CARD}[data-code="coord-servicios"]`),
    ).toHaveCount(0)
  })

  test('la mesa es un arco, no una fila recta', async ({ page }) => {
    await install(page)
    await openTable(page)

    const upper = await page
      .locator('[data-arc="0"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect()
          return { top: rect.top, left: rect.left }
        }),
      )

    // Los extremos del arco quedan por ENCIMA del centro. Si la banda fuera
    // recta, todas las `top` coincidirían.
    const centre = upper[Math.floor(upper.length / 2)].top
    expect(upper[0].top).toBeLessThan(centre)
    expect(upper[upper.length - 1].top).toBeLessThan(centre)

    // Y hay curva real, no dos escalones: al menos cuatro alturas distintas.
    const heights = new Set(upper.map((slot) => Math.round(slot.top)))
    expect(heights.size).toBeGreaterThanOrEqual(4)

    // El avance horizontal es monótono: nadie se cruza de sitio.
    for (let index = 1; index < upper.length; index += 1) {
      expect(upper[index].left).toBeGreaterThan(upper[index - 1].left)
    }
  })

  test('las cartas se solapan: es una baraja, no cartas sueltas', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const boxes = await page
      .locator('[data-arc="0"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect()
          return { left: rect.left, right: rect.right, width: rect.width }
        }),
      )

    for (let index = 1; index < boxes.length; index += 1) {
      const overlap = boxes[index - 1].right - boxes[index].left
      expect(overlap).toBeGreaterThan(0)
      // Y el solape no llega a tapar la carta entera.
      expect(overlap).toBeLessThan(boxes[index].width * 0.75)
    }
  })

  test('la mesa no desborda la página en ningún eje', async ({ page }) => {
    await install(page)
    await openTable(page)

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

    // Ninguna carta se sale del área de contenido.
    const escapes = await page.evaluate(() => {
      const host = document
        .querySelector('.novex-os-deck__content')
        ?.getBoundingClientRect()
      if (!host) return -1
      return Array.from(
        document.querySelectorAll('[data-testid="coordination-table-slot"]'),
      ).filter((node) => {
        const rect = node.getBoundingClientRect()
        return (
          rect.left < host.left - 1 ||
          rect.right > host.right + 1 ||
          rect.top < host.top - 1 ||
          rect.bottom > host.bottom + 1
        )
      }).length
    })
    expect(escapes).toBe(0)
  })

  test('el orden del DOM sigue siendo el institucional pese a la curva', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    const codes = await page
      .locator(CARD)
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-code')))

    expect(codes[0]).toBe('coord-general')
    expect(codes).toHaveLength(9)
    // Sin duplicados ni huecos.
    expect(new Set(codes).size).toBe(9)
  })

  test('el tabulador recorre las coordinaciones en orden institucional', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    await page.locator(`${CARD}[data-code="coord-general"]`).focus()
    const visited: string[] = []
    for (let step = 0; step < 3; step += 1) {
      visited.push(
        (await page.evaluate(() =>
          document.activeElement?.getAttribute('data-code'),
        )) ?? '',
      )
      await page.keyboard.press('Tab')
    }

    const expected = await page
      .locator(CARD)
      .evaluateAll((nodes) =>
        nodes.slice(0, 3).map((node) => node.getAttribute('data-code')),
      )
    expect(visited).toEqual(expected)
  })

  test('el foco eleva la carta por encima de sus vecinas', async ({ page }) => {
    await install(page)
    await openTable(page)

    // Una carta del interior del arco superior, tapada por su vecina derecha.
    const target = page.locator(`${SLOT}[data-arc="0"][data-arc-index="3"]`)
    const before = await target.evaluate(
      (node) => getComputedStyle(node).zIndex,
    )

    await target.locator(CARD).focus()
    const after = await target.evaluate((node) => getComputedStyle(node).zIndex)

    expect(Number(after)).toBeGreaterThan(Number(before))

    // Y con el foco puesto, el centro de la carta ya no lo tapa nadie.
    const onTop = await target.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      )
      return node.contains(hit)
    })
    expect(onTop).toBe(true)
  })

  test('el estado no reordena la mesa', async ({ page }) => {
    await install(page)
    await openTable(page)

    // El fixture severo pone 7 en crítico repartidas por el catálogo. Si el
    // estado ordenara, las críticas se agruparían al principio.
    const sequence = await page
      .locator(CARD)
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-status')),
      )

    expect(sequence).toHaveLength(9)
    // Cuatro de las siete filas críticas del fixture son nodos principales.
    expect(sequence.filter((status) => status === 'CRITICO')).toHaveLength(4)
    // La primera carta sigue siendo Coordinación General, que está ESTABLE.
    expect(sequence[0]).toBe('ESTABLE')
    // Y las críticas no están todas juntas al inicio.
    expect(sequence.slice(0, 7).every((status) => status === 'CRITICO')).toBe(
      false,
    )
  })

  test('sin regresión de selección: la mesa NO cede su sitio y vuelve', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    await page.locator(`${CARD}[data-code="coord-general"]`).click()

    // La mesa no se retira: seleccionar deja de cambiar de escena. Antes aquí
    // la mesa desaparecía y volvía; ahora se queda entera, con la observada en
    // su slot y las otras ocho acompañando.
    await expect(page.getByTestId('coordination-table')).toBeVisible()
    await expect(page.locator(CARD)).toHaveCount(9)
    /* Guardia contra la reaparición del carrusel, borrado en R5.2: ningún
       componente emite ya este `testid`. */
    await expect(page.getByTestId('coordination-carousel')).toHaveCount(0)
    await expect(page.getByTestId('coordination-problem-list')).toBeVisible()

    await page.getByTestId('breadcrumb-direction').click()

    await expect(page.getByTestId('coordination-table')).toBeVisible()
    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.getByTestId('coordination-problem-list')).toHaveCount(0)
  })
})

test.describe('mesa en reposo · 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('la misma geometría escala sin recomponerse ni desbordar', async ({
    page,
  }) => {
    await install(page)
    await openTable(page)

    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.locator('[data-arc="0"]')).toHaveCount(9)
    await expect(page.locator('[data-arc="1"]')).toHaveCount(0)

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
