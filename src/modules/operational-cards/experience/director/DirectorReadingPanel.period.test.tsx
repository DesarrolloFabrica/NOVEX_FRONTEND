import { resolutionFixture } from '@/modules/operational-cards/charts/resolucion.fixture'
import { agingFixture, snapshotFixture } from '@/modules/operational-cards/charts/antiguedad.fixture'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  kpiCoordinationFixture,
  kpiDirectionSnapshotFixture,
} from '@/modules/operational-cards/experience/director/director-kpi.fixture'
import { DirectorReadingPanel } from '@/modules/operational-cards/experience/director/DirectorReadingPanel'
import {
  fetchOperationalKpiBreakdown,
  fetchOperationalKpiPeriodHistory,
  fetchOperationalKpiRelations,
  fetchOperationalKpiState,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiBreakdownQuery,
  OperationalKpiFlowBucket,
  OperationalKpiStateQuery,
  OperationalKpiStateResponse,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import {
  fetchInternalProblems,
  fetchInternalRecurrence,
} from '@/modules/operational-cards/services/internal-problems.service'
import type { InternalRecurrenceBucket } from '@/modules/operational-cards/types/internal-problems.types'

vi.mock(
  '@/modules/operational-cards/services/operational-kpi.service',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/modules/operational-cards/services/operational-kpi.service')
    >()),
    fetchOperationalKpiState: vi.fn(),
    fetchOperationalKpiBreakdown: vi.fn(),
    fetchOperationalKpiRelations: vi.fn(),
    fetchOperationalKpiPeriodHistory: vi.fn(),
  }),
)

vi.mock('@/modules/operational-cards/services/internal-problems.service', () => ({
  fetchInternalProblems: vi.fn(),
  fetchInternalRecurrence: vi.fn(),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

/** Martes 6 oct 2026, mediodía Bogotá. */
const NOW = new Date('2026-10-06T12:00:00-05:00')
const TODAY = '2026-10-06'

const B2B_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ESPE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const INTERNET = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  code: 'internet',
  name: 'Internet',
  selectable: true,
}
const EQUIPOS = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  code: 'equipos',
  name: 'Equipos',
  selectable: true,
}

function coordinationOf(id: string, code: string, name: string): CoordinationOverview {
  return {
    id,
    code,
    name,
    shortName: name,
    color: '#FF5F66',
    displayOrder: 2,
    status: 'CRITICO',
    activeProblemsCount: 10,
    criticalCount: 0,
    affectedCoordinationCount: 0,
    lifePoints: 3,
  }
}

const B2B = coordinationOf(B2B_ID, 'coord-b2b', 'B2B')
const ESPE = coordinationOf(ESPE_ID, 'coord-especializaciones', 'Especializaciones')

/* ── Mock de /state con la misma geometría de buckets que el backend ── */

const DAY = 86_400_000
const ymdToMs = (ymd: string) => Date.parse(`${ymd}T12:00:00Z`)
const msToYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const addDays = (ymd: string, n: number) => msToYmd(ymdToMs(ymd) + n * DAY)
const minYmd = (a: string, b: string) => (a < b ? a : b)
const maxYmd = (a: string, b: string) => (a > b ? a : b)
const mondayOf = (ymd: string) => {
  const weekday = new Date(ymdToMs(ymd)).getUTCDay()
  return addDays(ymd, weekday === 0 ? -6 : 1 - weekday)
}
const lastOfMonth = (ymd: string) => {
  const [y, m] = ymd.split('-').map(Number)
  return msToYmd(Date.UTC(y, m, 0, 12))
}

function slot(
  start: string,
  end: string,
  calendarStart: string,
  calendarEnd: string,
  dataTo: string,
): OperationalKpiFlowBucket {
  const future = start > dataTo
  return {
    start,
    end,
    dataEnd: future ? null : minYmd(end, dataTo),
    calendarStart,
    calendarEnd,
    label: start,
    current: start <= TODAY && TODAY <= end,
    future,
    created: future ? null : 2,
    closed: future ? null : 1,
    backlog: future ? null : 5,
    active: future
      ? null
      : {
          total: 5,
          internal: 3,
          external: 2,
          internalBreakdown: [],
          externalBreakdown: [],
        },
    solved: future ? null : { total: 1 },
  }
}

function flowBuckets(query: OperationalKpiStateQuery): OperationalKpiFlowBucket[] {
  const end = query.calendarEnd ?? query.to
  const out: OperationalKpiFlowBucket[] = []
  if (query.kind === 'week') {
    for (let d = query.from; d <= end; d = addDays(d, 1)) {
      out.push(slot(d, d, d, d, query.to))
    }
  } else if (query.kind === 'month') {
    for (let monday = mondayOf(query.from); monday <= end; monday = addDays(monday, 7)) {
      const sunday = addDays(monday, 6)
      out.push(slot(maxYmd(monday, query.from), minYmd(sunday, end), monday, sunday, query.to))
    }
  } else {
    for (let first = query.from; first <= end; first = addDays(lastOfMonth(first), 1)) {
      out.push(slot(first, lastOfMonth(first), first, lastOfMonth(first), query.to))
    }
  }
  return out
}

/** Activos al corte por fecha (determinista): H2/hoy 7, SEP 6, semanas 4–5. */
const ACTIVE_BY_CUT: Record<string, number> = {
  '2026-10-06': 7,
  '2026-09-30': 6,
  '2026-09-13': 4,
}

function stateResponse(query: OperationalKpiStateQuery): OperationalKpiStateResponse {
  const calendarEnd = query.calendarEnd ?? query.to
  // Población distinta por corte: cada periodo tiene su propia fotografía.
  const aging = agingFixture({
    at: query.to,
    isNow: query.to === TODAY,
    // Especializaciones tiene otra población (2 menos) en cada corte.
    activeCount: (ACTIVE_BY_CUT[query.to] ?? 5) - (query.coordinationId === ESPE_ID ? 2 : 0),
  })
  const buckets = flowBuckets(query)
  return {
    scope: { type: 'coordination', coordinationId: query.coordinationId },
    timezone: 'America/Bogota',
    period: {
      kind: query.kind,
      from: query.from,
      to: query.to,
      calendarEnd,
      label: `${query.from} – ${calendarEnd}`,
      isCurrent: query.from <= TODAY && TODAY <= calendarEnd,
      isPartial: query.to < calendarEnd,
      dataTo: query.to,
    },
    relations: { dependencies: 1, commitments: 0 },
    evolution: {
      bucket: query.kind === 'week' ? 'day' : query.kind === 'month' ? 'week' : 'month',
      backlog: [],
      created: [],
      closed: [],
      buckets,
    },
    activeAtPeriodEnd: { count: 5, at: query.to, isNow: query.to === TODAY },
    // Antigüedad, Severidad y Atención: misma población de la carta, misma respuesta.
    aging,
    snapshot: snapshotFixture(aging),
    // Resolución: los mismos cierres que «Solucionados»; otra carta, otras duraciones.
    resolution: resolutionFixture(buckets, query.coordinationId === ESPE_ID ? 3 : 0),
  }
}

/** Septiembre: Internet + Equipos. Semana 28 sep: solo Equipos. */
function breakdownFor(query: OperationalKpiBreakdownQuery) {
  const items =
    query.from === '2026-09-28'
      ? [{ category: EQUIPOS, value: 1 }]
      : [
          { category: INTERNET, value: 8 },
          { category: EQUIPOS, value: 1 },
        ]
  return Promise.resolve({
    scope: { type: 'coordination' as const, coordinationId: query.coordinationId },
    dimension: 'category' as const,
    metric: query.metric,
    range: { from: query.from, to: query.to },
    timezone: 'America/Bogota' as const,
    items,
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.mocked(fetchOperationalKpiState).mockReset()
  vi.mocked(fetchOperationalKpiState).mockImplementation((query) =>
    Promise.resolve(stateResponse(query)),
  )
  vi.mocked(fetchOperationalKpiBreakdown).mockReset()
  vi.mocked(fetchOperationalKpiBreakdown).mockImplementation(breakdownFor)
  vi.mocked(fetchOperationalKpiRelations).mockReset()
  vi.mocked(fetchOperationalKpiRelations).mockImplementation((query) =>
    Promise.resolve({
      scope: { type: 'coordination', coordinationId: query.coordinationId },
      metric: query.metric,
      range: { from: query.from, to: query.to },
      timezone: 'America/Bogota',
      commitments: [],
      dependencies: [],
    }),
  )
  vi.mocked(fetchInternalProblems).mockReset()
  vi.mocked(fetchInternalProblems).mockImplementation((query) =>
    Promise.resolve({
      coordinationId: query.coordinationId,
      period: {
        kind: query.period.kind,
        from: query.period.from,
        to: query.period.to,
        calendarEnd: query.period.calendarEnd,
        dataTo: query.period.to,
        isCurrent: query.period.to === TODAY,
        isPartial: false,
        cutAt: `${query.period.to}T05:00:00.000Z`,
      },
      total: 0,
      truncated: false,
      items: [],
    }),
  )
  vi.mocked(fetchInternalRecurrence).mockReset()
  vi.mocked(fetchInternalRecurrence).mockImplementation((query) => {
    const flow = flowBuckets({
      coordinationId: query.coordinationId,
      kind: query.period.kind,
      from: query.period.from,
      to: minYmd(query.period.to, TODAY),
      calendarEnd: query.period.calendarEnd,
    })
    const buckets: InternalRecurrenceBucket[] = flow.map((b) => ({
      start: b.start,
      end: b.end,
      calendarStart: b.calendarStart,
      calendarEnd: b.calendarEnd,
      dataEnd: b.dataEnd,
      label: b.label,
      current: b.current,
      future: b.future,
      total: b.future ? null : 1,
    }))
    const observed = buckets.filter((b) => !b.future).length
    return Promise.resolve({
      coordinationId: query.coordinationId,
      period: {
        kind: query.period.kind,
        from: query.period.from,
        to: query.period.to,
        calendarEnd: query.period.calendarEnd,
        dataTo: minYmd(query.period.to, TODAY),
        isCurrent: false,
        isPartial: false,
        cutAt: query.period.to + 'T05:00:00.000Z',
      },
      bucket: query.period.kind === 'cycle' ? 'month' : query.period.kind === 'month' ? 'week' : 'day',
      buckets,
      eligibleBuckets: observed,
      total: observed,
      categories: [
        {
          id: INTERNET.id,
          code: INTERNET.code,
          name: INTERNET.name,
          selectable: true,
          totalCreated: observed,
          bucketsWithOccurrences: observed,
          values: buckets.map((b) => (b.future ? null : 1)),
        },
      ],
    })
  })
  vi.mocked(fetchOperationalKpiPeriodHistory).mockReset()
  vi.mocked(fetchOperationalKpiPeriodHistory).mockImplementation((query) =>
    Promise.resolve({
      scope: { type: 'coordination', coordinationId: query.coordinationId },
      metric: query.metric,
      period: {
        kind: query.kind,
        from: query.from,
        dataTo: query.to,
        calendarEnd: query.calendarEnd,
        bucket: 'week',
      },
      timezone: 'America/Bogota',
      series: [],
    }),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function render(selected: CoordinationOverview | null) {
  await act(async () => {
    root.render(
      <DirectorReadingPanel
        selectedCoordination={selected}
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture()}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={selected ? kpiCoordinationFixture(1) : null}
        coordinationError={null}
      />,
    )
  })
}

function byTestId(testId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`No existe [data-testid="${testId}"]`)
  return element
}

const query = (testId: string) =>
  container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)

async function click(testId: string) {
  await act(async () => {
    byTestId(testId).dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** Ruta del flujo; en nivel ciclo no se muestra (el periodo está encima). */
const crumb = () =>
  Array.from(
    (query('director-flujo-crumb') ?? document.createElement('nav')).querySelectorAll(
      '.director-flujo__crumb-link, .director-flujo__crumb-here',
    ),
  ).map((node) => node.textContent)

const lastState = () => vi.mocked(fetchOperationalKpiState).mock.calls.at(-1)?.[0]

/** Drill-down desde el flujo (ESTADO): ciclo → septiembre. */
async function drillSeptember() {
  await click('director-flujo-drill-2026-09-01')
}

/** Desde septiembre: el último bucket (28–30 sep) → semana 28 sep – 4 oct. */
const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30' }

describe('Flujo de problemas · default y drill-down', () => {
  it('default: ciclo actual H2 2026 en la gráfica y en el picker', async () => {
    await render(B2B)
    expect(lastState()).toMatchObject({
      kind: 'cycle',
      from: '2026-07-01',
      to: TODAY,
      calendarEnd: '2026-12-31',
    })
    expect(byTestId('director-flujo').dataset.level).toBe('month')
    // Nivel ciclo: sin ruta repetida; el periodo (con «En curso») está en el picker.
    expect(crumb()).toEqual([])
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2026')
    expect(byTestId('director-analysis-period').textContent).toContain('En curso')
    expect(query('director-flujo-live')).toBeNull()
  })

  it('NOV y DIC (futuros) no son navegables; los meses con datos sí', async () => {
    await render(B2B)
    expect(query('director-flujo-drill-2026-10-01')).not.toBeNull()
    expect(query('director-flujo-drill-2026-11-01')).toBeNull()
    expect(query('director-flujo-drill-2026-12-01')).toBeNull()
  })

  it('ciclo → click OCT → mes (misma gráfica, nivel semanas)', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    expect(lastState()).toMatchObject({
      kind: 'month',
      from: '2026-10-01',
      to: TODAY,
      calendarEnd: '2026-10-31',
    })
    expect(byTestId('director-flujo').dataset.level).toBe('week')
    expect(crumb()).toEqual(['H2 2026', 'OCTUBRE'])
  })

  it('OCTUBRE → «1–4 oct» abre la semana COMPLETA 28 sep – 4 oct, no la truncada', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    // El primer bucket de octubre cuenta 1–4 oct pero pertenece a la semana del 28 sep.
    await click('director-flujo-drill-2026-09-28')
    expect(lastState()).toMatchObject({
      kind: 'week',
      from: '2026-09-28',
      to: '2026-10-04',
      calendarEnd: '2026-10-04',
    })
    expect(crumb()).toEqual(['H2 2026', 'OCTUBRE', '28 SEP – 4 OCT'])
  })

  it('mes → click semana → días; los días no son navegables', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    await click('director-flujo-drill-2026-10-05')
    expect(byTestId('director-flujo').dataset.level).toBe('day')
    expect(crumb()).toEqual(['H2 2026', 'OCTUBRE', '5–11 OCT'])
    expect(container.querySelector('[data-testid^="director-flujo-drill-"]')).toBeNull()
  })

  it('ruta: semana → OCTUBRE (mes) → H2 2026 (ciclo)', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    await click('director-flujo-drill-2026-10-05')
    await click('director-flujo-crumb-month')
    expect(lastState()).toMatchObject({ kind: 'month', from: '2026-10-01' })
    expect(crumb()).toEqual(['H2 2026', 'OCTUBRE'])
    await click('director-flujo-crumb-cycle')
    expect(lastState()).toMatchObject({ kind: 'cycle', from: '2026-07-01' })
    expect(crumb()).toEqual([])
  })

  it('‹ en una semana va a la semana anterior (AnalysisPeriod global, nivel días)', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    await click('director-flujo-drill-2026-10-05')
    await click('director-analysis-period-prev')
    expect(lastState()).toMatchObject({ kind: 'week', from: '2026-09-28', to: '2026-10-04' })
    expect(byTestId('director-flujo').dataset.level).toBe('day')
    expect(byTestId('director-analysis-period-range').textContent).toBe('28 SEP — 4 OCT 2026')
  })

  it('elegir un ciclo en el diálogo vuelve a kind = cycle (nivel meses)', async () => {
    await render(B2B)
    await click('director-flujo-drill-2026-10-01')
    await click('director-flujo-drill-2026-10-05')
    await click('director-analysis-period-trigger')
    await click('director-analysis-period-use-cycle-H1')
    expect(lastState()).toMatchObject({
      kind: 'cycle',
      from: '2026-01-01',
      calendarEnd: '2026-06-30',
    })
    expect(byTestId('director-flujo').dataset.level).toBe('month')
    expect(crumb()).toEqual([])
    expect(byTestId('director-analysis-period-range').textContent).toBe('H1 2026')
  })

  it('«↺ Ciclo actual» solo en un ciclo histórico y vuelve a H2 2026', async () => {
    await render(B2B)
    expect(query('director-analysis-period-go-current')).toBeNull()
    await click('director-analysis-period-prev')
    await click('director-analysis-period-prev')
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2025')
    await click('director-analysis-period-go-current')
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2026')
    expect(lastState()).toMatchObject({ kind: 'cycle', from: '2026-07-01' })
  })
})

describe('DirectorReadingPanel · un periodo para toda la lectura', () => {
  it('sin coordinación (Lectura de Dirección) no muestra un picker inerte', async () => {
    await render(null)
    expect(query('director-reading-period')).toBeNull()
    expect(query('director-analysis-period')).toBeNull()
    expect(query('director-flujo')).toBeNull()
    expect(fetchOperationalKpiState).not.toHaveBeenCalled()
  })

  it('con coordinación la cabecera no repite identidad, activos ni estado', async () => {
    await render(B2B)
    const header = byTestId('director-reading-panel').querySelector('header')!
    expect(header.textContent).toContain('Lectura de coordinación')
    expect(query('director-reading-context')).toBeNull()
    expect(header.querySelector('img')).toBeNull()
    expect(header.textContent).not.toContain('B2B')
    expect(header.textContent).not.toMatch(/activos?/)
    expect(query('director-estado-operativo')).toBeNull()
    // La carga activa se lee en la gráfica (total del bucket actual).
    const current = container.querySelector<HTMLElement>(
      '[data-testid^="director-flujo-row-"][data-current="true"]',
    )
    expect(current?.textContent).toContain('5 ahora')
  })

  it('orden: tabs → periodo → flujo (sin bloques intermedios)', async () => {
    await render(B2B)
    const modes = byTestId('director-reading-mode-state')
    const period = byTestId('director-reading-period')
    const flujo = byTestId('director-flujo')
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(modes, period)).toBe(true)
    expect(follows(period, flujo)).toBe(true)
    const estadoTop = flujo.parentElement!
    expect(estadoTop.firstElementChild).toBe(flujo)
  })

  it('un solo picker, en la cabecera común, fuera del cuerpo de los tabs', async () => {
    await render(B2B)
    expect(container.querySelectorAll('[data-testid="director-analysis-period"]')).toHaveLength(1)
    const period = byTestId('director-reading-period')
    expect(period.closest('header')).not.toBeNull()
    expect(byTestId('director-reading-body').contains(period)).toBe(false)
  })

  it('Septiembre elegido en la gráfica se conserva en INTERNOS, DEPENDENCIAS, APRENDIZAJES y al volver', async () => {
    await render(B2B)
    await drillSeptember()
    const pickerNode = byTestId('director-analysis-period')

    await click('director-reading-mode-internos')
    const sep = {
      coordinationId: B2B_ID,
      period: { kind: 'month', ...SEPTEMBER, calendarEnd: '2026-09-30' },
    }
    expect(fetchInternalRecurrence).toHaveBeenLastCalledWith(sep, expect.anything())
    expect(fetchInternalProblems).toHaveBeenLastCalledWith(sep, expect.anything())
    expect(fetchOperationalKpiBreakdown).not.toHaveBeenCalled()
    await click('director-reading-mode-dependencias')
    expect(fetchOperationalKpiRelations).toHaveBeenLastCalledWith(
      { coordinationId: B2B_ID, metric: 'created', ...SEPTEMBER },
      expect.anything(),
    )
    await click('director-reading-mode-aprendizajes')
    expect(byTestId('director-reading-aprendizajes').dataset.periodFrom).toBe('2026-09-01')
    await click('director-reading-mode-state')
    expect(crumb()).toEqual(['H2 2026', 'SEPTIEMBRE'])
    expect(byTestId('director-analysis-period')).toBe(pickerNode)
    expect(container.textContent).not.toMatch(/Semanal|Mensual/)
  })

  it('cambiar de coordinación (B2B → Especializaciones) conserva Septiembre', async () => {
    await render(B2B)
    await drillSeptember()
    await render(ESPE)
    expect(crumb()).toEqual(['H2 2026', 'SEPTIEMBRE'])
    expect(fetchOperationalKpiState).toHaveBeenLastCalledWith(
      expect.objectContaining({ coordinationId: ESPE_ID, ...SEPTEMBER, kind: 'month' }),
      expect.anything(),
    )
  })

  it('cerrar y reabrir el picker conserva Septiembre', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-analysis-period-trigger')
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(crumb()).toEqual(['H2 2026', 'SEPTIEMBRE'])
  })

  it('solo el tab activo consulta: navegar en ESTADO no pide INTERNOS/DEPENDENCIAS', async () => {
    await render(B2B)
    await drillSeptember()
    expect(fetchOperationalKpiBreakdown).not.toHaveBeenCalled()
    expect(fetchInternalProblems).not.toHaveBeenCalled()
    expect(fetchInternalRecurrence).not.toHaveBeenCalled()
    expect(fetchOperationalKpiRelations).not.toHaveBeenCalled()
  })
})

describe('DirectorReadingPanel · INTERNOS: 2 láminas sobre el AnalysisPeriod global', () => {
  const internosPage = () => byTestId('director-internos-carousel').dataset.page

  it('el heatmap navega el periodo GLOBAL: H2 → SEP → semana; la lámina 2 reacciona', async () => {
    await render(B2B)
    await click('director-reading-mode-internos')
    expect(byTestId('director-internos-recurrence').dataset.level).toBe('month')
    await click('director-internos-drill-2026-09-01')
    const sep = { coordinationId: B2B_ID, period: { kind: 'month', ...SEPTEMBER, calendarEnd: '2026-09-30' } }
    expect(fetchInternalRecurrence).toHaveBeenLastCalledWith(sep, expect.anything())
    expect(fetchInternalProblems).toHaveBeenLastCalledWith(sep, expect.anything())
    expect(byTestId('director-internos-recurrence').dataset.level).toBe('week')
    expect(byTestId('director-analysis-period-range').textContent).toBe('SEPTIEMBRE 2026')

    // Clic en una CELDA (semana del 14): drill a esa semana, sin filtrar categoría.
    const cell = container.querySelector<HTMLElement>('[data-testid="director-internos-cell-' + INTERNET.id + '-2"]')!
    await act(async () => {
      cell.click()
    })
    expect(fetchInternalProblems).toHaveBeenLastCalledWith(
      { coordinationId: B2B_ID, period: expect.objectContaining({ kind: 'week', from: '2026-09-14' }) },
      expect.anything(),
    )
    expect(byTestId('director-internos-recurrence').dataset.level).toBe('day')
    // Días terminales.
    expect(container.querySelector('[data-testid^="director-internos-drill-"]')).toBeNull()

    // ESTADO lee el mismo periodo.
    await click('director-reading-mode-state')
    expect(lastState()).toMatchObject({ kind: 'week', from: '2026-09-14' })
  })

  it('la lámina sobrevive a coordinación, periodo y tab', async () => {
    await render(B2B)
    await click('director-reading-mode-internos')
    expect(internosPage()).toBe('0')
    await click('director-internos-carousel-next')
    expect(internosPage()).toBe('1')
    await render(ESPE)
    expect(internosPage()).toBe('1')
    await click('director-analysis-period-prev')
    expect(internosPage()).toBe('1')
    await click('director-reading-mode-dependencias')
    await click('director-reading-mode-internos')
    expect(internosPage()).toBe('1')
    // ESTADO conserva su propia lámina, independiente.
    await click('director-reading-mode-state')
    expect(byTestId('director-estado-carousel').dataset.page).toBe('0')
  })

  it('cambiar de coordinación conserva el periodo en INTERNOS', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-reading-mode-internos')
    await render(ESPE)
    expect(fetchInternalRecurrence).toHaveBeenLastCalledWith(
      { coordinationId: ESPE_ID, period: { kind: 'month', ...SEPTEMBER, calendarEnd: '2026-09-30' } },
      expect.anything(),
    )
  })
})

describe('PERIODO · el encabezado refleja el AnalysisPeriod REAL', () => {
  const range = () => byTestId('director-analysis-period-range').textContent
  const pickerText = () => byTestId('director-analysis-period').textContent ?? ''

  it('ciclo → SEPTIEMBRE 2026 · Mes → 7 — 13 SEP 2026 · Semana → (ruta) → ciclo', async () => {
    await render(B2B)
    expect(range()).toBe('H2 2026')
    expect(pickerText()).toContain('JUL — DIC 2026 · En curso')

    await drillSeptember()
    expect(range()).toBe('SEPTIEMBRE 2026')
    expect(pickerText()).toContain('Mes')
    expect(pickerText()).not.toContain('H2 2026')
    expect(byTestId('director-analysis-period').dataset.kind).toBe('month')

    await click('director-flujo-drill-2026-09-07')
    expect(lastState()).toMatchObject({ kind: 'week', from: '2026-09-07' })
    expect(range()).toBe('7 — 13 SEP 2026')
    expect(pickerText()).toContain('Semana')

    // La ruta del flujo sigue siendo la forma de subir; el header acompaña.
    await click('director-flujo-crumb-month')
    expect(range()).toBe('SEPTIEMBRE 2026')
    await click('director-flujo-crumb-cycle')
    expect(range()).toBe('H2 2026')
  })

  it('el mismo contexto en todas las láminas: el corte de ANTIGÜEDAD es el del header', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-2')
    expect(range()).toBe('SEPTIEMBRE 2026')
    expect(byTestId('director-antiguedad-cut').textContent).toBe('AL CIERRE DEL 30 SEP 2026')
  })
})

describe('ESTADO · carrusel de láminas frente a periodo, coordinación y tab', () => {
  const carouselPage = () => byTestId('director-estado-carousel').dataset.page

  it('lámina 3 (Antigüedad) se conserva al cambiar periodo, hacer drill-down, coordinación y tab', async () => {
    await render(B2B)
    await click('director-estado-carousel-dot-2')
    expect(carouselPage()).toBe('2')
    await drillSeptember()
    expect(carouselPage()).toBe('2')
    await click('director-flujo-drill-2026-09-07')
    expect(carouselPage()).toBe('2')
    await render(ESPE)
    expect(carouselPage()).toBe('2')
    await click('director-reading-mode-internos')
    await click('director-reading-mode-state')
    expect(carouselPage()).toBe('2')
    expect(byTestId('director-estado-page-antiguedad').dataset.active).toBe('true')
    await click('director-analysis-period-prev')
    expect(lastState()).toMatchObject({ kind: 'week', from: '2026-08-31' })
    expect(carouselPage()).toBe('2')
  })

  it('lámina 1 por defecto: Carga | Movimiento; lámina 2: Severidad | Atención', async () => {
    await render(B2B)
    expect(carouselPage()).toBe('0')
    expect(byTestId('director-estado-page-operacion').dataset.active).toBe('true')
    expect(query('director-estado-page-operacion')?.querySelector('[data-testid="director-flujo"]')).not.toBeNull()
    await click('director-estado-carousel-next')
    expect(carouselPage()).toBe('1')
    const second = byTestId('director-estado-page-composicion')
    expect(second.dataset.active).toBe('true')
    expect(second.querySelector('[data-testid="director-kpi-severity"]')).not.toBeNull()
    expect(second.querySelector('[data-testid="director-kpi-status-split"]')).not.toBeNull()
  })

  it('navegar el carrusel NO cambia el AnalysisPeriod ni vuelve a consultar', async () => {
    await render(B2B)
    await drillSeptember()
    const calls = vi.mocked(fetchOperationalKpiState).mock.calls.length
    await click('director-estado-carousel-next')
    await click('director-estado-carousel-prev')
    await click('director-estado-carousel-next')
    expect(vi.mocked(fetchOperationalKpiState).mock.calls.length).toBe(calls)
    expect(lastState()).toMatchObject({ kind: 'month', ...SEPTEMBER })
    expect(byTestId('director-estado-panel').dataset.periodFrom).toBe('2026-09-01')
    await click('director-estado-carousel-prev')
    expect(byTestId('director-flujo').dataset.level).toBe('week')
    expect(crumb()).toEqual(['H2 2026', 'SEPTIEMBRE'])
  })

  it('cambiar el periodo conserva la lámina 2', async () => {
    await render(B2B)
    await click('director-estado-carousel-next')
    await drillSeptember()
    expect(lastState()).toMatchObject({ kind: 'month', ...SEPTEMBER })
    expect(carouselPage()).toBe('1')
  })

  it('cambiar de coordinación conserva la lámina 2 (comparar la misma dimensión)', async () => {
    await render(B2B)
    await click('director-estado-carousel-next')
    await render(ESPE)
    expect(carouselPage()).toBe('1')
    expect(byTestId('director-estado-page-composicion').dataset.active).toBe('true')
  })

  it('ESTADO → INTERNOS → ESTADO conserva la lámina 2', async () => {
    await render(B2B)
    await click('director-estado-carousel-next')
    await click('director-reading-mode-internos')
    expect(query('director-estado-carousel')).toBeNull()
    await click('director-reading-mode-state')
    expect(carouselPage()).toBe('1')
  })

  it('ESTADO e INTERNOS con coordinación son de alto fijo; los demás modos conservan scroll', async () => {
    await render(B2B)
    expect(byTestId('director-reading-body').dataset.fixedHeight).toBe('true')
    expect(byTestId('director-reading-panel').dataset.scrollMore).toBe('false')
    await click('director-reading-mode-internos')
    expect(byTestId('director-reading-body').dataset.fixedHeight).toBe('true')
    for (const mode of ['dependencias', 'aprendizajes']) {
      await click(`director-reading-mode-${mode}`)
      expect(byTestId('director-reading-body').dataset.fixedHeight).toBe('false')
    }
    await render(null)
    await click('director-reading-mode-state')
    expect(byTestId('director-reading-body').dataset.fixedHeight).toBe('false')
    expect(query('director-estado-carousel')).toBeNull()
  })
})

describe('ESTADO · AnalysisPeriod como ÚNICA fuente temporal de TODAS las láminas', () => {
  const page = () => byTestId('director-estado-carousel').dataset.page
  /** Lo que la lámina 2 dice de la severidad (texto accesible de la gráfica). */
  const severityText = () =>
    byTestId('director-kpi-severity').querySelector('.visually-hidden')?.textContent ?? ''
  const attentionText = () =>
    byTestId('director-kpi-status-split').querySelector('.visually-hidden')?.textContent ?? ''
  const agingCut = () => byTestId('director-antiguedad-cut').textContent
  const agingRows = () =>
    container.querySelectorAll('[data-testid^="director-antiguedad-row-"]').length
  const snapshotOf = () => vi.mocked(fetchOperationalKpiState).mock.results.at(-1)
  const lastResponse = async () =>
    (await snapshotOf()?.value) as Awaited<ReturnType<typeof fetchOperationalKpiState>>
  const agingSnapshot = () => ({
    cut: agingCut(),
    rows: [...container.querySelectorAll('[data-testid^="director-antiguedad-row-"]')].map(
      (row) => row.textContent,
    ),
    bands: byTestId('director-distribucion-table').textContent,
    median: byTestId('director-antiguedad-median').textContent,
  })


  it('H2 → click SEP en Carga: Severidad (lámina 2) y Antigüedad (lámina 3) pasan a SEPTIEMBRE', async () => {
    await render(B2B)
    await click('director-estado-carousel-dot-1')
    const h2Severity = severityText()
    expect(byTestId('director-estado-comp-cut').textContent).toBe('Activos hoy')

    await click('director-estado-carousel-dot-0')
    await drillSeptember()
    expect(lastState()).toMatchObject({ kind: 'month', ...SEPTEMBER })

    await click('director-estado-carousel-dot-1')
    expect(severityText()).not.toBe(h2Severity)
    expect(byTestId('director-estado-comp-cut').textContent).toBe(
      'Activos al cierre del 30 sep 2026',
    )
    expect(byTestId('director-severity-reliability').textContent).toBe('Valor actual')

    await click('director-estado-carousel-dot-2')
    expect(agingCut()).toBe('AL CIERRE DEL 30 SEP 2026')
  })

  it('una sola población por corte: Carga (último punto) = Severidad = Atención = Antigüedad', async () => {
    await render(B2B)
    for (const step of ['h2', 'sep', 'week'] as const) {
      if (step === 'sep') await drillSeptember()
      if (step === 'week') await click('director-flujo-drill-2026-09-07')
      const response = await lastResponse()
      const last = response.evolution.buckets.filter((b) => !b.future).at(-1)!
      const { severity: sev, attention: att, activeCount } = response.snapshot
      expect(sev.low + sev.medium + sev.high + sev.critical).toBe(activeCount)
      expect(att.open + att.inProgress + att.closedAfterCut + att.unclassified).toBe(activeCount)
      expect(response.aging.activeCount).toBe(activeCount)
      expect(response.aging.at).toBe(response.snapshot.at)
      // En pantalla: el donut y el ranking dicen lo mismo que el contrato.
      expect(attentionText()).toContain(`${att.open} abiertos y ${att.inProgress} en atención`)
      expect(agingRows()).toBe(Math.min(5, response.aging.activeCount))
      void last
    }
  })

  it('› en SEPTIEMBRE va a OCTUBRE: la lámina actual se conserva y todas cambian a OCT', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-1')
    const sepSeverity = severityText()
    await click('director-analysis-period-next')
    expect(lastState()).toMatchObject({ kind: 'month', from: '2026-10-01', to: TODAY })
    expect(page()).toBe('1')
    expect(byTestId('director-analysis-period-range').textContent).toBe('OCTUBRE 2026')
    expect(severityText()).not.toBe(sepSeverity)
    expect(byTestId('director-estado-comp-cut').textContent).toBe('Activos hoy')
    await click('director-estado-carousel-dot-2')
    expect(agingCut()).toBe('HOY')
  })

  it('SEP + lámina 3: cambiar de carta CAMBIA Antigüedad (otra población), mismo periodo y lámina', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-2')
    const b2b = agingSnapshot()
    await render(ESPE)
    expect(page()).toBe('2')
    expect(lastState()).toMatchObject({ coordinationId: ESPE_ID, kind: 'month', ...SEPTEMBER })
    expect(byTestId('director-analysis-period-range').textContent).toBe('SEPTIEMBRE 2026')
    const espe = agingSnapshot()
    // Mismo corte, distinta coordinación: top 5, rangos y mediana de Especializaciones.
    expect(espe.cut).toBe('AL CIERRE DEL 30 SEP 2026')
    expect(espe.cut).toBe(b2b.cut)
    expect(espe).not.toEqual(b2b)
    const response = await lastResponse()
    expect(response.scope.coordinationId).toBe(ESPE_ID)
    expect(agingRows()).toBe(Math.min(5, response.aging.activeCount))
  })

  it('Especializaciones SEP → semana: Antigüedad vuelve a cambiar (misma carta)', async () => {
    await render(ESPE)
    await drillSeptember()
    await click('director-estado-carousel-dot-2')
    const sep = agingSnapshot()
    await click('director-flujo-drill-2026-09-07')
    expect(lastState()).toMatchObject({ coordinationId: ESPE_ID, kind: 'week', from: '2026-09-07' })
    const week = agingSnapshot()
    expect(week.cut).toBe('AL CIERRE DEL 13 SEP 2026')
    expect(week).not.toEqual(sep)
  })

  it('cambiar de PERIODO cambia Antigüedad (SEP → OCT) en la misma carta', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-2')
    const sep = agingSnapshot()
    await click('director-analysis-period-next')
    expect(lastState()).toMatchObject({ coordinationId: B2B_ID, kind: 'month', from: '2026-10-01' })
    const oct = agingSnapshot()
    expect(oct.cut).toBe('HOY')
    expect(oct).not.toEqual(sep)
  })

  it('mientras llega el periodo nuevo NINGUNA lámina muestra la foto anterior', async () => {
    await render(B2B)
    let resolve: (value: unknown) => void = () => undefined
    vi.mocked(fetchOperationalKpiState).mockImplementationOnce(
      () => new Promise((r) => (resolve = r as (value: unknown) => void)) as never,
    )
    await drillSeptember()
    // Pendiente: lámina 2 en «Actualizando…», lámina 3 sin ranking del ciclo.
    await click('director-estado-carousel-dot-1')
    expect(query('director-estado-severity-chart')).toBeNull()
    expect(query('director-estado-comp-cut')).toBeNull()
    // Antigüedad viaja en la misma respuesta: tampoco muestra la foto anterior.
    await click('director-estado-carousel-dot-2')
    expect(query('director-antiguedad-cut')).toBeNull()
    await act(async () => {
      resolve(stateResponse({ coordinationId: B2B_ID, kind: 'month', ...SEPTEMBER, calendarEnd: '2026-09-30' }))
    })
    expect(agingCut()).toBe('AL CIERRE DEL 30 SEP 2026')
    await click('director-estado-carousel-dot-1')
    expect(byTestId('director-estado-comp-cut').textContent).toBe(
      'Activos al cierre del 30 sep 2026',
    )
  })

  it('si falla el periodo nuevo: error visible y sin gráficas del periodo anterior', async () => {
    await render(B2B)
    vi.mocked(fetchOperationalKpiState).mockRejectedValueOnce(new Error('HTTP 500'))
    await drillSeptember()
    await click('director-estado-carousel-dot-1')
    expect(byTestId('director-estado-comp-error').textContent).toContain('HTTP 500')
    expect(query('director-estado-severity-chart')).toBeNull()
    // Antigüedad viaja en la misma respuesta /state: comparte su error.
    await click('director-estado-carousel-dot-2')
    expect(query('director-antiguedad-cut')).toBeNull()
    expect(byTestId('director-antiguedad-error').textContent).toContain('HTTP 500')
  })

  /** Lo que la lámina 4 dice (tablas accesibles de ambas gráficas + subtítulos). */
  const resolucionSnapshot = () => ({
    trend: byTestId('director-resolucion-table').textContent,
    bands: byTestId('director-tiempo-solucion-table').textContent,
    median: byTestId('director-resolucion-median').textContent,
    count: byTestId('director-resolucion-count').textContent,
  })

  it('lámina 4 · RESOLUCIÓN: cuarto indicador del carrusel; mismos cierres que Movimiento', async () => {
    await render(B2B)
    await drillSeptember()
    expect(byTestId('director-estado-carousel').dataset.pages).toBe('4')
    await click('director-estado-carousel-dot-3')
    expect(page()).toBe('3')
    const response = await lastResponse()
    const solved = response.evolution.buckets.map((b) => (b.solved ? b.solved.total : null))
    expect(response.resolution.buckets.map((b) => b.closedCount)).toEqual(solved)
    const total = solved.reduce<number>((a, b) => a + (b ?? 0), 0)
    expect(response.resolution.closedCount).toBe(total)
    expect(byTestId('director-resolucion-count').textContent).toBe(
      `${total} solucionados en el periodo`,
    )
    // Una fila accesible por bucket con dato (los futuros no se dibujan).
    expect(
      container.querySelectorAll('[data-testid^="director-resolucion-row-"]').length,
    ).toBe(solved.filter((v) => v !== null).length)
    // Métrica de intervalo: sin chip de corte dentro de la lámina 4.
    expect(
      byTestId('director-resolucion').querySelector('[data-testid$="-cut"]'),
    ).toBeNull()
  })

  it('SEP + lámina 4: cambiar de carta CAMBIA Resolución; mismo periodo y lámina', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-3')
    const b2b = resolucionSnapshot()
    await render(ESPE)
    expect(page()).toBe('3')
    expect(lastState()).toMatchObject({ coordinationId: ESPE_ID, kind: 'month', ...SEPTEMBER })
    expect(byTestId('director-analysis-period-range').textContent).toBe('SEPTIEMBRE 2026')
    const espe = resolucionSnapshot()
    expect(espe).not.toEqual(b2b)
    expect((await lastResponse()).scope.coordinationId).toBe(ESPE_ID)
  })

  it('lámina 4 reacciona al periodo: SEP (semanas) → semana 7–13 SEP (días) en la misma carta', async () => {
    await render(B2B)
    await drillSeptember()
    await click('director-estado-carousel-dot-3')
    const sep = resolucionSnapshot()
    expect(byTestId('director-resolucion').dataset.level).toBe('week')
    await click('director-flujo-drill-2026-09-07')
    expect(lastState()).toMatchObject({ coordinationId: B2B_ID, kind: 'week', from: '2026-09-07' })
    expect(page()).toBe('3')
    expect(byTestId('director-resolucion').dataset.level).toBe('day')
    expect(resolucionSnapshot()).not.toEqual(sep)
  })

  it('mientras llega el periodo nuevo la lámina 4 no muestra la resolución anterior', async () => {
    await render(B2B)
    await click('director-estado-carousel-dot-3')
    expect(query('director-resolucion-table')).not.toBeNull()
    let resolve: (value: OperationalKpiStateResponse) => void = () => undefined
    vi.mocked(fetchOperationalKpiState).mockImplementationOnce(
      () => new Promise<OperationalKpiStateResponse>((r) => (resolve = r)),
    )
    await click('director-analysis-period-prev')
    expect(query('director-resolucion-table')).toBeNull()
    const pending = lastState()!
    await act(async () => {
      resolve(stateResponse(pending))
    })
    expect(query('director-resolucion-table')).not.toBeNull()
  })
})
