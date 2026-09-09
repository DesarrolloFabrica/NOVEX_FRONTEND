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
 * Selecciona una coordinación desde el carrusel como lo haría el usuario:
 * gira con la flecha hasta que la carta llega al slot frontal y la pulsa allí.
 *
 * La fase 8.2 revocó que las 14 restantes estén simultáneamente visibles, así
 * que ya no se puede clicar una coordinación por código sin traerla antes al
 * conjunto de cinco.
 */
async function selectFromCarousel(page: Page, code: string) {
  const front = page.locator(
    `[data-testid="carousel-slot"][data-slot="0"][data-code="${code}"]`,
  )
  const total = await page.getByTestId('carousel-slot').count()
  expect(total).toBeGreaterThan(0)

  for (let turn = 0; turn < 15 && (await front.count()) === 0; turn += 1) {
    await page.getByTestId('carousel-next').click()
  }

  await expect(front).toHaveCount(1)
  await front.locator('[data-testid="coordination-card"]').click()
}

test.describe('selección de coordinación', () => {
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
    await page
      .locator(`${CARD}[data-code="coord-fabrica-contenidos"]`)
      .hover()
    await expect(character).toHaveAttribute('data-orientation', 'RIGHT')
    await expect(character).toHaveAttribute('data-status', 'CRITICO')
  })

  test('seleccionar una coordinación la pone bajo observación', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()

    const active = page.getByTestId('active-coordination-card')
    await expect(active).toBeVisible()
    await expect(active).toHaveAttribute('data-code', 'coord-operaciones-academicas')
    // El estado de la carta activa es el de LEVEL 0: no se recalcula.
    await expect(active).toHaveAttribute('data-status', 'CRITICO')

    await expect(page.getByTestId('operational-breadcrumb')).toContainText(
      'Operación Académica',
    )
    await expect(page.getByTestId('breadcrumb-direction')).toBeVisible()

    // Cinco alternativas grandes en el carrusel; la baraja de reposo se retira
    // y la coordinación activa no se duplica dentro del carrusel.
    await expect(page.getByTestId('carousel-slot')).toHaveCount(5)
    await expect(page.getByTestId('coordination-table')).toHaveCount(0)
    await expect(
      page.locator(
        '[data-testid="carousel-slot"][data-code="coord-operaciones-academicas"]',
      ),
    ).toHaveCount(0)
    await expect(page.getByTestId('carousel-position')).toContainText('/ 8')

    const character = page.getByTestId('direction-character')
    await expect(character).toHaveAttribute('data-interaction', 'SELECTED')
    await expect(character).toHaveAttribute('data-status', 'CRITICO')

    // Problemas ordenados por prioridad, con título y severidad.
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    await expect(page.getByTestId('problem-row').first()).toContainText(
      'Aulas sin conectividad',
    )
    await expect(
      page
        .getByTestId('problem-row')
        .first()
        .getByTestId('problem-row-severity'),
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

    // La página no necesita scroll: la miga, el personaje, la carta activa y
    // la baraja comprimida caben en el viewport objetivo.
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
    const listBox = await page.getByTestId('active-card-problems').boundingBox()
    const rowBox = await page.getByTestId('problem-row').first().boundingBox()
    expect(listBox).not.toBeNull()
    expect(rowBox).not.toBeNull()
    const visibleRows = listBox!.height / rowBox!.height
    expect(visibleRows).toBeGreaterThan(2.2)
    expect(visibleRows).toBeLessThan(4)

    await page.screenshot({
      path: testInfo.outputPath('selected-engineering-1440x900.png'),
      fullPage: false,
    })
  })

  test('cambio directo entre coordinaciones y vuelta con caché', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    const requested = await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    expect(level1Calls(requested)).toHaveLength(2)

    // Cambio directo, sin volver primero al estado global.
    await selectFromCarousel(page, 'coord-especializaciones')
    const active = page.getByTestId('active-coordination-card')
    await expect(active).toHaveAttribute('data-code', 'coord-especializaciones')
    await expect(page.getByTestId('problem-row')).toHaveCount(1)
    await expect(page.getByTestId('operational-breadcrumb')).toContainText(
      'Especializaciones',
    )
    expect(level1Calls(requested)).toHaveLength(4)

    await page.screenshot({
      path: testInfo.outputPath('selected-business-1440x900.png'),
      fullPage: false,
    })

    // Volver a Ingenierías no cuesta ninguna petición: estaba en caché.
    await selectFromCarousel(page, 'coord-operaciones-academicas')
    await expect(active).toHaveAttribute('data-code', 'coord-operaciones-academicas')
    await expect(page.getByTestId('problem-row')).toHaveCount(5)
    expect(level1Calls(requested)).toHaveLength(4)
  })

  test('las migas devuelven al estado global', async ({ page }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-especializaciones"]`).click()
    await expect(page.getByTestId('active-coordination-card')).toBeVisible()

    await page.getByTestId('breadcrumb-direction').click()

    await expect(page.getByTestId('active-coordination-card')).toHaveCount(0)
    await expect(page.getByTestId('operational-breadcrumb')).toHaveCount(0)
    await expect(page.getByTestId('coordination-card')).toHaveCount(9)
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

    await page.locator(`${CARD}[data-code="coord-general"]`).click()

    await expect(page.getByTestId('active-card-empty')).toHaveText(
      'Todo bajo control',
    )
    await expect(page.getByTestId('problem-row')).toHaveCount(0)
    await expect(page.getByTestId('carousel-slot')).toHaveCount(5)

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

    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()

    await expect(page.getByTestId('active-card-error')).toBeVisible()
    await expect(page.getByTestId('active-card-empty')).toHaveCount(0)
    // La coordinación sigue seleccionada y con su estado de LEVEL 0.
    await expect(page.getByTestId('active-coordination-card')).toHaveAttribute(
      'data-status',
      'CRITICO',
    )
    // Y se puede cambiar a otra.
    await selectFromCarousel(page, 'coord-especializaciones')
    await expect(page.getByTestId('active-coordination-card')).toHaveAttribute(
      'data-code',
      'coord-especializaciones',
    )
  })

  test('la carta activa no está pulsada en la baraja y los problemas son botones', async ({
    page,
  }) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()

    await expect(page.locator(`${CARD}[aria-pressed="false"]`)).toHaveCount(5)
    await expect(page.getByTestId('problem-row').first()).toHaveAttribute(
      'aria-label',
      /Severidad Crítica/,
    )
  })
})

test.describe('composición seleccionada 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('personaje, carta activa y baraja comprimida caben', async ({
    page,
  }, testInfo) => {
    test.slow()
    await installSession(page)
    await installApi(page)
    await openExperience(page)

    await page.locator(`${CARD}[data-code="coord-operaciones-academicas"]`).click()
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
    await expect(page.getByTestId('carousel-slot')).toHaveCount(5)

    await page.screenshot({
      path: testInfo.outputPath('selected-engineering-1920x1080.png'),
      fullPage: false,
    })
  })
})
