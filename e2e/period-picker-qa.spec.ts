import { expect, test, type Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * QA visual del selector temporal de ESTADO (DIRECTOR).
 * Reloj fijo: martes 6 oct 2026, mediodía Bogotá → semana actual 5–11 oct.
 * Casos A–F en 1440×900 y 1920×1080 → e2e/artifacts/period-picker/.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'period-picker')
const CARD = '[data-testid="coordination-card"]'
const B2B = 'coord-b2b'
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

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function coordMeta(code: string) {
  const row = OVERVIEW.coordinations.find((c) => c.code === code)!
  return { id: row.id, code: row.code, name: row.name, shortName: row.shortName }
}

const METRIC_META = {
  generatedAt: '2026-10-06T17:00:00.000Z',
  universe: { type: 'active-catalog', coordinationCount: 15 },
  metricVersions: { integrity: 'integrity-mvp-v1', lifePoints: 'life-points-v1' },
}

async function installDirector(page: Page) {
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

  await page.clock.setFixedTime(NOW)
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
    if (pathName.includes('/operational-kpis/state')) {
      const kind = url.searchParams.get('kind') ?? 'week'
      const from = url.searchParams.get('from') ?? '2026-10-05'
      const to = url.searchParams.get('to') ?? '2026-10-06'
      const calendarEnd = url.searchParams.get('calendarEnd') ?? to
      const bucket = kind === 'week' ? 'day' : kind === 'month' ? 'week' : 'month'
      const series = [
        { start: from, end: from, label: 'Inicio', value: 4 },
        { start: to, end: to, label: 'Fin', value: 5 },
      ]
      await route.fulfill({
        json: {
          scope: {
            type: 'coordination',
            coordinationId: url.searchParams.get('coordinationId'),
          },
          timezone: 'America/Bogota',
          period: {
            kind,
            from,
            to,
            calendarEnd,
            label: `${from} – ${calendarEnd}`,
            isCurrent: to < calendarEnd,
            isPartial: to < calendarEnd,
            dataTo: to,
          },
          severity: { low: 1, medium: 3, high: 2, critical: 0 },
          attention: { open: 4, inProgress: 2 },
          relations: { dependencies: 1, commitments: 0 },
          registeredCount: 6,
          severitySemantics: 'current-severity-of-period-registrations',
          evolution: {
            bucket,
            backlog: series,
            created: series.map((p) => ({ ...p, value: 1 })),
            closed: series.map((p) => ({ ...p, value: 0 })),
          },
        },
      })
      return
    }
    if (pathName.includes('/operational-kpis')) {
      const coordinationId = url.searchParams.get('coordinationId')
      if (url.searchParams.get('scope') === 'coordination' && coordinationId) {
        await route.fulfill({
          json: {
            scope: { type: 'coordination', coordinationId },
            ...METRIC_META,
            coordination: {
              coordination: coordMeta(B2B),
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
          ...METRIC_META,
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
    if (pathName.includes('/situations')) {
      await route.fulfill({ json: { items: [], total: 0 } })
      return
    }
    await route.fulfill({ status: 200, json: {} })
  })
}

async function openDirectorEstado(page: Page) {
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(900)
  await page.locator(`${CARD}[data-code="${B2B}"]`).first().click()
  await expect(page.getByTestId('director-analysis-period')).toBeVisible({
    timeout: 30_000,
  })
  await page.waitForTimeout(900)
}

const picker = (page: Page) => page.getByTestId('director-analysis-period')
const tid = (page: Page, id: string) => page.getByTestId(id)

async function shoot(page: Page, name: string, size: string) {
  const panel = page.getByTestId('director-reading-panel')
  await panel.screenshot({ path: path.join(OUT, `${name}-${size}.png`) })
}

// Opcional: usar un navegador del sistema (p. ej. PLAYWRIGHT_CHANNEL=chrome)
// en equipos sin los binarios de Playwright descargados.
if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL })
}

// Desactivado: la UI ya no expone Ciclo → Mes → Semana en el picker (variante
// «cycle»); el drill-down lo hace el FLUJO DE PROBLEMAS (flujo-drilldown-qa).
// La implementación completa del picker se conserva y sigue cubierta por sus
// tests unitarios (DirectorAnalysisPeriodPicker.test.tsx).
test.describe.skip('QA selector temporal ESTADO', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [size, viewport] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    test(`casos A–F @ ${size}`, async ({ page }) => {
      test.slow()
      await page.setViewportSize(viewport)
      await installDirector(page)
      await openDirectorEstado(page)

      // A · default: semana actual, estado pasivo.
      await expect(tid(page, 'director-analysis-period-range')).toHaveText(
        '5 — 11 OCT 2026',
      )
      await expect(picker(page)).toContainText('Semana actual · En curso')
      await expect(tid(page, 'director-analysis-period-go-current')).toHaveCount(0)
      await expect(tid(page, 'director-analysis-period-next')).toBeDisabled()
      await shoot(page, 'A-default-semana-actual', size)

      // B · abierto en ciclos del año actual; H2 contiene la selección.
      await tid(page, 'director-analysis-period-trigger').click()
      await expect(tid(page, 'director-analysis-period-panel')).toHaveAttribute(
        'data-level',
        'cycle',
      )
      await expect(tid(page, 'director-analysis-period-cycle-H2')).toHaveAttribute(
        'data-selection',
        'contains',
      )
      await shoot(page, 'B-abierto-ciclos', size)

      // C · H2 → meses (cartelera).
      await tid(page, 'director-analysis-period-drill-cycle-H2').click()
      await expect(tid(page, 'director-analysis-period-panel')).toHaveAttribute(
        'data-level',
        'month',
      )
      await expect(
        tid(page, 'director-analysis-period-use-month-10'),
      ).toBeDisabled()
      await shoot(page, 'C-h2-meses', size)

      // D · H2 → octubre → semanas.
      await tid(page, 'director-analysis-period-drill-month-9').click()
      await expect(
        tid(page, 'director-analysis-period-week-2026-09-28'),
      ).toContainText('28 SEP — 4 OCT')
      await expect(
        tid(page, 'director-analysis-period-week-2026-10-26'),
      ).toContainText('26 OCT — 1 NOV')
      await shoot(page, 'D-h2-octubre-semanas', size)

      // E · H2 2025 seleccionado directamente.
      await tid(page, 'director-analysis-period-crumb-cycles').click()
      await tid(page, 'director-analysis-period-year-prev').click()
      await tid(page, 'director-analysis-period-use-cycle-H2').click()
      await expect(tid(page, 'director-analysis-period-panel')).toHaveCount(0)
      await expect(tid(page, 'director-analysis-period-range')).toHaveText(
        'JUL — DIC 2025',
      )
      await expect(tid(page, 'director-analysis-period-go-current')).toBeVisible()
      await page.waitForTimeout(500)
      await shoot(page, 'E-h2-2025-pasivo', size)
      await tid(page, 'director-analysis-period-trigger').click()
      await expect(tid(page, 'director-analysis-period-cycle-H2')).toHaveAttribute(
        'data-selection',
        'selected',
      )
      await shoot(page, 'E-h2-2025-reabierto', size)

      // F · Marzo 2025 seleccionado directamente.
      await tid(page, 'director-analysis-period-drill-cycle-H1').click()
      await tid(page, 'director-analysis-period-use-month-2').click()
      await expect(tid(page, 'director-analysis-period-range')).toHaveText(
        'MARZO 2025',
      )
      await page.waitForTimeout(500)
      await shoot(page, 'F-marzo-2025-pasivo', size)
      await tid(page, 'director-analysis-period-trigger').click()
      await tid(page, 'director-analysis-period-drill-cycle-H1').click()
      await expect(
        tid(page, 'director-analysis-period-month-2025-03-01'),
      ).toHaveAttribute('data-selection', 'selected')
      await shoot(page, 'F-marzo-2025-meses', size)

      // Volver a semana actual desde el histórico.
      await page.keyboard.press('Escape')
      await expect(tid(page, 'director-analysis-period-panel')).toHaveCount(0)
      await tid(page, 'director-analysis-period-go-current').click()
      await expect(tid(page, 'director-analysis-period-range')).toHaveText(
        '5 — 11 OCT 2026',
      )
    })
  }
})
