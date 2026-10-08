import { expect, test, type Page, type Route } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowStateResponse, type FlowQuery } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * QA visual: ESTADO = CARGA | MOVIMIENTO lado a lado como navegador temporal.
 * Ciclo (meses) → click en OCT (en cualquiera de las dos) → mes (semanas en
 * AMBAS) → click en 5–11 OCT → semana (días). Clicks reales sobre la banda de
 * la categoría en el SVG de ECharts.
 * Reloj fijo: martes 6 oct 2026 (Bogotá). Capturas en e2e/artifacts/flujo/.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'flujo')
const CARD = '[data-testid="coordination-card"]'
const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const NOW = new Date('2026-10-06T12:00:00-05:00')
const TODAY = '2026-10-06'

const DIRECTOR_PERMS = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
  'REPORTS_EXPORT',
  'KPIS_VIEW',
]

const OVERVIEW = operationalOverviewFixture({ severe: true })

const OPEN_PROBLEMS = [
  ['p-1', 'Aulas sin conectividad en sede norte con reporte repetido de docentes', 'CRITICAL'],
  ['p-2', 'Convenio empresarial vencido', 'HIGH'],
  ['p-3', 'Docente sin asignar para el grupo de la noche', 'MEDIUM'],
  ['p-4', 'Plataforma de notas lenta en cierre', 'HIGH'],
  ['p-5', 'Falta acta de comité', 'LOW'],
  ['p-6', 'Equipos de laboratorio sin mantenimiento', 'MEDIUM'],
] as const

function meta(code: string) {
  const row = OVERVIEW.coordinations.find((c) => c.code === code)!
  return { id: row.id, code: row.code, name: row.name, shortName: row.shortName }
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function installDirector(page: Page, states: FlowQuery[]) {
  const session = {
    id: 'e2e-director',
    name: 'Director E2E',
    role: 'supervisor',
    roleCode: 'DIRECTOR',
    roleName: 'Director',
    permissions: DIRECTOR_PERMS,
    onboardingStep: 100,
    onboardingCompleted: true,
  }
  const token = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: session.id,
      email: 'director@novex.test',
      roleId: 'role-director',
      roleCode: 'DIRECTOR',
      coordinationId: null,
      permissions: DIRECTOR_PERMS,
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
      states.push(query)
      const isB2B = q.coordinationId === meta('coord-b2b').id
      const seed = isB2B ? 0 : 2
      // Coordinaciones AFECTADAS por problemas cuya responsable es la seleccionada.
      const partners = (
        isB2B
          ? ['coord-saber-pro', 'coord-servicios', 'coord-especializaciones']
          : ['coord-saber-pro', 'coord-servicios', 'coord-b2b']
      ).map((c) => {
        const m = meta(c)
        return { id: m.id, code: m.code, shortName: m.shortName }
      })
      await route.fulfill({ json: flowStateResponse(query, TODAY, seed, partners) })
      return
    }
    if (p.includes('/operational-kpis')) {
      const coordinationId = q.coordinationId
      if (q.scope === 'coordination' && coordinationId) {
        const code = OVERVIEW.coordinations.find((c) => c.id === coordinationId)?.code ?? 'coord-b2b'
        await route.fulfill({
          json: {
            scope: { type: 'coordination', coordinationId },
            generatedAt: '2026-10-06T17:00:00.000Z',
            universe: { type: 'active-catalog', coordinationCount: 15 },
            metricVersions: { integrity: 'integrity-mvp-v1', lifePoints: 'life-points-v1' },
            coordination: {
              coordination: meta(code),
              integrityStatus: 'CRITICO',
              lifePoints: 3,
              problems: {
                activeCount: 10,
                status: { open: 6, inProgress: 4 },
                severity: { critical: 0, high: 1, medium: 8, low: 1 },
              },
              dependencies: { incoming: 1, outgoing: 1 },
            },
          },
        })
        return
      }
      await route.fulfill({
        json: {
          scope: { type: 'direction' },
          generatedAt: '2026-10-06T17:00:00.000Z',
          universe: { type: 'active-catalog', coordinationCount: 15 },
          metricVersions: { integrity: 'integrity-mvp-v1', lifePoints: 'life-points-v1' },
          direction: {
            directionStatus: 'ALERTA',
            problems: {
              activeCount: 37,
              status: { open: 20, inProgress: 17 },
              severity: { critical: 1, high: 12, medium: 10, low: 14 },
            },
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
      // Problemas abiertos de la coordinación seleccionada (panel compacto).
      const owner = OVERVIEW.coordinations.find((c) => c.id === q.coordinationId)
      const items =
        owner && (q.status === 'OPEN' || !q.status)
          ? OPEN_PROBLEMS.map(([id, title, severity]) => ({
              id: `${owner.code}-${id}`,
              title,
              description: '',
              coordinationId: owner.id,
              coordinationCode: owner.code,
              coordinationName: owner.shortName,
              createdByUserId: 'user',
              createdByUserName: 'User',
              categoryId: 'cat',
              categoryCode: 'CAT',
              categoryName: 'Internet',
              severity,
              status: 'OPEN',
              occurredAt: '2026-09-01T10:00:00.000Z',
              createdAt: '2026-09-01T10:00:00.000Z',
              updatedAt: '2026-09-01T10:00:00.000Z',
            }))
          : []
      await route.fulfill({ json: { items, total: items.length, page: 1, limit: 100 } })
      return
    }
    await route.fulfill({ status: 200, json: {} })
  })
}

if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL })
}

const tid = (page: Page, id: string) => page.getByTestId(id)

const CARGA = 'director-flujo-chart'
const MOVIMIENTO = 'director-movimiento-chart'

async function flujoReady(page: Page, level: 'month' | 'week' | 'day') {
  await expect(tid(page, 'director-flujo')).toHaveAttribute('data-level', level)
  await expect(tid(page, CARGA).locator('svg')).toBeVisible()
  await expect(tid(page, MOVIMIENTO).locator('svg')).toBeVisible()
  await page.waitForTimeout(500)
}

/** Etiquetas del eje X (sin las marcas ACTUAL/FUTURO). */
async function axisLabels(page: Page, chartId: string) {
  const texts = await tid(page, chartId)
    .locator('svg text')
    .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''))
  return texts.map((t) => t.trim()).filter((t) => t && !/^(ACTUAL|FUTURO|\d+)$/.test(t))
}

/** Click real en la BANDA de una categoría: misma X que su etiqueta, dentro del grid. */
async function clickBand(page: Page, axisText: string, chartId = CARGA) {
  const chart = tid(page, chartId)
  await chart.scrollIntoViewIfNeeded()
  const label = chart.locator('svg text', { hasText: new RegExp(`^${axisText}$`) }).first()
  const labelBox = await label.boundingBox()
  const chartBox = await chart.boundingBox()
  if (!labelBox || !chartBox) throw new Error(`Sin caja para ${axisText}`)
  const x = labelBox.x + labelBox.width / 2
  const y = chartBox.y + chartBox.height * 0.45
  // Varios mousemove: ECharts aplica throttle al hover (como un ratón real).
  await page.mouse.move(x - 6, y - 4)
  await page.mouse.move(x, y, { steps: 4 })
  await page.waitForTimeout(350)
  return { x, y, click: () => page.mouse.click(x, y) }
}

/**
 * Hover real sobre un SEGMENTO (path SVG de ECharts) por color de relleno,
 * en la columna de la categoría indicada.
 */
async function segmentPoint(page: Page, axisText: string, fills: string[]) {
  const chart = tid(page, 'director-flujo-chart')
  await chart.scrollIntoViewIfNeeded()
  const point = await chart.evaluate(
    (node, { axisText, fills }) => {
      const label = Array.from(node.querySelectorAll('svg text')).find(
        (t) => t.textContent?.trim() === axisText,
      )
      if (!label) return null
      const lb = label.getBoundingClientRect()
      const cx = lb.left + lb.width / 2
      const probe = document.createElement('span')
      const normalize = (value: string | null) => {
        if (!value) return ''
        probe.style.color = value
        document.body.appendChild(probe)
        const out = getComputedStyle(probe).color
        probe.remove()
        return out
      }
      // Color base o de énfasis (hover reciente aún en transición).
      const wanted = fills.map((value) => normalize(value))
      const candidates = Array.from(node.querySelectorAll('svg path'))
        .map((path) => ({ path, box: path.getBoundingClientRect() }))
        .filter(({ path, box }) =>
          box.height > 4 &&
          box.width > 4 &&
          box.width < 60 &&
          // Solo barras: por encima de la etiqueta del eje.
          box.bottom <= lb.top + 2 &&
          Math.abs(box.left + box.width / 2 - cx) < 40 &&
          wanted.includes(normalize(path.getAttribute('fill'))),
        )
        .sort((p, q) => q.box.height - p.box.height)
      const hit = candidates[0]
      if (!hit) return null
      return { x: hit.box.left + hit.box.width / 2, y: hit.box.top + hit.box.height / 2 }
    },
    { axisText, fills },
  )
  if (!point) throw new Error(`Sin segmento ${fills.join('/')} en ${axisText}`)
  return point
}

async function hoverAt(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x - 3, point.y + 3)
  await page.mouse.move(point.x, point.y, { steps: 4 })
  await page.waitForTimeout(350)
}

async function shoot(page: Page, name: string) {
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}.png`) })
}

/** Centro Operacional completo (personaje, problemas, lectura y baraja). */
async function shootFull(page: Page, name: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
}

const crumbText = (page: Page) => tid(page, 'director-flujo-crumb').innerText()

/**
 * Datos > decoración: en puntos clave de la gráfica (etiquetas del eje y
 * esquinas del área de barras) el elemento superior debe pertenecer a la
 * gráfica, nunca a un ornamento del ticket.
 */
/** ESTADO cabe entero: el body de la lectura no tiene scroll real. */
async function expectNoVerticalScroll(page: Page) {
  const probe = await tid(page, 'director-reading-body').evaluate((node) => ({
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
    overflowY: getComputedStyle(node).overflowY,
  }))
  expect(probe.scrollHeight).toBeLessThanOrEqual(probe.clientHeight + 2)
  await expect(tid(page, 'director-reading-panel')).toHaveAttribute('data-scroll-more', 'false')
}

/** Lámina visible del carrusel (el track se desplaza con transform). */
async function expectCarouselPage(page: Page, index: number) {
  await expect(tid(page, 'director-estado-carousel')).toHaveAttribute('data-page', String(index))
  // Espera a que termine el desplazamiento (≈220 ms) antes de medir/capturar.
  await page.waitForTimeout(400)
  const viewport = await tid(page, 'director-estado-carousel')
    .locator('.director-estado-carousel__viewport')
    .boundingBox()
  const active = await tid(page, 'director-estado-carousel')
    .locator('.director-estado-carousel__page[data-active="true"]')
    .boundingBox()
  expect(viewport && active).toBeTruthy()
  expect(Math.abs(active!.x - viewport!.x)).toBeLessThanOrEqual(2)
}

async function expectNoOrnamentOverChart(page: Page, chartId = CARGA) {
  const chart = tid(page, chartId)
  await chart.scrollIntoViewIfNeeded()
  const offenders = await chart.evaluate((node) => {
    const box = node.getBoundingClientRect()
    const points: Array<[number, number]> = [
      [box.left + 8, box.bottom - 8],
      [box.right - 8, box.bottom - 8],
      [box.left + 8, box.top + 8],
      [box.right - 8, box.top + 8],
    ]
    node.querySelectorAll('svg text').forEach((text) => {
      const r = text.getBoundingClientRect()
      if (r.width > 0) points.push([r.left + r.width / 2, r.top + r.height / 2])
    })
    return points
      .map(([x, y]) => ({ x, y, el: document.elementFromPoint(x, y) }))
      .filter(({ el }) => !el || !node.contains(el))
      .map(
        ({ x, y, el }) =>
          `${Math.round(x)},${Math.round(y)} → ${el?.tagName}.${String(
            (el as HTMLElement | null)?.className ?? '',
          )}`,
      )
  })
  expect(offenders).toEqual([])
}

test.describe('QA ESTADO · Carga | Movimiento · drill-down ciclo → mes → semana', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [size, viewport] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    const codes =
      size === '1440x900'
        ? (['coord-b2b', 'coord-especializaciones', 'coord-operaciones-academicas'] as const)
        : (['coord-b2b', 'coord-especializaciones'] as const)
    for (const code of codes) {
      test(`${code} @ ${size}`, async ({ page }) => {
        // Recorrido completo de las cuatro láminas (con drill-down): más que test.slow().
        test.setTimeout(180_000)
        const states: FlowQuery[] = []
        await page.setViewportSize(viewport)
        await installDirector(page, states)
        await page.goto('/centro-operacional')
        await expect(tid(page, 'operational-shell')).toBeVisible({ timeout: 60_000 })
        await page.waitForTimeout(900)
        await page.locator(`${CARD}[data-code="${code}"]`).first().click()
        const short = code.replace('coord-', '')

        // 1 · CICLO (default): meses JUL–DIC; NOV/DIC futuros.
        await flujoReady(page, 'month')
        // Sin ruta en nivel ciclo (el periodo está justo encima, en el picker).
        await expect(tid(page, 'director-flujo-crumb')).toHaveCount(0)
        // Sin identidad ni estado repetidos en la lectura.
        const header = tid(page, 'director-reading-panel').locator('header.director-reading__header')
        await expect(header).toContainText('Lectura de coordinación')
        await expect(header).not.toContainText(meta(code).shortName)
        await expect(header).not.toContainText(/activos?/)
        await expect(tid(page, 'director-estado-operativo')).toHaveCount(0)
        // Al entrar: tabs → periodo → CARGA | MOVIMIENTO completas, sin scroll.
        const bodyBox = await tid(page, 'director-reading-body').boundingBox()
        const cargaBox = await tid(page, CARGA).boundingBox()
        const movBox = await tid(page, MOVIMIENTO).boundingBox()
        expect(bodyBox && cargaBox && movBox).toBeTruthy()
        for (const box of [cargaBox!, movBox!]) {
          expect(box.y + box.height).toBeLessThanOrEqual(bodyBox!.y + bodyBox!.height + 1)
          expect(box.height).toBeGreaterThanOrEqual(240)
        }
        // Lado a lado, misma línea base; Carga algo más ancha que Movimiento.
        expect(Math.abs(cargaBox!.y - movBox!.y)).toBeLessThanOrEqual(2)
        expect(movBox!.x).toBeGreaterThan(cargaBox!.x + cargaBox!.width)
        expect(cargaBox!.width).toBeGreaterThan(movBox!.width)
        // Mismo eje temporal en las dos.
        expect(await axisLabels(page, MOVIMIENTO)).toEqual(await axisLabels(page, CARGA))
        expect(await axisLabels(page, CARGA)).toEqual(['JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'])
        await expectNoOrnamentOverChart(page)
        await expectNoOrnamentOverChart(page, MOVIMIENTO)
        await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
        expect(states.at(-1)).toMatchObject({ kind: 'cycle', from: '2026-07-01', calendarEnd: '2026-12-31' })
        await shoot(page, `${short}-1-ciclo-${size}`)
        await shootFull(page, `${short}-0-centro-ciclo-${size}`)

        // CARRUSEL: sin scroll vertical; lámina 1 por defecto.
        await expectNoVerticalScroll(page)
        await expectCarouselPage(page, 0)
        await expect(tid(page, 'director-estado-carousel-prev')).toBeDisabled()
        await expect(tid(page, 'director-estado-carousel-next')).toBeEnabled()

        // → Lámina 2: Severidad | Atención, mismo periodo, sin scroll.
        await tid(page, 'director-estado-carousel-next').click()
        await expectCarouselPage(page, 1)
        await expect(tid(page, 'director-estado-severity-chart').locator('svg')).toBeVisible()
        await expect(tid(page, 'director-estado-attention-chart').locator('svg')).toBeVisible()
        // Lámina 3 (Antigüedad) existe a la derecha: «siguiente» sigue activo.
        await expect(tid(page, 'director-estado-carousel-next')).toBeEnabled()
        await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
        await expectNoVerticalScroll(page)
        const severityBox = await tid(page, 'director-estado-severity-chart').boundingBox()
        const attentionBox = await tid(page, 'director-estado-attention-chart').boundingBox()
        const bodyBottom = await tid(page, 'director-reading-body').evaluate(
          (node) => node.getBoundingClientRect().bottom,
        )
        for (const box of [severityBox!, attentionBox!]) {
          expect(box.height).toBeGreaterThanOrEqual(180)
          expect(box.y + box.height).toBeLessThanOrEqual(bodyBottom + 1)
        }
        // Severidad más ancha que el donut, lado a lado.
        expect(severityBox!.width).toBeGreaterThan(attentionBox!.width)
        expect(attentionBox!.x).toBeGreaterThan(severityBox!.x + severityBox!.width)
        await expectNoOrnamentOverChart(page, 'director-estado-severity-chart')
        await expectNoOrnamentOverChart(page, 'director-estado-attention-chart')
        await shootFull(page, `${short}-0-centro-pagina2-${size}`)

        // → Lámina 3: Antigüedad; mismo periodo, sin scroll.
        await tid(page, 'director-estado-carousel-next').click()
        await expectCarouselPage(page, 2)
        await expect(tid(page, 'director-antiguedad-chart').locator('svg')).toBeVisible()
        await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
        await expectNoVerticalScroll(page)

        // → Lámina 4: Resolución, última; mismo periodo, sin scroll.
        await tid(page, 'director-estado-carousel-next').click()
        await expectCarouselPage(page, 3)
        await expect(tid(page, 'director-resolucion-trend-chart').locator('svg')).toBeVisible()
        await expect(tid(page, 'director-tiempo-solucion-chart').locator('svg')).toBeVisible()
        await expect(tid(page, 'director-estado-carousel-next')).toBeDisabled()
        await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
        await expectNoVerticalScroll(page)
        await shootFull(page, `${short}-0-centro-pagina4-${size}`)

        // ← Lámina 1 de nuevo: el periodo no se movió.
        await tid(page, 'director-estado-carousel-dot-0').click()
        await expectCarouselPage(page, 0)
        await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
        expect(states.at(-1)).toMatchObject({ kind: 'cycle', from: '2026-07-01' })

        // Ayuda «?» de cada gráfica (hover).
        await tid(page, 'director-carga-help').hover()
        await expect(
          page.getByText('Problemas que seguían pendientes al cierre de cada periodo.'),
        ).toBeVisible()
        await tid(page, 'director-movimiento-help').hover()
        await expect(
          page.getByText('Problemas reportados y solucionados durante cada periodo.'),
        ).toBeVisible()

        // Hover sobre OCT: tooltip con pendientes; click sobre la banda.
        const oct = await clickBand(page, 'OCT')
        // Tooltip de la banda OCT: su título «Octubre 2026 · actual» no existe en
        // ningún otro lugar de la página (el resumen dice solo «Pendientes ahora»).
        const tooltip = page.getByText('Octubre 2026 · actual')
        await expect(tooltip).toBeVisible()
        await expect(tooltip.locator('xpath=..')).toContainText('Activos ahora')
        // Hover sincronizado: la columna OCT (índice 3) se resalta en las dos.
        await expect(tid(page, 'director-flujo')).toHaveAttribute('data-hover-index', '3')
        await shoot(page, `${short}-1b-ciclo-tooltip-oct-${size}`)
        void oct

        // Tooltip del MOVIMIENTO: reportados y solucionados de OCT.
        await clickBand(page, 'OCT', MOVIMIENTO)
        const movTip = tid(page, MOVIMIENTO).getByText('Octubre 2026 · actual')
        await expect(movTip).toBeVisible()
        await expect(movTip.locator('xpath=..')).toContainText('Reportados')
        await expect(movTip.locator('xpath=..')).toContainText('Solucionados')
        await expect(tid(page, 'director-flujo')).toHaveAttribute('data-hover-index', '3')
        await shoot(page, `${short}-1e-ciclo-hover-movimiento-oct-${size}`)

        // CARGA = LÍNEA: el punto OCT (actual, relleno oscuro) explica la
        // composición en un solo tooltip: internos por categoría y externos
        // por coordinación afectada. Posición tomada ANTES del hover (el
        // énfasis de ECharts repinta el SVG).
        await page.mouse.move(0, 0)
        await page.waitForTimeout(300)
        const octPoint = await segmentPoint(page, 'OCT', ['#3a2b1f', '#231910'])
        await hoverAt(page, octPoint)
        const lineTip = tid(page, CARGA).getByText('Octubre 2026 · actual')
        await expect(lineTip).toBeVisible()
        const lineTipBox = lineTip.locator('xpath=..')
        await expect(lineTipBox).toContainText('Activos ahora')
        await expect(lineTipBox).toContainText('Internet')
        await expect(lineTipBox).toContainText('coordinaciones afectadas')
        await expect(lineTipBox).toContainText('Saber Pro')
        await expect(tid(page, 'director-flujo')).toHaveAttribute('data-hover-index', '3')
        await shoot(page, `${short}-1c-ciclo-hover-punto-oct-${size}`)

        if (code === 'coord-b2b') {
          // B2B → OCTUBRE desde el MOVIMIENTO: la Carga también pasa a semanas.
          const movOct = await clickBand(page, 'OCT', MOVIMIENTO)
          await movOct.click()
        } else {
          // Click sobre el PUNTO de la línea (no solo la banda) abre OCT.
          await page.mouse.click(octPoint.x, octPoint.y)
        }

        // 2 · MES: semanas de octubre (1–4 OCT … 26–31 OCT) en AMBAS gráficas.
        await flujoReady(page, 'week')
        const weeks = await axisLabels(page, CARGA)
        expect(weeks[0]).toBe('1–4')
        expect(weeks).toContain('5–11')
        expect(await axisLabels(page, MOVIMIENTO)).toEqual(weeks)
        expect(await crumbText(page)).toMatch(/H2 2026\s*›\s*OCTUBRE/)
        expect(states.at(-1)).toMatchObject({ kind: 'month', from: '2026-10-01', calendarEnd: '2026-10-31' })
        await expectNoOrnamentOverChart(page)
        await expectNoOrnamentOverChart(page, MOVIMIENTO)
        await shoot(page, `${short}-2-mes-octubre-${size}`)
        await shootFull(page, `${short}-0-centro-octubre-${size}`)
        await expectNoVerticalScroll(page)
        await expectCarouselPage(page, 0)

        // Click en la banda «5–11» (Carga) → semana; días como último nivel.
        const week = await clickBand(page, '5–11')
        await week.click()
        await flujoReady(page, 'day')
        expect(await crumbText(page)).toMatch(/OCTUBRE\s*›\s*5–11 OCT/)
        expect(states.at(-1)).toMatchObject({ kind: 'week', from: '2026-10-05', calendarEnd: '2026-10-11' })
        await expect(page.locator('[data-testid^="director-flujo-drill-"]')).toHaveCount(0)
        expect(await axisLabels(page, MOVIMIENTO)).toEqual(await axisLabels(page, CARGA))
        await expectNoOrnamentOverChart(page)
        await shoot(page, `${short}-3-semana-dias-${size}`)

        // Ruta: volver al ciclo directamente.
        await tid(page, 'director-flujo-crumb-cycle').click()
        await flujoReady(page, 'month')
        expect(states.at(-1)).toMatchObject({ kind: 'cycle', from: '2026-07-01' })
      })
    }
  }
})
