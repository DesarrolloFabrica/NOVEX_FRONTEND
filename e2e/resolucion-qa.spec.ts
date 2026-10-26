import { expect, test, type Page, type Route } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowStateResponse, type AgingProfile, type FlowQuery } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'
import { expectSingleScrollZone, expectStackedFullWidth } from './estado-lectura.helpers'

/**
 * QA visual · ESTADO · grupo RESOLUCIÓN (FLOW OUTCOME · scope COORDINATION),
 * último de la lectura continua (sin carrusel: se llega desplazando el cuerpo).
 * Viaja en /operational-kpis/state: los MISMOS cierres que «Cerrados» de
 * Movimiento (el fixture la deriva de los buckets). Cada coordinación tiene
 * otras duraciones (seed). Reloj fijo: martes 6 oct 2026 (Bogotá).
 * Capturas en e2e/artifacts/resolucion/.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'resolucion')
const CARD = '[data-testid="coordination-card"]'
const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const NOW = new Date('2026-10-06T12:00:00-05:00')
const TODAY = '2026-10-06'
const PERMS = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
  'REPORTS_EXPORT',
  'KPIS_VIEW',
]
const OVERVIEW = operationalOverviewFixture({ severe: true })
/** Casos QA: carga muy envejecida y coordinación sin activos. */
const PROFILE_BY_CODE: Record<string, AgingProfile> = {
  'coord-operaciones-academicas': 'stale',
  'coord-saber-pro': 'empty',
}

function meta(code: string) {
  const row = OVERVIEW.coordinations.find((c) => c.code === code)!
  return { id: row.id, code: row.code, name: row.name, shortName: row.shortName }
}

const b64 = (v: string) =>
  Buffer.from(v).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/** Última respuesta /state servida, para comprobar la cuadratura en pantalla. */
type Served = ReturnType<typeof flowStateResponse>

async function installDirector(page: Page, served: Served[]) {
  const session = {
    id: 'e2e-director',
    name: 'Director E2E',
    role: 'supervisor',
    roleCode: 'DIRECTOR',
    roleName: 'Director',
    permissions: PERMS,
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  const token = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(
    JSON.stringify({
      sub: session.id,
      email: 'director@novex.test',
      roleId: 'role-director',
      roleCode: 'DIRECTOR',
      coordinationId: null,
      permissions: PERMS,
      status: 'ACTIVE',
    }),
  )}.e2e`

  await page.clock.setFixedTime(NOW)
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ sessionKey, tokenKey, sessionValue, tokenValue }) => {
      localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
      localStorage.setItem(tokenKey, tokenValue)
    },
    { sessionKey: SESSION_KEY, tokenKey: TOKEN_KEY, sessionValue: session, tokenValue: token },
  )

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const p = url.pathname
    const q = Object.fromEntries(url.searchParams.entries())
    if (p.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name, status: 'ACTIVE' } } })
      return
    }
    if (p.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (p.includes('/operational-kpis/state')) {
      const query: FlowQuery = {
        coordinationId: q.coordinationId,
        kind: q.kind as FlowQuery['kind'],
        from: q.from,
        to: q.to,
        calendarEnd: q.calendarEnd ?? q.to,
      }
      const isB2B = q.coordinationId === meta('coord-b2b').id
      const partners = (
        isB2B
          ? ['coord-saber-pro', 'coord-servicios', 'coord-especializaciones']
          : ['coord-saber-pro', 'coord-servicios', 'coord-b2b']
      ).map((c) => {
        const m = meta(c)
        return { id: m.id, code: m.code, shortName: m.shortName }
      })
      const code = OVERVIEW.coordinations.find((c) => c.id === q.coordinationId)?.code ?? ''
      // Seed por coordinación: cada carta tiene su propia carga y antigüedad.
      const seed = isB2B ? 0 : OVERVIEW.coordinations.findIndex((c) => c.id === q.coordinationId) + 1
      const response = flowStateResponse(
        query,
        TODAY,
        seed,
        partners,
        PROFILE_BY_CODE[code] ?? 'default',
      )
      served.push(response)
      await route.fulfill({ json: response })
      return
    }
    if (p.includes('/operational-kpis')) {
      const coordinationId = q.coordinationId
      const problems = {
        activeCount: 10,
        status: { open: 6, inProgress: 4 },
        severity: { critical: 0, high: 1, medium: 8, low: 1 },
      }
      const metaBlock = {
        generatedAt: '2026-10-06T17:00:00.000Z',
        universe: { type: 'active-catalog', coordinationCount: 15 },
        metricVersions: { integrity: 'integrity-mvp-v1', lifePoints: 'life-points-v1' },
      }
      if (q.scope === 'coordination' && coordinationId) {
        const code = OVERVIEW.coordinations.find((c) => c.id === coordinationId)?.code ?? 'coord-b2b'
        await route.fulfill({
          json: {
            scope: { type: 'coordination', coordinationId },
            ...metaBlock,
            coordination: {
              coordination: meta(code),
              integrityStatus: 'CRITICO',
              lifePoints: 3,
              problems,
              dependencies: { incoming: 1, outgoing: 1 },
            },
          },
        })
        return
      }
      await route.fulfill({
        json: {
          scope: { type: 'direction' },
          ...metaBlock,
          direction: {
            directionStatus: 'ALERTA',
            problems,
            coordinationStatusTotals: { critical: 1, alert: 2, stable: 11, unknown: 1 },
            dependencies: { incoming: 4, outgoing: 3 },
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
    if (p.includes('/situations')) {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 100 } })
      return
    }
    await route.fulfill({ status: 200, json: {} })
  })
}

if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL })
}

const tid = (page: Page, id: string) => page.getByTestId(id)
async function openCoordination(page: Page, code: string) {
  await page.goto('/centro-operacional')
  await expect(tid(page, 'operational-shell')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(900)
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await expect(tid(page, 'director-flujo-chart').locator('svg')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(400)
}

const TREND = 'director-resolucion-trend-chart'
const DIST = 'director-tiempo-solucion-chart'

async function goToResolucion(page: Page) {
  await expect(tid(page, 'director-estado-carousel')).toHaveCount(0)
  await tid(page, 'director-resolucion').scrollIntoViewIfNeeded()
  await expect(tid(page, 'director-resolucion')).toBeInViewport()
  await page.waitForTimeout(600)
}

async function shoot(page: Page, name: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}.png`) })
}

async function shootAsIs(page: Page, name: string) {
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}.png`) })
}

/** Lo que Resolución dice (tablas accesibles + subtítulos). */
async function resolucionView(page: Page) {
  return {
    trend: await tid(page, 'director-resolucion-table').textContent(),
    bands: await tid(page, 'director-tiempo-solucion-table').textContent(),
    median: await tid(page, 'director-resolucion-median').textContent(),
    count: await tid(page, 'director-resolucion-count').textContent(),
  }
}

/** Cuadratura en pantalla: Σ rangos = Σ buckets = Σ Cerrados del periodo. */
async function expectSquared(page: Page, response: Served) {
  const solved = response.evolution.buckets.map((b) => (b.solved ? b.solved.total : null))
  expect(response.resolution.buckets.map((b) => b.closedCount)).toEqual(solved)
  const total = solved.reduce<number>((a, b) => a + (b ?? 0), 0)
  expect(response.resolution.closedCount).toBe(total)
  const values = (
    await tid(page, 'director-tiempo-solucion-table').locator('tbody tr td:first-of-type').allTextContents()
  ).map(Number)
  expect(values).toHaveLength(6)
  expect(values.reduce((a, b) => a + b, 0)).toBe(total)
  await expect(tid(page, 'director-resolucion-count')).toHaveText(
    `${total} ${total === 1 ? 'cerrado' : 'cerrados'} en el periodo`,
  )
}

/** Hover real sobre la columna de un bucket (banda transparente a todo el alto). */
async function hoverColumn(page: Page, index: number, of: number) {
  const box = (await tid(page, TREND).boundingBox())!
  const x = box.x + 44 + ((box.width - 60) * (index + 0.5)) / of
  await page.mouse.move(x, box.y + box.height * 0.45)
  await page.mouse.move(x + 1, box.y + box.height * 0.5, { steps: 3 })
  await page.waitForTimeout(450)
}

async function tooltipText(page: Page, chartId: string) {
  return tid(page, chartId).evaluate((node) =>
    Array.from(node.querySelectorAll('div'))
      .filter((d) => {
        const style = getComputedStyle(d)
        return style.position === 'absolute' && style.display !== 'none' && d.innerText.trim()
      })
      .map((d) => d.innerText)
      .join('\n'),
  )
}

/** Selecciona otra carta sin cambiar de pestaña ni de periodo. */
async function selectCard(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await page.waitForTimeout(900)
}

test.describe('QA ESTADO · RESOLUCIÓN · scope COORDINACIÓN', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [code, size, viewport] of [
    ['coord-b2b', '1440x900', { width: 1440, height: 900 }],
    ['coord-b2b', '1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    test(`${code} @ ${size} · H2: línea | distribución, sin scroll, cuadrada con Movimiento`, async ({ page }) => {
      test.slow()
      const served: Served[] = []
      await page.setViewportSize(viewport)
      await installDirector(page, served)
      await openCoordination(page, code)
      await goToResolucion(page)
      const response = served.at(-1)!
      await expect(tid(page, 'director-analysis-period-range')).toHaveText('1 JUL — 31 DIC 2026')
      await expect(tid(page, 'director-resolucion').locator('[data-testid$="-cut"]')).toHaveCount(0)
      await expect(tid(page, TREND).locator('svg')).toBeVisible()
      await expect(tid(page, DIST).locator('svg')).toBeVisible()
      await expect(tid(page, 'director-resolucion')).toHaveAttribute('data-level', 'month')
      await expectSquared(page, response)
      await expectStackedFullWidth(page, 'director-resolucion-tendencia', 'director-resolucion-distribucion', [TREND, DIST], 180)
      await expectSingleScrollZone(page)
      await shoot(page, `b2b-${size}-h2`)

      // Tooltip de la línea en un mes con cierres: mediana + cerrados.
      const index = response.resolution.buckets.findIndex((b) => (b.closedCount ?? 0) > 0)
      await hoverColumn(page, index, response.resolution.buckets.length)
      const tip = await tooltipText(page, TREND)
      expect(tip).toMatch(/Mediana/)
      expect(tip).toMatch(/Cerrados/)
      expect(tip).not.toMatch(/P75|SLA/)
      await shootAsIs(page, `b2b-${size}-h2-tooltip-linea`)
    })
  }

  test('principal · Op. Académica SEP → Ingenierías CAMBIA; mismo periodo', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    const OA = meta('coord-operaciones-academicas').id
    const ING = meta('coord-ingenierias').id
    await openCoordination(page, 'coord-operaciones-academicas')
    await tid(page, 'director-flujo-drill-2026-09-01').focus()
    await page.keyboard.press('Enter')
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('1 — 30 SEP 2026')
    await goToResolucion(page)
    await expect(tid(page, 'director-resolucion')).toHaveAttribute('data-level', 'week')
    expect(served.at(-1)!.scope.coordinationId).toBe(OA)
    const oa = await resolucionView(page)
    await expectSquared(page, served.at(-1)!)
    await shoot(page, 'secuencia-1-operacion-academica-sep')

    await selectCard(page, 'coord-ingenierias')
    await goToResolucion(page)
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('1 — 30 SEP 2026')
    expect(served.at(-1)!.scope.coordinationId).toBe(ING)
    const ing = await resolucionView(page)
    expect(ing).not.toEqual(oa)
    await expectSquared(page, served.at(-1)!)
    await shoot(page, 'secuencia-2-ingenierias-sep')
  })

  test('semana 7–13 SEP: buckets diarios, misma carta', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    await openCoordination(page, 'coord-b2b')
    await tid(page, 'director-flujo-drill-2026-09-01').focus()
    await page.keyboard.press('Enter')
    await tid(page, 'director-flujo-drill-2026-09-07').focus()
    await page.keyboard.press('Enter')
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('7 — 13 SEP 2026')
    await goToResolucion(page)
    await expect(tid(page, 'director-resolucion')).toHaveAttribute('data-level', 'day')
    await expectSquared(page, served.at(-1)!)
    await expectSingleScrollZone(page)
    await shoot(page, 'b2b-1440x900-semana-7-13-sep')
  })

  test('coordinación sin cierres (Saber Pro): UN mensaje, sin línea ni barras', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    await openCoordination(page, 'coord-saber-pro')
    await goToResolucion(page)
    expect(served.at(-1)!.resolution.closedCount).toBe(0)
    await expect(tid(page, 'director-resolucion-empty')).toHaveText(
      'Sin problemas cerrados en este periodo',
    )
    await expect(tid(page, TREND)).toHaveCount(0)
    await expect(tid(page, DIST)).toHaveCount(0)
    await expectSingleScrollZone(page)
    await shoot(page, 'saber-pro-1440x900-sin-cierres')
  })
})
