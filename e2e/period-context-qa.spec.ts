import { expect, test, type Page, type Route } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowStateResponse, type FlowQuery } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * QA: un AnalysisPeriod para toda la Lectura de coordinación.
 * B2B · SEPTIEMBRE 2026 → ESTADO / INTERNOS / DEPENDENCIAS, y luego la
 * semana 5–11 OCT 2026. Cada request se registra para comprobar que todos
 * los modos piden el mismo from/to. Reloj fijo: martes 6 oct 2026 (Bogotá).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'period-context')
const CARD = '[data-testid="coordination-card"]'
const SESSION_KEY = 'novex.auth.session.v1'
const TOKEN_KEY = 'novex.auth.accessToken.v1'
const NOW = new Date('2026-10-06T12:00:00-05:00')

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

function meta(code: string) {
  const row = OVERVIEW.coordinations.find((c) => c.code === code)!
  return { id: row.id, code: row.code, name: row.name, shortName: row.shortName }
}

const B2B = meta('coord-b2b')

function category(id: string, code: string, name: string) {
  return { id, code, name, selectable: true }
}

const CATEGORIES = {
  internet: category('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', 'internet', 'Internet'),
  aplicativos: category('e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2', 'aplicativos', 'Aplicativos'),
  acas: category('e3e3e3e3-e3e3-4e3e-8e3e-e3e3e3e3e3e3', 'acas', 'ACAS'),
  equipos: category('e4e4e4e4-e4e4-4e4e-8e4e-e4e4e4e4e4e4', 'equipos', 'Equipos'),
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** Buckets simples: días (≤7) o semanas/meses aproximados para el mock. */
function seriesFor(from: string, to: string, values: number[]) {
  const start = new Date(`${from}T12:00:00-05:00`).getTime()
  const end = new Date(`${to}T12:00:00-05:00`).getTime()
  const days = Math.round((end - start) / 86_400_000) + 1
  const step = days <= 7 ? 1 : 7
  const points = []
  for (let i = 0, offset = 0; offset < days; i += 1, offset += step) {
    const s = new Date(start + offset * 86_400_000).toISOString().slice(0, 10)
    const e = new Date(start + Math.min(offset + step - 1, days - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    points.push({ start: s, end: e, label: `${s}`, value: values[i % values.length] })
  }
  return points
}

type Logged = { path: string; params: Record<string, string> }

async function installDirector(page: Page, log: Logged[]) {
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
    const kpiPath = p.slice(p.indexOf('/operational-kpis'))
    if (p.includes('/operational-kpis')) log.push({ path: kpiPath, params: q })
    const isWeek = q.kind === 'week' || (q.from && q.from >= '2026-10-01')

    if (p.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name, status: 'ACTIVE' } } })
      return
    }
    if (p.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (p.includes('/operational-kpis/state')) {
      await route.fulfill({
        json: flowStateResponse(
          {
            coordinationId: q.coordinationId,
            kind: q.kind as 'week' | 'month' | 'cycle',
            from: q.from,
            to: q.to,
            calendarEnd: q.calendarEnd ?? q.to,
          },
          '2026-10-06',
        ),
      })
      return
    }
    if (p.includes('/operational-kpis/internal-recurrence')) {
      // INTERNOS · recurrencia: este QA solo verifica el periodo que se pide.
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: q.coordinationId },
          timezone: 'America/Bogota',
          period: {
            kind: q.kind,
            from: q.from,
            to: q.to,
            calendarEnd: q.calendarEnd ?? q.to,
            dataTo: q.to,
            isCurrent: false,
            isPartial: false,
            cutAt: `${q.to}T05:00:00.000Z`,
          },
          bucket: q.kind === 'cycle' ? 'month' : q.kind === 'month' ? 'week' : 'day',
          buckets: [],
          eligibleBuckets: 0,
          total: 0,
          categories: [],
        },
      })
      return
    }
    if (p.includes('/operational-kpis/internal-problems')) {
      // INTERNOS · afectaciones activas: este QA solo verifica el periodo.
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: q.coordinationId },
          timezone: 'America/Bogota',
          period: {
            kind: q.kind,
            from: q.from,
            to: q.to,
            calendarEnd: q.calendarEnd ?? q.to,
            dataTo: q.to,
            isCurrent: false,
            isPartial: false,
            cutAt: `${q.to}T05:00:00.000Z`,
          },
          total: 0,
          truncated: false,
          items: [],
        },
      })
      return
    }
    if (p.includes('/operational-kpis/breakdown')) {
      const items = isWeek
        ? [
            { category: CATEGORIES.internet, value: 2 },
            { category: CATEGORIES.equipos, value: 1 },
          ]
        : [
            { category: CATEGORIES.internet, value: 8 },
            { category: CATEGORIES.aplicativos, value: 5 },
            { category: CATEGORIES.acas, value: 2 },
            { category: CATEGORIES.equipos, value: 1 },
          ]
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: q.coordinationId },
          dimension: 'category',
          metric: q.metric,
          range: { from: q.from, to: q.to },
          timezone: 'America/Bogota',
          items,
        },
      })
      return
    }
    if (p.includes('/operational-kpis/relations')) {
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: q.coordinationId },
          metric: q.metric,
          range: { from: q.from, to: q.to },
          timezone: 'America/Bogota',
          commitments: isWeek
            ? [{ coordination: meta('coord-saber-pro'), value: 1 }]
            : [
                { coordination: meta('coord-saber-pro'), value: 4 },
                { coordination: meta('coord-servicios'), value: 2 },
              ],
          dependencies: isWeek
            ? [{ coordination: meta('coord-ingenierias'), value: 1 }]
            : [
                { coordination: meta('coord-ingenierias'), value: 3 },
                { coordination: meta('coord-servicios'), value: 1 },
              ],
        },
      })
      return
    }
    if (p.includes('/operational-kpis/history')) {
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: q.coordinationId },
          metric: q.metric,
          period: {
            kind: q.kind,
            from: q.from,
            dataTo: q.to,
            calendarEnd: q.calendarEnd,
            bucket: q.kind === 'week' ? 'day' : q.kind === 'month' ? 'week' : 'month',
          },
          range: { from: q.from, to: q.to },
          timezone: 'America/Bogota',
          series: seriesFor(q.from, q.to, [1, 3, 2, 4, 2]),
        },
      })
      return
    }
    if (p.includes('/operational-kpis')) {
      if (q.scope === 'coordination') {
        await route.fulfill({
          json: {
            scope: { type: 'coordination', coordinationId: q.coordinationId },
            generatedAt: '2026-10-06T17:00:00.000Z',
            universe: { type: 'active-catalog', coordinationCount: 15 },
            metricVersions: { integrity: 'integrity-mvp-v1', lifePoints: 'life-points-v1' },
            coordination: {
              coordination: B2B,
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
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }
    await route.fulfill({ status: 200, json: {} })
  })
}

if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL })
}

const tid = (page: Page, id: string) => page.getByTestId(id)

async function shoot(page: Page, name: string, size: string) {
  await page.waitForTimeout(450)
  await tid(page, 'director-reading-panel').screenshot({
    path: path.join(OUT, `${name}-${size}.png`),
  })
}

function lastFor(log: Logged[], fragment: string) {
  return [...log].reverse().find((entry) => entry.path.startsWith(fragment))
}

test.describe('QA periodo común de la lectura de coordinación', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [size, viewport] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    test(`B2B · Septiembre 2026 y semana 5–11 oct @ ${size}`, async ({ page }) => {
      test.slow()
      const log: Logged[] = []
      await page.setViewportSize(viewport)
      await installDirector(page, log)
      await page.goto('/centro-operacional')
      await expect(tid(page, 'operational-shell')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(900)

      // Lectura de Dirección: sin coordinación no hay picker.
      await expect(tid(page, 'director-estado-operativo-direction')).toBeVisible({
        timeout: 30_000,
      })
      await page.waitForTimeout(1500)
      await expect(tid(page, 'director-analysis-period')).toHaveCount(0)
      await shoot(page, '0-direccion-sin-picker', size)

      await page.locator(`${CARD}[data-code="coord-b2b"]`).first().click()
      await expect(tid(page, 'director-analysis-period')).toBeVisible({ timeout: 30_000 })

      // Default: ciclo actual. Septiembre se elige EN LA GRÁFICA (flujo).
      await expect(tid(page, 'director-flujo')).toHaveAttribute('data-level', 'month')
      await expect(tid(page, 'director-analysis-period-range')).toHaveText('H2 2026')
      await tid(page, 'director-flujo-drill-2026-09-01').focus()
      await page.keyboard.press('Enter')
      await expect(tid(page, 'director-flujo')).toHaveAttribute('data-level', 'week')
      await expect(tid(page, 'director-flujo-crumb')).toContainText('SEPTIEMBRE')
      await expect.poll(() => lastFor(log, '/operational-kpis/state')?.params.from).toBe('2026-09-01')
      await shoot(page, '1-sep-estado', size)

      await tid(page, 'director-reading-mode-internos').click()
      await expect(tid(page, 'director-analysis-period')).toHaveCount(1)
      await expect(tid(page, 'director-internos-recurrence')).toHaveAttribute('data-period-from', '2026-09-01')
      await shoot(page, '2-sep-internos', size)

      await tid(page, 'director-reading-mode-dependencias').click()
      await tid(page, 'director-relations-dependency-coord-ingenierias').click()
      await expect(tid(page, 'director-relations-evolution-chart')).toBeVisible()
      await shoot(page, '3-sep-dependencias', size)

      // Todos los modos pidieron exactamente septiembre.
      for (const path of ['/operational-kpis/internal-recurrence', '/operational-kpis/internal-problems']) {
        const internos = log.find((e) => e.path.startsWith(path) && e.params.from === '2026-09-01')
        expect(internos?.params).toMatchObject({ to: '2026-09-30', kind: 'month' })
      }
      expect(lastFor(log, '/operational-kpis/relations')?.params).toMatchObject({
        from: '2026-09-01',
        to: '2026-09-30',
      })
      expect(lastFor(log, '/operational-kpis/history')?.params).toMatchObject({
        kind: 'month',
        from: '2026-09-01',
        to: '2026-09-30',
        calendarEnd: '2026-09-30',
        dependencySide: 'dependency',
      })
      expect(log.some((e) => e.params.granularity)).toBe(false)

      // Semana 5–11 OCT 2026 elegida en el flujo (ciclo → octubre → semana).
      await tid(page, 'director-reading-mode-state').click()
      await tid(page, 'director-flujo-crumb-cycle').click()
      await tid(page, 'director-flujo-drill-2026-10-01').focus()
      await page.keyboard.press('Enter')
      await tid(page, 'director-flujo-drill-2026-10-05').focus()
      await page.keyboard.press('Enter')
      await expect(tid(page, 'director-flujo')).toHaveAttribute('data-level', 'day')
      await expect.poll(() => lastFor(log, '/operational-kpis/state')?.params).toMatchObject({
        kind: 'week',
        from: '2026-10-05',
        to: '2026-10-06',
        calendarEnd: '2026-10-11',
      })
      await shoot(page, '6-semana-estado', size)

      await tid(page, 'director-reading-mode-dependencias').click()
      await shoot(page, '4-semana-dependencias', size)
      await tid(page, 'director-reading-mode-internos').click()
      await shoot(page, '5-semana-internos', size)
      expect(lastFor(log, '/operational-kpis/internal-recurrence')?.params).toMatchObject({
        kind: 'week',
        from: '2026-10-05',
      })
    })
  }
})
