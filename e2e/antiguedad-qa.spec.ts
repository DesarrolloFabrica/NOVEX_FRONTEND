import { expect, test, type Page, type Route } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowStateResponse, type AgingProfile, type FlowQuery } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * QA visual · ESTADO lámina 3 · ANTIGÜEDAD (SNAPSHOT AT CUT · scope COORDINATION).
 * Viaja en /operational-kpis/state: misma población y corte que Carga,
 * Severidad y Atención de la carta seleccionada. Cada coordinación envejece
 * distinto (seed del fixture). Reloj fijo: martes 6 oct 2026 (Bogotá).
 * Capturas en e2e/artifacts/antiguedad/.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'antiguedad')
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
const RANKING = 'director-antiguedad-chart'
const DISTRIBUCION = 'director-distribucion-chart'

async function openCoordination(page: Page, code: string) {
  await page.goto('/centro-operacional')
  await expect(tid(page, 'operational-shell')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(900)
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await expect(tid(page, 'director-flujo-chart').locator('svg')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(400)
}

async function goToAntiguedad(page: Page) {
  await tid(page, 'director-estado-carousel-dot-2').click()
  await expect(tid(page, 'director-estado-carousel')).toHaveAttribute('data-page', '2')
  await expect(tid(page, 'director-estado-carousel')).toHaveAttribute('data-pages', '4')
  await page.waitForTimeout(600)
}

/** Textos del SVG de una gráfica con su posición (para leer orden y hacer hover). */
async function svgTexts(page: Page, chartId: string) {
  return tid(page, chartId)
    .locator('svg text')
    .evaluateAll((nodes) =>
      nodes
        .map((n) => ({ text: (n.textContent ?? '').trim(), box: n.getBoundingClientRect() }))
        .filter((t) => t.text)
        .map((t) => ({
          text: t.text,
          x: t.box.left,
          right: t.box.right,
          y: t.box.top + t.box.height / 2,
        })),
    )
}

/** Hover real sobre la fila de una barra (a la izquierda de su etiqueta de valor). */
async function hoverRanking(page: Page, ageLabel: string) {
  const label = (await svgTexts(page, RANKING)).find((t) => t.text === ageLabel)
  if (!label) throw new Error(`Sin etiqueta ${ageLabel}`)
  await page.mouse.move(label.x - 30, label.y - 3)
  await page.mouse.move(label.x - 18, label.y, { steps: 4 })
  await page.waitForTimeout(450)
}

/** Hover real sobre la fila de un rango (a la derecha de su etiqueta de eje). */
async function hoverBand(page: Page, bandLabel: string) {
  const label = (await svgTexts(page, DISTRIBUCION)).find((t) => t.text === bandLabel)
  if (!label) throw new Error(`Sin rango ${bandLabel}`)
  await page.mouse.move(label.right + 30, label.y - 3)
  await page.mouse.move(label.right + 20, label.y, { steps: 4 })
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

async function expectNoVerticalScroll(page: Page) {
  const probe = await tid(page, 'director-reading-body').evaluate((node) => ({
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }))
  expect(probe.scrollHeight).toBeLessThanOrEqual(probe.clientHeight + 2)
}

/** Ranking más ancho (≈ 60 %) que la distribución; lado a lado, sin columna única. */
async function expectPairLayout(page: Page) {
  const ranking = await tid(page, 'director-antiguedad-ranking').boundingBox()
  const dist = await tid(page, 'director-antiguedad-distribucion').boundingBox()
  expect(ranking && dist).toBeTruthy()
  expect(Math.abs(ranking!.y - dist!.y)).toBeLessThanOrEqual(2)
  expect(dist!.x).toBeGreaterThan(ranking!.x + ranking!.width)
  const share = ranking!.width / (ranking!.width + dist!.width)
  expect(share).toBeGreaterThan(0.56)
  expect(share).toBeLessThan(0.64)
  // Ambas gráficas completas dentro de la lectura.
  const bodyBottom = await tid(page, 'director-reading-body').evaluate(
    (node) => node.getBoundingClientRect().bottom,
  )
  for (const id of [RANKING, DISTRIBUCION]) {
    const box = await tid(page, id).boundingBox()
    expect(box!.height).toBeGreaterThan(180)
    expect(box!.y + box!.height).toBeLessThanOrEqual(bodyBottom + 1)
  }
}

/** Valores de la distribución en orden (0–7 → 31+), desde la tabla accesible. */
async function bandValues(page: Page) {
  return tid(page, 'director-distribucion-table')
    .locator('tbody tr td:first-of-type')
    .allTextContents()
}

async function shoot(page: Page, name: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}.png`) })
}

async function shootAsIs(page: Page, name: string) {
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}.png`) })
}

/** Lo que la lámina de Antigüedad muestra (para comparar entre cartas / periodos). */
async function agingView(page: Page) {
  return {
    cut: await tid(page, 'director-antiguedad-cut').textContent(),
    table: await tid(page, 'director-antiguedad-table').textContent(),
    bands: await tid(page, 'director-distribucion-table').textContent(),
    median: await tid(page, 'director-antiguedad-median').textContent(),
  }
}

/** Etiquetas de edad del ranking, de arriba abajo. */
async function rankingAges(page: Page) {
  return (await svgTexts(page, RANKING))
    .filter((t) => /^(\d+ d|HOY)$/.test(t.text))
    .sort((a, b) => a.y - b.y)
    .map((t) => t.text)
}

const ageLabel = (days: number) => (days === 0 ? 'HOY' : `${days} d`)

/** Cuadratura en pantalla: Antigüedad = Carga (último punto) = Σ rangos, mismo corte. */
async function expectSquared(page: Page, response: Served) {
  const last = response.evolution.buckets.filter((b) => !b.future).at(-1)!
  expect(response.aging.activeCount).toBe(last.active?.total ?? 0)
  expect(response.snapshot.activeCount).toBe(response.aging.activeCount)
  expect(response.aging.at).toBe(response.period.dataTo)
  const values = (await bandValues(page)).map(Number)
  expect(values.reduce((a, b) => a + b, 0)).toBe(response.aging.activeCount)
  return values
}

/** Selecciona otra carta SIN salir de la lámina actual del carrusel. */
async function selectCard(page: Page, code: string) {
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await page.waitForTimeout(900)
}

test.describe('QA ESTADO · ANTIGÜEDAD · scope COORDINACIÓN', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [code, size, viewport] of [
    ['coord-b2b', '1440x900', { width: 1440, height: 900 }],
    ['coord-b2b', '1920x1080', { width: 1920, height: 1080 }],
    ['coord-especializaciones', '1440x900', { width: 1440, height: 900 }],
  ] as const) {
    test(`${code} @ ${size} · coordinación HOY`, async ({ page }) => {
      test.slow()
      const served: Served[] = []
      await page.setViewportSize(viewport)
      await installDirector(page, served)
      await openCoordination(page, code)
      await goToAntiguedad(page)
      const short = code.replace('coord-', '')
      const response = served.at(-1)!
      expect(response.scope.coordinationId).toBe(meta(code).id)

      // Sin etiqueta «Dirección» ni coordinación repetida por fila.
      await expect(tid(page, 'director-antiguedad-scope')).toHaveCount(0)
      await expect(
        tid(page, 'director-antiguedad-table').locator('[data-testid^="director-antiguedad-responsible-"]'),
      ).toHaveCount(0)
      await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
      await expect(tid(page, 'director-antiguedad-cut')).toHaveText('HOY')

      await expectSquared(page, response)
      await expect(tid(page, 'director-antiguedad-median')).toHaveText(
        `Mediana · ${String(response.aging.medianAgeDays).replace('.', ',')} días`,
      )
      expect(await rankingAges(page)).toEqual(response.aging.oldest.map((i) => ageLabel(i.ageDays)))
      await expect(tid(page, 'director-antiguedad-more')).toHaveText(
        `+ ${response.aging.activeCount - 5} activos fuera del Top 5`,
      )

      await expectPairLayout(page)
      await expectNoVerticalScroll(page)
      await shoot(page, `${short}-${size}-hoy`)

      // Tooltip INTER: compromiso y a quién afecta; nunca «Responsable».
      const inter = response.aging.oldest[1]
      expect(inter.reportKind).toBe('INTER_COORDINATION')
      await hoverRanking(page, ageLabel(inter.ageDays))
      const tip = await tooltipText(page, RANKING)
      expect(tip).toContain(`Compromiso · afecta a ${inter.affectedCoordinationName}`)
      expect(tip).toMatch(/CRÍTICA · En atención · SLA vencido/)
      expect(tip).not.toMatch(/Responsable|Origen/i)
      await shootAsIs(page, `${short}-${size}-hoy-tooltip-ranking`)

      const values = (await bandValues(page)).map(Number)
      await hoverBand(page, '31+ días')
      const bandTip = await tooltipText(page, DISTRIBUCION)
      expect(bandTip).toContain(
        `${Math.round((values[3] / response.aging.activeCount) * 100)} % de la carga`,
      )
      expect(bandTip).toContain('Corte: hoy · 6 oct 2026')
    })
  }

  test('principal · Op. Académica → Ingenierías CAMBIA; volver a Op. Académica y H2 → SEP cambia el corte', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    const OA = meta('coord-operaciones-academicas').id
    const ING = meta('coord-ingenierias').id

    // 1 · Operación Académica, lámina 3.
    await openCoordination(page, 'coord-operaciones-academicas')
    await goToAntiguedad(page)
    const oa = await agingView(page)
    expect(served.at(-1)!.scope.coordinationId).toBe(OA)
    await expectSquared(page, served.at(-1)!)
    await shoot(page, 'secuencia-1-operacion-academica-h2')

    // 2 · Ingenierías (hija visible en el mazo abierto): misma lámina y periodo, OTRA lectura.
    await selectCard(page, 'coord-ingenierias')
    await expect(tid(page, 'director-estado-carousel')).toHaveAttribute('data-page', '2')
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
    await expect(tid(page, 'director-antiguedad-cut')).toHaveText('HOY')
    expect(served.at(-1)!.scope.coordinationId).toBe(ING)
    const ing = await agingView(page)
    expect(ing.cut).toBe(oa.cut)
    expect(ing).not.toEqual(oa)
    await expectSquared(page, served.at(-1)!)
    await shoot(page, 'secuencia-2-ingenierias-h2')

    // 3 · Volver a Operación Académica: vuelve su propia lectura.
    await selectCard(page, 'coord-operaciones-academicas')
    await expect(tid(page, 'director-estado-carousel')).toHaveAttribute('data-page', '2')
    expect(served.at(-1)!.scope.coordinationId).toBe(OA)
    expect(await agingView(page)).toEqual(oa)

    // 4 · H2 → SEP (drill-down en Carga) → lámina 3: misma carta, otro corte.
    await tid(page, 'director-estado-carousel-dot-0').click()
    await page.waitForTimeout(400)
    await tid(page, 'director-flujo-drill-2026-09-01').focus()
    await page.keyboard.press('Enter')
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('SEPTIEMBRE 2026')
    await goToAntiguedad(page)
    await expect(tid(page, 'director-antiguedad-cut')).toHaveText('AL CIERRE DEL 30 SEP 2026')
    const sep = served.at(-1)!
    expect(sep.scope.coordinationId).toBe(OA)
    expect(sep.aging.at).toBe('2026-09-30')
    expect(await agingView(page)).not.toEqual(oa)
    await expectSquared(page, sep)
    await shoot(page, 'secuencia-3-operacion-academica-sep')
  })

  test('semana histórica 7–13 SEP: corte al 13 SEP, fiabilidad histórica', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    await openCoordination(page, 'coord-b2b')
    await tid(page, 'director-flujo-drill-2026-09-01').focus()
    await page.keyboard.press('Enter')
    await expect(tid(page, 'director-flujo')).toHaveAttribute('data-level', 'week')
    await tid(page, 'director-flujo-drill-2026-09-07').focus()
    await page.keyboard.press('Enter')
    await expect(tid(page, 'director-analysis-period-range')).toHaveText('7 — 13 SEP 2026')
    await goToAntiguedad(page)
    await expect(tid(page, 'director-antiguedad-cut')).toHaveText('AL CIERRE DEL 13 SEP 2026')
    const response = served.at(-1)!
    expect(response.aging.at).toBe('2026-09-13')
    await expectSquared(page, response)
    await expectNoVerticalScroll(page)
    await shoot(page, 'b2b-1440x900-semana-7-13-sep')

    await hoverRanking(page, ageLabel(response.aging.oldest[1].ageDays))
    const tip = await tooltipText(page, RANKING)
    expect(tip).toMatch(/CRÍTICA \(actual\)/)
    expect(tip).toMatch(/Solucionado después/)
    expect(tip).toMatch(/Compromiso · afecta a /)
    expect(tip).not.toMatch(/SLA|En atención|Abierto|Responsable/)
    await shootAsIs(page, 'b2b-1440x900-semana-tooltip')
  })

  test('coordinación muy envejecida (31+ domina): Operación Académica', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    await openCoordination(page, 'coord-operaciones-academicas')
    await goToAntiguedad(page)
    const values = await expectSquared(page, served.at(-1)!)
    expect(values[3]).toBeGreaterThan(values[0] + values[1] + values[2])
    await expectPairLayout(page)
    await expectNoVerticalScroll(page)
    await shoot(page, 'operacion-academica-1440x900-envejecida')
  })

  test('coordinación sin activos (Saber Pro): lectura vacía, cuadrada con Carga en 0', async ({ page }) => {
    test.slow()
    const served: Served[] = []
    await page.setViewportSize({ width: 1440, height: 900 })
    await installDirector(page, served)
    await openCoordination(page, 'coord-saber-pro')
    await goToAntiguedad(page)
    const response = served.at(-1)!
    expect(response.aging.activeCount).toBe(0)
    await expect(tid(page, 'director-antiguedad-empty')).toHaveText(
      'Sin problemas activos en este corte',
    )
    await expect(tid(page, RANKING)).toHaveCount(0)
    await expectNoVerticalScroll(page)
    await shoot(page, 'saber-pro-1440x900-sin-activos')
  })
})
