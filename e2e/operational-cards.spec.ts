import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Experiencia ADMIN de estado operacional.
 *
 * Cubre la cadena ruta -> API -> estado -> contrato -> personaje + los nueve
 * mazos de producto en reposo. Todavía NO hay selección, flip, carta activa, problemas ni isla:
 * esos tests llegan con las fases que los construyen.
 */

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const CARD = '[data-testid="coordination-card"]'

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

/**
 * Corta las fuentes externas. `index.html` enlaza Google Fonts y en este
 * entorno sin salida a internet esa petición se queda colgada, así que el
 * evento `load` de `page.goto` no se dispara y el test muere por timeout.
 * Era la causa real de la intermitencia: cuando la petición fallaba rápido el
 * test pasaba, y cuando colgaba, no.
 */
async function blockExternalFonts(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

async function installAdminSession(page: Page) {
  await blockExternalFonts(page)
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

/**
 * Cuenta las peticiones al API y responde solo lo que la experiencia debe
 * necesitar. Cualquier otra ruta se registra y devuelve 404 para que un
 * consumo inesperado sea visible en la aserción de LEVEL 0.
 */
async function installApi(
  page: Page,
  options: {
    analystRegistryActiveProblems?: number
    overviewStatus?: number
    overviewBody?: unknown
    severe?: boolean
  } = {},
) {
  const requested: string[] = []

  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    requested.push(path)

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }

    if (path.endsWith('/operational-overview')) {
      if (options.overviewStatus && options.overviewStatus !== 200) {
        await route.fulfill({
          status: options.overviewStatus,
          json: { message: 'E2E' },
        })
        return
      }
      await route.fulfill({
        json:
          options.overviewBody ??
          operationalOverviewFixture({
            analystRegistryActiveProblems:
              options.analystRegistryActiveProblems ?? 0,
            severe: options.severe,
          }),
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return requested
}

/**
 * Espera a que LEVEL 0 haya resuelto antes de medir. Contar cartas contra el
 * timeout por defecto hacía fallar los tests de composición cuando el dev
 * server tardaba en servir el primer render bajo carga.
 */
async function waitForOverviewReady(page: Page) {
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    // Holgado a propósito: el arranque del dev server domina el tiempo del
    // primer render, y bajo carga puede tardar decenas de segundos.
    { timeout: 60_000 },
  )
}

test.describe('estado operacional', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('ADMIN entra a /centro-operacional y ve el estado de la Dirección', async ({
    page,
  }) => {
    test.slow()
    await installAdminSession(page)
    const requested = await installApi(page)

    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    await expect(page.getByTestId('operational-cards-experience')).toBeVisible()

    // Un solo personaje, con el estado global del overview.
    const character = page.getByTestId('direction-character')
    await expect(character).toHaveCount(1)
    await expect(character).toHaveAttribute('data-status', 'ALERTA')
    await expect(character).toHaveAttribute('data-orientation', 'NEUTRAL')
    await expect(character).toHaveAttribute('data-interaction', 'IDLE')
    await expect(page.getByTestId('direction-character-status')).toHaveText(
      'Alerta',
    )

    // Frase institucional determinística, sin KPIs ni conteo técnico.
    await expect(page.getByTestId('direction-summary')).toHaveText(
      '1 coordinación crítica · 1 en alerta',
    )

    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
    await expect(page.getByTestId('coordination-table')).toHaveAttribute(
      'data-count',
      '9',
    )
    // Mesa de producto: nueve mazos en UN SOLO arco.
    await expect(page.locator('[data-arc="0"]')).toHaveCount(9)
    await expect(page.locator('[data-arc="1"]')).toHaveCount(0)

    // Coordinación General es uno de los nueve nodos de producto.
    const general = page.locator(`${CARD}[data-code="coord-general"]`)
    await expect(general).toBeVisible()
    await expect(general).toHaveAttribute('data-status', 'ESTABLE')

    // Los estados del fixture se reflejan en las cartas.
    // Bellas Artes (ALERTA en el fixture) es ahora una SUBORDINACIÓN: no tiene
    // carta propia, así que su estado no aparece en la mesa de primer nivel.
    await expect(page.locator(`${CARD}[data-status="CRITICO"]`)).toHaveCount(1)
    await expect(page.locator(`${CARD}[data-status="ALERTA"]`)).toHaveCount(0)
    await expect(page.locator(`${CARD}[data-status="ESTABLE"]`)).toHaveCount(8)

    // El estado también es texto, nunca solo aura.
    await expect(page.getByTestId('coordination-card-status')).toHaveCount(9)
    await expect(
      page
        .locator(`${CARD}[data-code="coord-operaciones-academicas"]`)
        .getByTestId('coordination-card-status'),
    ).toHaveText('Crítico')

    // LEVEL 0 es una sola petición y no arrastra el agregado legacy.
    expect(
      requested.filter((path) => path.endsWith('/operational-overview')),
    ).toHaveLength(1)
    /*
     * LO QUE LEVEL 0 SIGUE SIN ARRASTRAR. La lista de problemas de una
     * coordinación, el análisis y sus secciones perezosas solo se piden al
     * observar una carta o abrir un problema: entrar a la pantalla no cuesta
     * ninguna de ellas.
     *
     * Dos peticiones SÍ son nuevas y legítimas, porque describen piezas que no
     * dependen de la selección: «Mis reportes» —la lista propia del usuario,
     * transversal a las coordinaciones— y el catálogo de categorías del
     * formulario, que se pide una vez y no en cada apertura. Se comprueban
     * aparte, con su forma exacta, en lugar de admitir cualquier «/situations».
     */
    expect(
      requested.filter(
        (path) =>
          path.includes('coordinationId=') ||
          path.includes('/network-status') ||
          path.includes('/dashboard') ||
          path.includes('/analysis') ||
          path.includes('/recommendations') ||
          path.includes('/evidences') ||
          path.includes('/timeline'),
      ),
    ).toEqual([])

    // Las dos peticiones nuevas y NADA más: el grabador guarda la ruta sin
    // query, así que se comprueba el conjunto exacto de rutas de situaciones.
    expect(
      [...new Set(requested.filter((path) => path.includes('/situations')))].sort(),
    ).toEqual(['/api/v1/situations', '/api/v1/situations/categories'])
  })

  test('el fixture severo pone al personaje en CRITICO', async ({ page }) => {
    await installAdminSession(page)
    await installApi(page, { severe: true })

    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    const character = page.getByTestId('direction-character')
    await expect(character).toHaveCount(1)
    await expect(character).toHaveAttribute('data-status', 'CRITICO')
    await expect(page.getByTestId('direction-character-status')).toHaveText(
      'Crítico',
    )
    await expect(page.getByTestId('direction-summary')).toHaveText(
      '7 coordinaciones críticas · 1 en alerta',
    )
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
  })

  test('un fallo de LEVEL 0 se comunica como DESCONOCIDO, nunca como estable', async ({
    page,
  }) => {
    await installAdminSession(page)
    await installApi(page, { overviewStatus: 500 })

    await page.goto('/centro-operacional')

    await expect(page.getByTestId('operational-cards-error')).toBeVisible()
    await expect(page.getByTestId('direction-character')).toHaveAttribute(
      'data-status',
      'DESCONOCIDO',
    )
    await expect(page.getByTestId('direction-character-status')).toHaveText(
      'Desconocido',
    )
    await expect(page.getByTestId('coordination-card')).toHaveCount(0)
    await expect(page.getByTestId('coordination-table')).toHaveCount(0)
    await expect(page.getByTestId('direction-summary')).toHaveText(
      'Estado no disponible',
    )
  })

  test('un contrato inutilizable no pinta datos inventados', async ({ page }) => {
    await installAdminSession(page)
    await installApi(page, {
      overviewBody: { directionStatus: 'ESTABLE', coordinations: 'nope' },
    })

    await page.goto('/centro-operacional')

    await expect(page.getByTestId('operational-cards-error')).toBeVisible()
    await expect(page.getByTestId('direction-character')).toHaveAttribute(
      'data-status',
      'DESCONOCIDO',
    )
  })

  test('el Registro de analista no crea carta ni personaje adicional', async ({
    page,
  }) => {
    await installAdminSession(page)
    await installApi(page, { analystRegistryActiveProblems: 3 })

    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    const placeholder = page.getByTestId('analyst-registry-placeholder')
    await expect(placeholder).toBeVisible()
    await expect(placeholder).toContainText('3 problemas activos')
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
    await expect(page.getByTestId('direction-character')).toHaveCount(1)
  })

  test('las secciones hijas del Centro Operacional siguen accesibles', async ({
    page,
  }) => {
    await installAdminSession(page)
    await installApi(page)

    await page.goto('/centro-operacional')
    await expect(page.getByTestId('operational-cards-experience')).toBeVisible()

    for (const label of ['Panorama global', 'Inteligencia IA', 'Auditoría']) {
      await page.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(
        /\/centro-operacional\/(panorama|inteligencia|reportes)/,
      )
      await expect(page.getByTestId('operational-cards-experience')).toHaveCount(
        0,
      )
    }

    await page.getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(page.getByTestId('operational-cards-experience')).toBeVisible()
  })
})

/**
 * Validación de composición. Un test por viewport, cada uno con su propio
 * contexto de página: redimensionar a mitad de prueba dejaba el contexto en
 * un estado que la siguiente heredaba y Playwright lo cerraba con
 * «Target page, context or browser has been closed».
 */
const VIEWPORTS = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1920x1080', width: 1920, height: 1080 },
] as const

for (const viewport of VIEWPORTS) {
  test.describe(`composición ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test(`personaje y baraja caben en ${viewport.label}`, async ({
      page,
    }, testInfo) => {
      // El primer render paga la compilación del dev server; con el timeout
      // por defecto de 30 s el test moría antes de medir.
      test.slow()
      await installAdminSession(page)
      await installApi(page)

      await page.goto('/centro-operacional')
      await waitForOverviewReady(page)
      await expect(page.getByTestId('coordination-card')).toHaveCount(9)

      // Sin scroll horizontal en el viewport objetivo.
      const overflowX = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflowX).toBeLessThanOrEqual(0)

      // Las 15 cartas dentro del viewport y con la identidad legible.
      const boxes = await page
        .getByTestId('coordination-card')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rect = node.getBoundingClientRect()
            const nameRect = node
              .querySelector('.coordination-card__name')
              ?.getBoundingClientRect()
            const faceRect = node
              .querySelector('.coordination-card__face')
              ?.getBoundingClientRect()
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              nameWidth: nameRect?.width ?? 0,
              faceWidth: faceRect?.width ?? 0,
              illustrated: faceRect !== undefined,
            }
          }),
        )

      expect(boxes).toHaveLength(9)
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.right).toBeLessThanOrEqual(viewport.width + 1)
        expect(box.bottom).toBeLessThanOrEqual(viewport.height + 1)
        expect(box.width).toBeGreaterThan(120)

        // Quién es la coordinación tiene que leerse en la carta. En las
        // ilustradas lo dice el arte, que ocupa la carta entera y ya rotula el
        // nombre; si alguna cayera a legacy lo diría el texto.
        if (box.illustrated) {
          expect(box.faceWidth).toBeGreaterThan(120)
        } else {
          expect(box.nameWidth).toBeGreaterThan(80)
        }
      }

      // Los nueve nodos de producto tienen cara ilustrada: ni una carta muda.
      expect(boxes.filter((box) => box.illustrated)).toHaveLength(9)

      // El personaje tiene presencia real y no invade la baraja.
      const characterBox = await page
        .getByTestId('direction-character')
        .boundingBox()
      expect(characterBox).not.toBeNull()
      const topOfDeck = Math.min(...boxes.map((box) => box.top))
      expect(characterBox!.y + characterBox!.height).toBeLessThanOrEqual(
        topOfDeck + 1,
      )
      expect(characterBox!.height).toBeGreaterThan(150)

      await page.screenshot({
        path: testInfo.outputPath(`character-${viewport.label}.png`),
        fullPage: false,
      })
    })
  })
}

test.describe('composición con 7 coordinaciones críticas', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('la pantalla sigue siendo legible', async ({ page }, testInfo) => {
    test.slow()
    await installAdminSession(page)
    await installApi(page, { severe: true })

    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    // El fixture severo pone siete filas técnicas en CRITICO, pero tres de
    // ellas —Ingenierías, Negocios y la legacy Servicios— ya no son nodos de
    // primer nivel, así que la mesa muestra cuatro. Es la divergencia esperada
    // entre coordinaciones técnicas y mazos visibles.
    await expect(page.locator(`${CARD}[data-status="CRITICO"]`)).toHaveCount(4)
    await expect(page.locator(`${CARD}[data-status="ALERTA"]`)).toHaveCount(0)
    await expect(page.locator(`${CARD}[data-status="ESTABLE"]`)).toHaveCount(5)

    // Los nombres siguen legibles y las etiquetas de estado no quedan tapadas.
    const hidden = await page
      .getByTestId('coordination-card-status')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) => {
            const rect = node.getBoundingClientRect()
            return rect.width === 0 || rect.height === 0
          }).length,
      )
    expect(hidden).toBe(0)

    await page.screenshot({
      path: testInfo.outputPath('character-severe-1440x900.png'),
      fullPage: false,
    })
  })
})


/**
 * Cara ilustrada (CoordCards).
 *
 * El fallback por imagen rota no se puede cubrir en unitarios: `onError` es un
 * evento del navegador y la suite de Vitest renderiza con `react-dom/server`,
 * sin DOM. Aquí sí es comprobable de verdad, abortando la ruta del asset.
 */
test.describe('cara ilustrada de las cartas', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('las coordinaciones con arte propio lo pintan, y ocultan el nombre duplicado', async ({
    page,
  }) => {
    await blockExternalFonts(page)
    await installAdminSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    const especializaciones = page.locator(
      `${CARD}[data-code="coord-especializaciones"]`,
    )
    await expect(
      especializaciones.locator('.coordination-card__face img'),
    ).toHaveAttribute('src', '/CoordCards/especializaciones.png')

    // El nombre sigue en el DOM y con su texto, pero recortado a 1px: es la
    // técnica sr-only, así que para Playwright sigue siendo «visible» y lo que
    // hay que medir es su caja, no su visibilidad.
    const name = especializaciones.locator('.coordination-card__name')
    await expect(name).toHaveCount(1)
    await expect(name).toHaveText('Especializaciones')
    const nameBox = await name.boundingBox()
    expect(nameBox!.width).toBeLessThanOrEqual(2)
    expect(nameBox!.height).toBeLessThanOrEqual(2)
    await expect(especializaciones).toHaveAttribute(
      'aria-label',
      /Especializaciones\. Estado operacional:/,
    )

    // El estado NO se oculta con el nombre.
    await expect(
      especializaciones.getByTestId('coordination-card-status'),
    ).toBeVisible()

    // Los nueve nodos principales tienen cara ilustrada propia.
    await expect(page.locator('.coordination-card__face')).toHaveCount(9)
  })

  test('Servicio se lee como Servicio, y la fila legacy no se pinta', async ({
    page,
  }) => {
    await blockExternalFonts(page)
    await installAdminSession(page)
    await installApi(page)
    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    // La fila legacy `coord-servicios` sigue existiendo en la base de datos y
    // conserva sus problemas activos, pero no tiene carta en la mesa de
    // producto: está pendiente de reconciliación.
    await expect(page.locator(`${CARD}[data-code="coord-servicios"]`)).toHaveCount(0)

    // El nodo de producto Servicio se apoya en `coord-homologaciones`.
    const servicio = page.locator(`${CARD}[data-code="coord-homologaciones"]`)
    await expect(servicio).toBeVisible()
    await expect(servicio).toHaveAttribute(
      'aria-label',
      /^Servicio\. Estado operacional:/,
    )

    // Pinta `servicio.png`, no Homologaciones: el rótulo del arte coincide
    // con el nombre de producto.
    await expect(
      servicio.locator('.coordination-card__face img'),
    ).toHaveAttribute('src', '/CoordCards/servicio.png')
    await expect(servicio.locator('.coordination-card__island')).toHaveCount(0)

    // Nombre de producto en el DOM, oculto a la vista como en el resto.
    const name = servicio.locator('.coordination-card__name')
    await expect(name).toHaveText('Servicio')
    const nameBox = await name.boundingBox()
    expect(nameBox!.width).toBeLessThanOrEqual(2)
    expect(nameBox!.height).toBeLessThanOrEqual(2)
  })

  test('si el arte no carga, la carta cae a la legacy de SU coordinación', async ({
    page,
  }) => {
    await blockExternalFonts(page)
    await installAdminSession(page)
    await installApi(page)
    // Se rompen todas las caras ilustradas, no solo una.
    await page.route('**/CoordCards/**', (route) => route.abort())
    await page.goto('/centro-operacional')
    await waitForOverviewReady(page)

    const especializaciones = page.locator(
      `${CARD}[data-code="coord-especializaciones"]`,
    )

    await expect(especializaciones.locator('.coordination-card__face')).toHaveCount(0)
    await expect(
      especializaciones.locator('.coordination-card__island img'),
    ).toHaveAttribute('src', '/islas/CoordEspecializaciones.webp')

    // Recupera su nombre visible: sin arte no puede quedarse muda.
    const name = especializaciones.locator('.coordination-card__name')
    await expect(name).toBeVisible()
    await expect(name).toHaveText('Especializaciones')

    // Las 15 siguen presentes, con su estado.
    await expect(page.locator(CARD)).toHaveCount(9)
    await expect(page.getByTestId('coordination-card-status')).toHaveCount(9)
  })
})
