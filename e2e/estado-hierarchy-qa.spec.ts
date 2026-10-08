import { expect, test, type Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowStateResponse } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'estado-hierarchy')
const CARD = '[data-testid="coordination-card"]'
const ESPE = 'coord-especializaciones'
const B2B = 'coord-b2b'
const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'

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

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function uuidOf(code: string): string {
  return OVERVIEW.coordinations.find((c) => c.code === code)!.id
}

function coordMeta(code: string) {
  const row = OVERVIEW.coordinations.find((c) => c.code === code)!
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.shortName,
  }
}

function historySeries(metric: 'backlog' | 'created' | 'closed') {
  if (metric === 'backlog') {
    return [
      { start: '2026-09-07', end: '2026-09-13', label: '7–13 septiembre', value: 0 },
      { start: '2026-09-14', end: '2026-09-20', label: '14–20 septiembre', value: 5 },
      { start: '2026-09-21', end: '2026-09-27', label: '21–27 septiembre', value: 5 },
      { start: '2026-09-28', end: '2026-10-04', label: '28 sep–4 oct', value: 5 },
      { start: '2026-10-05', end: '2026-10-11', label: '5–11 octubre', value: 6 },
    ]
  }
  if (metric === 'created') {
    return [
      { start: '2026-09-07', end: '2026-09-13', label: '7–13 septiembre', value: 0 },
      { start: '2026-09-14', end: '2026-09-20', label: '14–20 septiembre', value: 5 },
      { start: '2026-09-21', end: '2026-09-27', label: '21–27 septiembre', value: 1 },
      { start: '2026-09-28', end: '2026-10-04', label: '28 sep–4 oct', value: 0 },
      { start: '2026-10-05', end: '2026-10-11', label: '5–11 octubre', value: 1 },
    ]
  }
  return [
    { start: '2026-09-07', end: '2026-09-13', label: '7–13 septiembre', value: 0 },
    { start: '2026-09-14', end: '2026-09-20', label: '14–20 septiembre', value: 0 },
    { start: '2026-09-21', end: '2026-09-27', label: '21–27 septiembre', value: 1 },
    { start: '2026-09-28', end: '2026-10-04', label: '28 sep–4 oct', value: 0 },
    { start: '2026-10-05', end: '2026-10-11', label: '5–11 octubre', value: 0 },
  ]
}

const METRIC_META = {
  generatedAt: '2026-10-05T16:00:00.000Z',
  universe: { type: 'active-catalog', coordinationCount: 15 },
  metricVersions: {
    integrity: 'integrity-mvp-v1',
    lifePoints: 'life-points-v1',
  },
}

async function installDirectorEstado(page: Page, code: string) {
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
  const accessToken = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
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
      tokenValue: accessToken,
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const pathName = url.pathname

    if (pathName.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name, status: 'ACTIVE' } },
      })
      return
    }

    if (pathName.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }

    if (pathName.includes('/operational-kpis/history')) {
      const metric = (url.searchParams.get('metric') ?? 'backlog') as
        | 'backlog'
        | 'created'
        | 'closed'
      const granularity = url.searchParams.get('granularity') ?? 'week'
      const coordinationId =
        url.searchParams.get('coordinationId') ?? uuidOf(ESPE)
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId },
          metric,
          granularity,
          range: {
            from: url.searchParams.get('from') ?? '2026-09-07',
            to: url.searchParams.get('to') ?? '2026-10-11',
          },
          timezone: 'America/Bogota',
          series: historySeries(metric),
        },
      })
      return
    }

    if (pathName.includes('/operational-kpis/state')) {
      const kind = url.searchParams.get('kind') ?? 'week'
      const from = url.searchParams.get('from') ?? '2026-09-29'
      const to = url.searchParams.get('to') ?? '2026-10-05'
      const calendarEnd =
        url.searchParams.get('calendarEnd') ?? to
      const coordinationId =
        url.searchParams.get('coordinationId') ?? uuidOf(ESPE)
      const isEspe = coordinationId === uuidOf(ESPE)
      const byKind = {
        week: {
          severity: isEspe
            ? { low: 1, medium: 0, high: 2, critical: 0 }
            : { low: 1, medium: 3, high: 2, critical: 0 },
          attention: isEspe
            ? { open: 2, inProgress: 1 }
            : { open: 4, inProgress: 2 },
          relations: { dependencies: 1, commitments: 0 },
          bucket: 'day' as const,
        },
        month: {
          severity: isEspe
            ? { low: 2, medium: 1, high: 4, critical: 0 }
            : { low: 4, medium: 12, high: 7, critical: 2 },
          attention: isEspe
            ? { open: 4, inProgress: 3 }
            : { open: 14, inProgress: 11 },
          relations: { dependencies: 3, commitments: 2 },
          bucket: 'week' as const,
        },
        cycle: {
          severity: isEspe
            ? { low: 3, medium: 2, high: 6, critical: 1 }
            : { low: 8, medium: 20, high: 11, critical: 3 },
          attention: isEspe
            ? { open: 7, inProgress: 5 }
            : { open: 22, inProgress: 20 },
          relations: { dependencies: 5, commitments: 4 },
          bucket: 'month' as const,
        },
      } as const
      // Las aserciones de composición de este QA usan los valores «week»;
      // el default ahora es el ciclo, así que se sirven para cualquier kind.
      const pack = byKind.week
      const registered =
        pack.severity.low +
        pack.severity.medium +
        pack.severity.high +
        pack.severity.critical
      const point = (
        start: string,
        end: string,
        label: string,
        value: number,
      ) => ({ start, end, label, value })
      const base = isEspe ? 2 : 4
      const flow = flowStateResponse(
        {
          coordinationId,
          kind: kind as 'week' | 'month' | 'cycle',
          from,
          to,
          calendarEnd,
        },
        to,
      )
      const evolutionSeries = [
        point(from, from, 'Inicio', base),
        point(to, to, 'Fin', base + 1),
      ]
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId },
          timezone: 'America/Bogota',
          period: {
            kind,
            from,
            to,
            calendarEnd,
            label: `${from} – ${calendarEnd}`,
            isCurrent: true,
            isPartial: true,
            dataTo: to,
          },
          severity: pack.severity,
          attention: pack.attention,
          relations: pack.relations,
          registeredCount: registered,
          severitySemantics: 'current-severity-of-period-registrations',
          activeAtPeriodEnd: { count: base + 1, at: to, isNow: true },
          // Mismo fixture para buckets y aging: cuadran por construcción.
          aging: flow.aging,
          resolution: flow.resolution,
          snapshot: flow.snapshot,
          evolution: {
            buckets: flow.evolution.buckets,
            bucket: pack.bucket,
            backlog: evolutionSeries,
            created: evolutionSeries.map((p) => ({ ...p, value: 1 })),
            closed: evolutionSeries.map((p) => ({ ...p, value: 0 })),
          },
        },
      })
      return
    }

    if (pathName.includes('/operational-kpis')) {
      const scope = url.searchParams.get('scope')
      const coordinationId = url.searchParams.get('coordinationId')

      if (scope === 'coordination' && coordinationId) {
        const isEspe = coordinationId === uuidOf(ESPE)
        const selectedCode = isEspe ? ESPE : B2B
        await route.fulfill({
          json: {
            scope: { type: 'coordination', coordinationId },
            ...METRIC_META,
            coordination: {
              coordination: coordMeta(selectedCode),
              integrityStatus: 'CRITICO',
              lifePoints: isEspe ? 0 : 3,
              problems: {
                activeCount: isEspe ? 6 : 10,
                status: { open: isEspe ? 3 : 6, inProgress: isEspe ? 3 : 4 },
                severity: isEspe
                  ? { critical: 0, high: 5, medium: 0, low: 1 }
                  : { critical: 0, high: 1, medium: 8, low: 1 },
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
          ...METRIC_META,
          direction: {
            directionStatus: 'ALERTA',
            problems: {
              activeCount: 37,
              status: { open: 20, inProgress: 17 },
              severity: { critical: 1, high: 12, medium: 10, low: 14 },
            },
            coordinationStatusTotals: {
              critical: 1,
              alert: 2,
              stable: 11,
              unknown: 1,
            },
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

    if (pathName.includes('/situations')) {
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }

    await route.fulfill({ status: 200, json: {} })
  })

  void code
}

async function settle(page: Page) {
  await page.waitForTimeout(1100)
}

async function openAndSelect(page: Page, code: string) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({
    timeout: 60_000,
  })
  await settle(page)
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  await expect(page.getByTestId('director-reading-panel')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByTestId('director-flujo-chart')).toBeVisible({
    timeout: 20_000,
  })
  await settle(page)
}

if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL })
}

test.describe('QA ESTADO visualización-first v3', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [label, size] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    for (const code of [ESPE, B2B] as const) {
      test(`${code} @ ${label}`, async ({ page }) => {
        test.slow()
        await page.setViewportSize(size)
        await installDirectorEstado(page, code)
        await openAndSelect(page, code)

        const panel = page.getByTestId('director-reading-panel')
        // La integridad vive en el personaje: la lectura no repite «Estado actual».
        await expect(panel.getByTestId('director-estado-operativo')).toHaveCount(0)
        await expect(panel.getByText('Estado actual', { exact: true })).toHaveCount(0)
        await expect(
          panel.getByTestId('director-analysis-period'),
        ).toBeVisible()
        await expect(
          panel.getByTestId('director-analysis-period-range'),
        ).toBeVisible()
        await expect(panel.getByText('Carga de problemas', { exact: true })).toBeVisible()
        await expect(panel.getByTestId('director-kpi-severity')).toContainText(
          'Severidad',
        )
        await expect(panel.getByTestId('director-kpi-status-split')).toContainText(
          'Estado de atención',
        )
        await expect(
          panel.getByTestId('director-estado-relations-line'),
        ).toContainText('Relaciones')
        await expect(panel.getByText('¿Por qué?')).toHaveCount(0)
        await expect(panel.getByText('de severidad crítica')).toHaveCount(0)
        await expect(panel.getByText('Composición actual')).toHaveCount(0)

        // Severidad | Atención viven en la lámina 2 del carrusel de ESTADO.
        await panel.getByTestId('director-estado-carousel-next').click()
        await expect(panel.getByTestId('director-estado-carousel')).toHaveAttribute('data-page', '1')
        await settle(page)

        const severityChart = panel.getByTestId('director-estado-severity-chart')
        const attentionChart = panel.getByTestId('director-estado-attention-chart')
        await expect(severityChart).toBeVisible()
        await expect(attentionChart).toBeVisible()

        const sevMetrics = await severityChart.evaluate((node) => {
          const svg = node.querySelector('svg')
          const box = node.getBoundingClientRect()
          return {
            hasSvg: Boolean(svg),
            svgChildren: svg?.childElementCount ?? 0,
            width: box.width,
            height: box.height,
          }
        })
        expect(sevMetrics.hasSvg).toBe(true)
        expect(sevMetrics.svgChildren).toBeGreaterThan(0)
        expect(sevMetrics.width).toBeGreaterThan(100)
        expect(sevMetrics.height).toBeGreaterThan(80)

        const attMetrics = await attentionChart.evaluate((node) => {
          const svg = node.querySelector('svg')
          const box = node.getBoundingClientRect()
          return {
            hasSvg: Boolean(svg),
            svgChildren: svg?.childElementCount ?? 0,
            width: box.width,
            height: box.height,
          }
        })
        expect(attMetrics.hasSvg).toBe(true)
        expect(attMetrics.svgChildren).toBeGreaterThan(0)

        // SNAPSHOT AT CUT: Severidad y Atención describen la MISMA población
        // (activos al corte): Σ severidad = total del donut.
        const sevAria = (await severityChart.getAttribute('aria-label')) ?? ''
        const sevTotal = [...sevAria.matchAll(/(\d+)/g)].reduce((a, m) => a + Number(m[1]), 0)
        const attAria = (await attentionChart.getAttribute('aria-label')) ?? ''
        const attTotal = Number(/(\d+) activos/.exec(attAria)?.[1] ?? -1)
        expect(sevTotal).toBe(attTotal)
        await expect(panel.getByTestId('director-estado-comp-cut')).toBeVisible()

        // Vuelta a la lámina 1 (Carga | Movimiento).
        await panel.getByTestId('director-estado-carousel-prev').click()
        await expect(panel.getByTestId('director-estado-carousel')).toHaveAttribute('data-page', '0')
        await settle(page)

        const chart = panel.getByTestId('director-flujo-chart')
        await expect(chart).toBeVisible()

        const body = panel.getByTestId('director-reading-body')
        await expect(body).toBeVisible()
        // ESTADO cabe entero (carrusel de láminas): sin scroll vertical real.
        const scrollProbe = await body.evaluate((node) => ({
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
          scrollTop: node.scrollTop,
        }))
        expect(scrollProbe.scrollHeight).toBeLessThanOrEqual(scrollProbe.clientHeight + 2)
        expect(scrollProbe.scrollTop).toBe(0)
        await expect(panel).toHaveAttribute('data-scroll-more', 'false')

        // Cabecera/tabs fijos.
        await expect(panel.getByText(/Lectura de coordinación/i)).toBeVisible()
        await expect(panel.getByTestId('director-reading-mode-state')).toBeVisible()
        await expect(chart).toBeVisible()

        const chartMetrics = await chart.evaluate((node) => {
          const svg = node.querySelector('svg')
          const box = node.getBoundingClientRect()
          const frame = node.closest('.director-flujo__frame')
          const frameBox = frame?.getBoundingClientRect()
          return {
            hasSvg: Boolean(svg),
            svgChildren: svg?.childElementCount ?? 0,
            width: box.width,
            height: box.height,
            frameHeight: frameBox?.height ?? 0,
            clippedBottom:
              frameBox != null ? box.bottom > frameBox.bottom + 1 : false,
          }
        })
        expect(chartMetrics.hasSvg).toBe(true)
        expect(chartMetrics.svgChildren).toBeGreaterThan(0)
        expect(chartMetrics.width).toBeGreaterThan(120)
        expect(chartMetrics.height).toBeGreaterThan(160)
        expect(chartMetrics.frameHeight).toBeGreaterThanOrEqual(200)
        expect(chartMetrics.clippedBottom).toBe(false)

        // Reset al cambiar de tab.
        await panel.getByTestId('director-reading-mode-internos').click()
        await expect(body).toHaveAttribute('data-mode', 'internos')
        await expect
          .poll(async () => body.evaluate((node) => node.scrollTop))
          .toBe(0)
        await panel.getByTestId('director-reading-mode-state').click()
        await expect(body).toHaveAttribute('data-mode', 'state')
        await expect
          .poll(async () => body.evaluate((node) => node.scrollTop))
          .toBe(0)

        // Navegación temporal: el FLUJO DE PROBLEMAS hace el drill-down.
        const estado = panel.getByTestId('director-estado-panel')
        const flujo = panel.getByTestId('director-flujo')
        await expect(estado).toHaveAttribute('data-period-kind', 'cycle')
        await expect(flujo).toHaveAttribute('data-level', 'month')
        // Snapshot al corte (carta): el donut declara sus abiertos; Σ = activos del corte.
        await expect(panel.getByTestId('director-kpi-status-split')).toContainText(/Abiertos \d+/)

        // Ciclo → octubre (teclado: botón real del bucket).
        await panel.getByTestId('director-flujo-drill-2026-10-01').focus()
        await page.keyboard.press('Enter')
        await expect(estado).toHaveAttribute('data-period-kind', 'month')
        await expect(flujo).toHaveAttribute('data-level', 'week')

        // Octubre → semana 5–11 oct → días.
        await panel.getByTestId('director-flujo-drill-2026-10-05').focus()
        await page.keyboard.press('Enter')
        await expect(estado).toHaveAttribute('data-period-kind', 'week')
        await expect(flujo).toHaveAttribute('data-level', 'day')

        // Ruta: volver directamente al ciclo.
        await panel.getByTestId('director-flujo-crumb-cycle').click()
        await expect(estado).toHaveAttribute('data-period-kind', 'cycle')

        // Ciclo histórico → «↺ Ciclo actual».
        await panel.getByTestId('director-analysis-period-prev').click()
        await expect(
          panel.getByTestId('director-analysis-period-go-current'),
        ).toHaveText(/Ciclo actual/i)
        await panel.getByTestId('director-analysis-period-go-current').click()
        await expect(estado).toHaveAttribute('data-period-kind', 'cycle')
        await expect(
          panel.getByTestId('director-analysis-period-go-current'),
        ).toHaveCount(0)
        await expect(chart).toBeVisible({ timeout: 15_000 })

        const name = code === ESPE ? 'especializaciones' : 'b2b'
        await page.screenshot({
          path: path.join(OUT, `estado-${name}-${label}.png`),
          fullPage: false,
        })
        await panel.screenshot({
          path: path.join(OUT, `estado-${name}-panel-${label}.png`),
        })
      })
    }
  }
})
