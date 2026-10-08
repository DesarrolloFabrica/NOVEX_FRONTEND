import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * VIDAS del personaje en la baraja (ADMIN / DIRECTOR / ANALISTA).
 *
 *   sin coordinación seleccionada  → sin CharacterLives
 *   con coordinación seleccionada  → vidas de ESA coordinación
 *   lifePoints null                → visibles en UNKNOWN, no ocultas
 *
 * Se comprueba por `data-state` de cada corazón, no solo por el texto «7 / 10».
 * La geometría se mide en navegador real en cinco viewports: las vidas caben
 * entre la figura y el rótulo, dentro de la región, sin overflow, y la figura
 * conserva su alto al seleccionar (la franja de vidas está siempre reservada).
 */

type DeckRole = 'ADMIN' | 'DIRECTOR' | 'ANALISTA'

const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const CARD = '[data-testid="coordination-card"]'
const PANEL = '[data-testid="coordination-problem-list"]'
const LIVES = '[data-testid="character-lives"]'
const HEART = '[data-testid="character-lives-heart"]'

const PERMISSIONS: Record<DeckRole, string[]> = {
  ADMIN: [
    'SITUATIONS_VIEW',
    'COORDINATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
  DIRECTOR: [
    'SITUATIONS_VIEW',
    'COORDINATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'KPIS_VIEW',
  ],
  ANALISTA: [
    'SITUATIONS_VIEW',
    'COORDINATIONS_VIEW',
    'SITUATIONS_CREATE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
}

const OVERVIEW = operationalOverviewFixture({ severe: true })

function lifePointsOf(code: string): number | null {
  return OVERVIEW.coordinations.find((row) => row.code === code)!.lifePoints
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function install(page: Page, roleCode: DeckRole) {
  const session = {
    id: `e2e-${roleCode.toLowerCase()}`,
    name: `${roleCode} E2E`,
    role: 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: PERMISSIONS[roleCode],
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  const token = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: session.id,
      email: `${roleCode.toLowerCase()}@novex.test`,
      roleId: `role-${roleCode.toLowerCase()}`,
      roleCode,
      coordinationId: null,
      permissions: PERMISSIONS[roleCode],
      status: 'ACTIVE',
    }),
  )}.e2e`

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ sessionKey, tokenKey, sessionValue, tokenValue }) => {
      localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
      localStorage.setItem(tokenKey, tokenValue)
    },
    {
      sessionKey: SESSION_KEY,
      tokenKey: TOKEN_KEY,
      sessionValue: session,
      tokenValue: token,
    },
  )

  /*
   * Problemas dados de alta durante el test. Cada uno resta de las vidas de su
   * coordinación con la regla del backend (LOW/MEDIUM 1, HIGH/CRITICAL 2): el
   * overview refrescado trae el delta coherente con lo que se creó.
   */
  const createdDamage = new Map<string, number>()
  const weight = (severity: unknown) =>
    severity === 'HIGH' || severity === 'CRITICAL' ? 2 : 1

  function overviewResponse() {
    return {
      ...OVERVIEW,
      coordinations: OVERVIEW.coordinations.map((row) => {
        const damage = createdDamage.get(row.code) ?? 0
        return damage > 0 && row.lifePoints !== null
          ? { ...row, lifePoints: Math.max(0, row.lifePoints - damage) }
          : row
      }),
    }
  }

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name } },
      })
      return
    }
    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: overviewResponse() })
      return
    }
    if (url.pathname.includes('/operational-kpis')) {
      await route.fulfill({
        json: {
          scope: { type: 'direction' },
          generatedAt: OVERVIEW.generatedAt,
          universe: {
            type: 'active-catalog',
            coordinationCount: OVERVIEW.coordinations.length,
          },
          metricVersions: {
            integrity: 'integrity-mvp-v1',
            lifePoints: 'life-points-v1',
          },
          direction: {
            directionStatus: OVERVIEW.directionStatus,
            problems: {
              activeCount: 0,
              status: { open: 0, inProgress: 0 },
              severity: { critical: 0, high: 0, medium: 0, low: 0 },
            },
            dependencies: { incoming: 0, outgoing: 0 },
            coordinationStatusTotals: {
              critical: OVERVIEW.totals.critical,
              alert: OVERVIEW.totals.alert,
              stable: OVERVIEW.totals.stable,
              unknown: 0,
            },
            analystRegistry: {
              integrityStatus: 'ESTABLE',
              problems: {
                activeCount: 0,
                status: { open: 0, inProgress: 0 },
                severity: { critical: 0, high: 0, medium: 0, low: 0 },
              },
            },
            coordinations: [],
          },
        },
      })
      return
    }
    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({
        json: [
          {
            id: 'cat-acas',
            code: 'ACAS',
            name: 'ACAS',
            description: null,
            isSelectable: true,
            icon: 'acas',
          },
        ],
      })
      return
    }
    if (
      method === 'POST' &&
      url.pathname.endsWith('/situations/register-with-analysis')
    ) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const row = OVERVIEW.coordinations.find((item) => item.id === body.coordinationId)
      if (row) {
        createdDamage.set(
          row.code,
          (createdDamage.get(row.code) ?? 0) + weight(body.severity),
        )
      }
      const now = new Date().toISOString()
      await route.fulfill({
        status: 201,
        json: {
          situation: {
            id: `sit-created-${Date.now()}`,
            title: body.title,
            description: body.description,
            reportKind: body.reportKind ?? 'INTERNAL',
            coordinationId: row?.id ?? null,
            coordinationCode: row?.code ?? null,
            coordinationName: row?.name ?? null,
            affectedCoordinationId: row?.id ?? null,
            affectedCoordinationCode: row?.code ?? null,
            affectedCoordinationName: row?.name ?? null,
            affectedProcess: null,
            pendingDelivery: null,
            createdByUserId: session.id,
            createdByUserName: session.name,
            categoryId: body.categoryId ?? null,
            categoryCode: 'ACAS',
            categoryName: 'ACAS',
            severity: body.severity,
            status: 'OPEN',
            occurredAt: body.occurredAt,
            createdAt: now,
            updatedAt: now,
            relatedCoordinations: [],
            resolution: null,
            canResolve: true,
            slaHealth: 'on_track',
            dueAt: null,
          },
          analysis: null,
        },
      })
      return
    }
    if (url.pathname.endsWith('/situations')) {
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100, scope: 'complete' },
      })
      return
    }
    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })
}

async function settle(page: Page) {
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

async function openShell(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toHaveAttribute(
    'data-shell-layout',
    'deck',
    { timeout: 60_000 },
  )
  await expect(page.getByTestId('operational-cards-experience')).toHaveAttribute(
    'data-level0',
    'ready',
    { timeout: 60_000 },
  )
  await settle(page)
}

/**
 * Vuelve a la mesa global. El puntero se retira a una esquina: tras el clic
 * quedaría sobre un mazo y su hover mantendría transiciones en marcha.
 */
async function returnToTable(page: Page) {
  await page.getByTestId('return-to-table').click()
  await expect(page.locator(PANEL)).toHaveCount(0)
  await page.mouse.move(1, 1)
  await settle(page)
}

async function select(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await expect(page.locator(PANEL)).toHaveAttribute('data-code', code)
  await settle(page)
}

async function heartStates(page: Page): Promise<string[]> {
  return page
    .locator(`[data-testid="shell-region-character"] ${HEART}`)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-state') ?? ''))
}

async function expectNoLives(page: Page) {
  const character = page.getByTestId('direction-character')
  await expect(character).toHaveAttribute('data-lives', 'hidden')
  await expect(page.locator(LIVES)).toHaveCount(0)
  await expect(page.locator(HEART)).toHaveCount(0)
  await expect(page.getByTestId('character-lives-value')).toHaveCount(0)
  await expect(character).not.toHaveAttribute('aria-label', /Vidas/)
}

/** Las vidas visibles son las de `code`, por data-state y por nombre accesible. */
async function expectLivesOf(
  page: Page,
  code: string,
  expectedStates: readonly string[],
) {
  const character = page.getByTestId('direction-character')
  await expect(character).toHaveAttribute('data-lives', 'shown')
  await expect(page.locator(LIVES)).toHaveCount(1)
  await expect(page.locator(HEART)).toHaveCount(5)
  expect(await heartStates(page)).toEqual(expectedStates)

  const lifePoints = lifePointsOf(code)
  await expect(page.locator(LIVES)).toHaveAttribute(
    'data-life-points',
    lifePoints === null ? 'unknown' : String(lifePoints),
  )
  await expect(character).toHaveAttribute(
    'aria-label',
    lifePoints === null
      ? /^Estado: [^.]+\. Vidas del personaje: estado no disponible\.$/
      : new RegExp(`^Estado: [^.]+\\. Vidas del personaje: ${lifePoints} de 10 puntos\\.$`),
  )
  // Ningún role="img" accesible extra dentro del personaje.
  await expect(
    page.locator('[data-testid="direction-character"] [role="img"]'),
  ).toHaveCount(0)
}

const ESPECIALIZACIONES = 'coord-especializaciones' // 7
const OPERACIONES = 'coord-operaciones-academicas' // 0
const PROYECCION = 'coord-proyeccion-social' // null

for (const role of ['ADMIN', 'DIRECTOR', 'ANALISTA'] as const) {
  test(`${role}: sin selección no hay vidas; al seleccionar, las de esa carta`, async ({
    page,
  }) => {
    test.slow()
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page, role)
    await openShell(page)
    await expect(page.getByTestId('operational-shell')).toHaveAttribute(
      'data-shell-experience',
      { ADMIN: 'admin', DIRECTOR: 'director', ANALISTA: 'analyst' }[role],
    )

    await expectNoLives(page)

    await select(page, ESPECIALIZACIONES)
    expect(lifePointsOf(ESPECIALIZACIONES)).toBe(7)
    await expectLivesOf(page, ESPECIALIZACIONES, ['full', 'full', 'full', 'half', 'empty'])
    await expect(page.getByTestId('character-lives-value')).toHaveText('7 / 10')

    await returnToTable(page)
    await expectNoLives(page)

    // null con coordinación activa → UNKNOWN, no oculto.
    await select(page, PROYECCION)
    expect(lifePointsOf(PROYECCION)).toBeNull()
    await expectLivesOf(page, PROYECCION, ['unknown', 'unknown', 'unknown', 'unknown', 'unknown'])
    await expect(page.getByTestId('character-lives-value')).toHaveText('— / 10')

    await returnToTable(page)
    await expectNoLives(page)

    // Último paso: Operaciones Académicas abre su mazo, y el modo mazo no tiene
    // todavía «volver a la mesa».
    await select(page, OPERACIONES)
    expect(lifePointsOf(OPERACIONES)).toBe(0)
    await expectLivesOf(page, OPERACIONES, ['empty', 'empty', 'empty', 'empty', 'empty'])
  })
}

/*
 * Cambiar de carta es cambiar de personaje: 7 (Especializaciones) → 4 (Saber
 * Pro) NO es una pérdida de 3 puntos. Se comprueba con movimiento activo: si
 * hubiera animación, aquí se vería.
 */
test.describe('con movimiento', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

test('cambiar de coordinación reemplaza las vidas sin animación de delta', async ({
  page,
}) => {
  test.slow()
  await page.setViewportSize({ width: 1440, height: 900 })
  await install(page, 'ADMIN')
  await openShell(page)

  // Sin coordinación → coordinación: aparece el estado actual, sin delta.
  await select(page, ESPECIALIZACIONES)
  await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '7')
  await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'none')

  // Coordinación A → coordinación B, sin pasar por la mesa.
  await select(page, 'coord-saber-pro')
  expect(lifePointsOf('coord-saber-pro')).toBe(4)
  await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '4')
  await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'none')
  await expect(page.locator(`${HEART}[data-transition]`)).toHaveCount(0)
  await expect(page.locator(`${HEART}[data-previous-state]`)).toHaveCount(0)
  expect(await heartStates(page)).toEqual(['full', 'full', 'empty', 'empty', 'empty'])

  // Ni rastro de animación de vidas en curso.
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith('cl-'),
        ).length,
  )
  expect(running).toBe(0)
})
})

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1100, height: 700 },
] as const

interface CharacterGeometry {
  region: { top: number; bottom: number; left: number; right: number }
  figure: { top: number; bottom: number; height: number }
  slot: { top: number; bottom: number; height: number }
  lives: { left: number; right: number; width: number; height: number } | null
  heart: { width: number; height: number } | null
  status: { top: number; bottom: number }
  stageTop: number | null
  overflow: { x: number; y: number }
}

async function measureCharacter(page: Page): Promise<CharacterGeometry> {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector)
      return node ? node.getBoundingClientRect() : null
    }
    const r = (value: number) => Math.round(value * 10) / 10
    const region = rect('[data-testid="shell-region-character"]')!
    const figure = rect('.direction-character__figure')!
    const slot = rect('[data-testid="direction-character-lives"]')!
    const lives = rect('[data-testid="character-lives"]')
    const heart = rect('[data-testid="character-lives-heart"]')
    const status = rect('[data-testid="direction-character-status"]')!
    const stage = rect('[data-testid="shell-stage"]')
    return {
      region: {
        top: r(region.top),
        bottom: r(region.bottom),
        left: r(region.left),
        right: r(region.right),
      },
      figure: { top: r(figure.top), bottom: r(figure.bottom), height: r(figure.height) },
      slot: { top: r(slot.top), bottom: r(slot.bottom), height: r(slot.height) },
      lives: lives
        ? {
            left: r(lives.left),
            right: r(lives.right),
            width: r(lives.width),
            height: r(lives.height),
          }
        : null,
      heart: heart ? { width: r(heart.width), height: r(heart.height) } : null,
      status: { top: r(status.top), bottom: r(status.bottom) },
      stageTop: stage ? r(stage.top) : null,
      overflow: {
        x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      },
    }
  })
}

function expectFits(geometry: CharacterGeometry) {
  const { region, figure, slot, lives, status } = geometry
  // Orden vertical: figura → franja de vidas → rótulo, sin solaparse.
  expect(slot.top).toBeGreaterThanOrEqual(figure.bottom - 0.5)
  expect(status.top).toBeGreaterThanOrEqual(slot.bottom - 0.5)
  // Todo dentro de la región del personaje.
  expect(figure.top).toBeGreaterThanOrEqual(region.top - 1)
  expect(status.bottom).toBeLessThanOrEqual(region.bottom + 1)
  if (lives) {
    expect(lives.left).toBeGreaterThanOrEqual(region.left - 0.5)
    expect(lives.right).toBeLessThanOrEqual(region.right + 0.5)
    // Las vidas no desbordan su franja reservada.
    expect(lives.height).toBeLessThanOrEqual(slot.height + 0.5)
  }
  // Nada baja a la banda de la baraja.
  if (geometry.stageTop !== null) {
    expect(status.bottom).toBeLessThanOrEqual(geometry.stageTop)
  }
  expect(geometry.overflow.x).toBeLessThanOrEqual(0)
  expect(geometry.overflow.y).toBeLessThanOrEqual(0)
}

for (const viewport of VIEWPORTS) {
  test(`geometría de las vidas · baraja ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    test.slow()
    await page.setViewportSize(viewport)
    await install(page, 'ADMIN')
    await openShell(page)

    const idle = await measureCharacter(page)
    expect(idle.lives).toBeNull()
    expectFits(idle)

    await select(page, ESPECIALIZACIONES)
    const selected = await measureCharacter(page)
    expect(selected.lives).not.toBeNull()
    expectFits(selected)

    /*
     * Las vidas no cuestan alto propio: viven en una franja reservada que mide
     * lo mismo con y sin vidas. (La figura SÍ cambia de alto al seleccionar,
     * pero por el marco ticket —padding y pastilla de estado—, y ese cambio de
     * 24 px existe igual sin vidas: no es lo que se mide aquí.)
     */
    expect(selected.slot.height).toBeCloseTo(idle.slot.height, 1)
    expect(selected.lives!.height).toBeLessThanOrEqual(selected.slot.height + 0.5)

    console.log(
      `LIVES_GEOMETRY ${JSON.stringify({ viewport, idle, selected })}`,
    )

    // Solo para la captura: el `.riv` pinta de forma asíncrona.
    await page.waitForTimeout(1500)
    const name = `lives-deck-${viewport.width}x${viewport.height}`
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) })
    await page
      .getByTestId('shell-region-character')
      .screenshot({ path: testInfo.outputPath(`${name}-character.png`) })
  })
}

/* ==========================================================================
   Robustez de la transición (V3D). Todo con movimiento real.
   ========================================================================== */

/** Animaciones CSS de vidas (`cl-*`) en curso en el documento. */
async function runningLifeAnimations(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith('cl-') &&
            animation.playState === 'running',
        ).length,
  )
}

/** Clic síncrono en el DOM: no espera a que la carta esté quieta. */
async function domClick(page: Page, selector: string) {
  await page.evaluate((target) => {
    const node = document.querySelector(target) as HTMLElement
    node.click()
  }, selector)
}

/**
 * Alta de un problema INTERNO en la coordinación seleccionada. En la baraja
 * solo el ANALISTA puede reportar (`canCreateSituations`), por eso estos tests
 * usan ese rol.
 */
async function createInSelected(page: Page, severity: 'MEDIUM' | 'HIGH') {
  // Tras un alta el panel abre el detalle del problema creado: se vuelve.
  const back = page.getByTestId('detail-back')
  if ((await back.count()) > 0) await back.click()
  await page.getByTestId('report-internal-button').first().click()
  await page.getByTestId('report-title').fill(`Nuevo ${severity}`)
  await page.getByTestId('report-description').fill('Descripción suficiente')
  await page.getByTestId('report-category').selectOption('cat-acas')
  await page.getByTestId(`report-severity-${severity}`).check()
  await page.getByTestId('report-submit').click()
}

/**
 * Avisos de React o del runtime que delatarían un problema de ciclo de vida
 * (setState tras desmontar, bucles de render…). Los errores de red del mock
 * (404 de rutas no simuladas, wasm abortado al navegar) no cuentan.
 */
function watchLifecycleWarnings(page: Page): string[] {
  const found: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    const text = message.text()
    if (/Failed to load resource|wasm|E2E|status of 404/i.test(text)) return
    if (
      /Warning|setState|unmounted|Maximum update depth|Cannot update a component|act\(/i.test(
        text,
      )
    ) {
      found.push(text)
    }
  })
  page.on('pageerror', (error) => found.push(String(error)))
  return found
}

test.describe('robustez de la transición', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('cambiar de carta durante una pérdida: B aparece limpia, sin heredar nada de A', async ({
    page,
  }) => {
    test.slow()
    const warnings = watchLifecycleWarnings(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page, 'ANALISTA')
    await openShell(page)
    await select(page, ESPECIALIZACIONES)
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '7')

    await createInSelected(page, 'MEDIUM')
    // A pierde 1 punto: 7 → 6, y la animación arranca.
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '6')
    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'loss')
    expect(await runningLifeAnimations(page)).toBeGreaterThan(0)

    // En plena animación, B.
    await domClick(page, `${CARD}[data-code="coord-saber-pro"]`)
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '4')

    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'none')
    await expect(page.locator(`${HEART}[data-transition]`)).toHaveCount(0)
    await expect(page.locator(`${HEART}[data-previous-state]`)).toHaveCount(0)
    await expect(page.locator(`${HEART}[style*="--cl-delay"]`)).toHaveCount(0)
    await expect(page.locator('.character-lives__delta')).toHaveCount(0)
    expect(await heartStates(page)).toEqual(['full', 'full', 'empty', 'empty', 'empty'])
    expect(await runningLifeAnimations(page)).toBe(0)
    expect(warnings).toEqual([])
  })

  test('el nombre accesible cambia una sola vez y sin live region', async ({ page }) => {
    test.slow()
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page, 'ANALISTA')
    await openShell(page)
    await select(page, ESPECIALIZACIONES)

    // Se cuentan las mutaciones de aria-label del personaje durante el ciclo
    // alta → refetch → animación completa.
    await page.evaluate(() => {
      const target = document.querySelector('[data-testid="direction-character"]')!
      const seen: string[] = []
      ;(window as unknown as { __ariaSeen: string[] }).__ariaSeen = seen
      new MutationObserver(() => {
        seen.push(target.getAttribute('aria-label') ?? '')
      }).observe(target, { attributes: true, attributeFilter: ['aria-label'] })
    })

    await createInSelected(page, 'HIGH')
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '5')
    await page.waitForTimeout(900)

    const seen = await page.evaluate(
      () => (window as unknown as { __ariaSeen: string[] }).__ariaSeen,
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatch(/Vidas del personaje: 5 de 10 puntos\.$/)
    // Ni el personaje ni las vidas declaran live regions.
    const region = page.getByTestId('shell-region-character')
    await expect(region.locator('[aria-live]')).toHaveCount(0)
    await expect(region.locator('[role="status"], [role="alert"]')).toHaveCount(0)
  })

  test('desmontar durante la animación no deja restos ni avisos', async ({ page }) => {
    test.slow()
    const warnings = watchLifecycleWarnings(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await install(page, 'ANALISTA')
    await openShell(page)

    // 1) Volver a la Dirección en plena pérdida: CharacterLives se desmonta.
    await select(page, ESPECIALIZACIONES)
    await createInSelected(page, 'MEDIUM')
    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'loss')
    await domClick(page, '[data-testid="return-to-table"]')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator(LIVES)).toHaveCount(0)
    await expect(page.locator('.character-lives__delta')).toHaveCount(0)
    expect(await runningLifeAnimations(page)).toBe(0)

    // Al volver a la carta, montaje limpio: estado actual, sin delta.
    await page.mouse.move(1, 1)
    await settle(page)
    await select(page, ESPECIALIZACIONES)
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '6')
    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'none')

    // 2) Cambiar de layout en plena pérdida: el estado final es el correcto.
    await createInSelected(page, 'HIGH')
    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'loss')
    await page.setViewportSize({ width: 1100, height: 700 })
    await expect(page.locator(LIVES)).toHaveAttribute('data-life-points', '4')
    await page.waitForTimeout(900)
    expect(await runningLifeAnimations(page)).toBe(0)
    expect(await heartStates(page)).toEqual(['full', 'full', 'empty', 'empty', 'empty'])
    // La capa animada de pérdida queda invisible al terminar.
    const opacities = await page
      .locator('.character-lives__delta')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).opacity))
    expect(opacities.every((value) => value === '0')).toBe(true)

    // 3) Desmontar DirectionCharacter entero en plena animación: salir de la ruta.
    await page.setViewportSize({ width: 1440, height: 900 })
    await createInSelected(page, 'MEDIUM')
    await expect(page.locator(LIVES)).toHaveAttribute('data-transition', 'loss')
    // Fase 1: ya no hay pestañas hacia otras secciones; la salida de la ruta
    // dentro de la SPA que queda es cerrar sesión desde el menú de usuario.
    await page.getByRole('button', { name: /Menú de usuario/ }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('direction-character')).toHaveCount(0)
    expect(await runningLifeAnimations(page)).toBe(0)
    await page.waitForTimeout(600)

    expect(warnings).toEqual([])
  })

  /*
   * Cambios rápidos sobre el MISMO componente (`CharacterLives`) en el banco
   * de transiciones del showcase de desarrollo: allí el valor del mismo dueño
   * se puede cambiar dos veces en mitad de una animación.
   */
  test('cambios rápidos 8 → 7 → 6 y 6 → 7 → 8: la animación nueva reemplaza a la anterior', async ({
    page,
  }) => {
    const warnings = watchLifecycleWarnings(page)
    await page.goto('/dev/character-lives.html')
    const bench = page.getByTestId('lives-transition-bench')
    await bench.waitFor()
    const lives = bench.locator('[data-surface="dark"] [data-testid="character-lives"]')
    const hearts = lives.locator('[data-testid="character-lives-heart"]')
    const press = (label: string) => page.locator(`[data-bench="${label}"]`).click()
    const states = () =>
      hearts.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-state')))
    const deltaOpacity = () =>
      lives
        .locator('.character-lives__delta')
        .evaluate((node) => getComputedStyle(node).opacity)

    await expect(lives).toHaveAttribute('data-life-points', '8')

    // 8 → 7, y a los ~100 ms (en plena animación) 7 → 6.
    await press('−1')
    await expect(lives).toHaveAttribute('data-life-points', '7')
    expect(await runningLifeAnimations(page)).toBeGreaterThan(0)
    await page.waitForTimeout(100)
    await press('−1')
    await expect(lives).toHaveAttribute('data-life-points', '6')

    await expect(lives).toHaveAttribute('data-transition', 'loss')
    await expect(hearts.nth(3)).toHaveAttribute('data-previous-state', 'half')
    await expect(hearts.nth(3)).toHaveAttribute('data-state', 'empty')
    await expect(lives.locator('svg[data-transition]')).toHaveCount(1)
    await expect(lives.locator('.character-lives__delta')).toHaveCount(1)

    await page.waitForTimeout(900)
    expect(await runningLifeAnimations(page)).toBe(0)
    expect(await deltaOpacity()).toBe('0')
    expect(await states()).toEqual(['full', 'full', 'full', 'empty', 'empty'])

    // 6 → 7 → 8, igual de rápido.
    await press('+1')
    await expect(lives).toHaveAttribute('data-life-points', '7')
    await page.waitForTimeout(100)
    await press('+1')
    await expect(lives).toHaveAttribute('data-life-points', '8')

    await expect(lives).toHaveAttribute('data-transition', 'gain')
    await expect(hearts.nth(3)).toHaveAttribute('data-previous-state', 'half')
    await expect(hearts.nth(3)).toHaveAttribute('data-state', 'full')
    await expect(lives.locator('svg[data-transition]')).toHaveCount(1)
    await expect(lives.locator('.character-lives__delta')).toHaveCount(1)

    await page.waitForTimeout(900)
    expect(await runningLifeAnimations(page)).toBe(0)
    expect(await deltaOpacity()).toBe('1')
    expect(await states()).toEqual(['full', 'full', 'full', 'full', 'empty'])

    // Cambio de dueño en plena animación: reemplazo sin delta.
    await press('−3')
    await expect(lives).toHaveAttribute('data-transition', 'loss')
    await press('dueño B')
    await expect(lives).toHaveAttribute('data-transition', 'none')
    await expect(lives.locator('.character-lives__delta')).toHaveCount(0)
    expect(await runningLifeAnimations(page)).toBe(0)

    expect(warnings).toEqual([])
  })
})
