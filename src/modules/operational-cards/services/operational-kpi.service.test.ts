import { resolutionFixture } from '@/modules/operational-cards/charts/resolucion.fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchOperationalKpiBreakdown,
  fetchOperationalKpiCoordination,
  fetchOperationalKpiDirection,
  fetchOperationalKpiHistory,
  fetchOperationalKpiPeriod,
  fetchOperationalKpiState,
  OperationalKpiContractError,
  parseOperationalKpiBreakdownResponse,
  parseOperationalKpiDirectionResponse,
  parseOperationalKpiHistoryResponse,
  parseOperationalKpiPeriodResponse,
  parseOperationalKpiStateResponse,
} from '@/modules/operational-cards/services/operational-kpi.service'
import {
  kpiCoordinationResponseFixture,
  kpiDirectionResponseFixture,
} from '@/modules/operational-cards/experience/director/director-kpi.fixture'
import { apiRequest } from '@/shared/api/http'

vi.mock('@/shared/api/http', () => ({
  apiRequest: vi.fn(),
}))

const mockedApi = vi.mocked(apiRequest)

beforeEach(() => {
  mockedApi.mockReset()
})

describe('parseOperationalKpiDirectionResponse', () => {
  it('acepta 15 coordinaciones del catálogo activo', () => {
    const parsed = parseOperationalKpiDirectionResponse(
      kpiDirectionResponseFixture(),
    )
    expect(parsed.scope.type).toBe('direction')
    expect(parsed.direction.coordinations).toHaveLength(15)
    expect(parsed.direction.directionStatus).toBe('ESTABLE')
  })

  it('degrada integridad desconocida a DESCONOCIDO, no a ESTABLE', () => {
    const payload = kpiDirectionResponseFixture({
      directionStatus: 'ESTABLE',
      coordinations: [
        {
          ...kpiDirectionResponseFixture().direction.coordinations[0],
          integrityStatus: 'NO_EXISTE' as never,
        },
      ],
    })
    const parsed = parseOperationalKpiDirectionResponse(payload)
    expect(parsed.direction.coordinations[0].integrityStatus).toBe('DESCONOCIDO')
  })

  it('rechaza direction.coordinations ausente', () => {
    const payload = kpiDirectionResponseFixture()
    const broken = {
      ...payload,
      direction: { ...payload.direction, coordinations: undefined },
    }
    expect(() => parseOperationalKpiDirectionResponse(broken)).toThrow(
      OperationalKpiContractError,
    )
  })
})

describe('fetchOperationalKpiDirection', () => {
  it('pide GET /operational-kpis?scope=direction y no overview', async () => {
    mockedApi.mockResolvedValue(kpiDirectionResponseFixture())
    await fetchOperationalKpiDirection()
    expect(mockedApi).toHaveBeenCalledWith('/operational-kpis?scope=direction')
    expect(mockedApi).not.toHaveBeenCalledWith(
      expect.stringContaining('operational-overview'),
    )
  })
})

describe('fetchOperationalKpiCoordination', () => {
  it('pide GET /operational-kpis?scope=coordination&coordinationId=', async () => {
    const payload = kpiCoordinationResponseFixture()
    mockedApi.mockResolvedValue(payload)
    await fetchOperationalKpiCoordination(payload.coordination.coordination.id)
    expect(mockedApi).toHaveBeenCalledWith(
      `/operational-kpis?scope=coordination&coordinationId=${payload.coordination.coordination.id}`,
    )
    expect(mockedApi).not.toHaveBeenCalledWith(
      expect.stringContaining('operational-overview'),
    )
  })
})

describe('fetchOperationalKpiHistory', () => {
  const historyPayload = {
    scope: {
      type: 'coordination',
      coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    metric: 'backlog',
    granularity: 'week',
    range: { from: '2026-01-12', to: '2026-01-19' },
    timezone: 'America/Bogota',
    series: [
      {
        start: '2026-01-12',
        end: '2026-01-18',
        label: 'Semana',
        value: 3,
      },
    ],
  }

  it('parsea serie histórica', () => {
    const parsed = parseOperationalKpiHistoryResponse(historyPayload)
    expect(parsed.metric).toBe('backlog')
    expect(parsed.series[0].value).toBe(3)
  })

  it('pide GET /operational-kpis/history con query', async () => {
    mockedApi.mockResolvedValue(historyPayload)
    await fetchOperationalKpiHistory({
      coordinationId: historyPayload.scope.coordinationId,
      metric: 'backlog',
      granularity: 'week',
      from: '2026-01-12',
      to: '2026-01-19',
    })
    expect(mockedApi).toHaveBeenCalledWith(
      expect.stringContaining('/operational-kpis/history?'),
      undefined,
    )
    const path = String(mockedApi.mock.calls[0]?.[0])
    expect(path).toContain('scope=coordination')
    expect(path).toContain('metric=backlog')
    expect(path).toContain('granularity=week')
  })

  it('incluye categoryId cuando se pide evolución interna', async () => {
    mockedApi.mockResolvedValue(historyPayload)
    await fetchOperationalKpiHistory({
      coordinationId: historyPayload.scope.coordinationId,
      metric: 'created',
      granularity: 'week',
      from: '2026-01-12',
      to: '2026-01-19',
      categoryId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    })
    const path = String(mockedApi.mock.calls[0]?.[0])
    expect(path).toContain('categoryId=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  })
})

describe('fetchOperationalKpiBreakdown', () => {
  const breakdownPayload = {
    scope: {
      type: 'coordination',
      coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    dimension: 'category',
    metric: 'created',
    range: { from: '2026-01-01', to: '2026-01-31' },
    timezone: 'America/Bogota',
    items: [
      {
        category: {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          code: 'internet',
          name: 'Internet',
          selectable: true,
        },
        value: 12,
      },
    ],
  }

  it('parsea breakdown por categoría', () => {
    const parsed = parseOperationalKpiBreakdownResponse(breakdownPayload)
    expect(parsed.items[0].category.name).toBe('Internet')
    expect(parsed.items[0].value).toBe(12)
  })

  it('pide GET /operational-kpis/breakdown', async () => {
    mockedApi.mockResolvedValue(breakdownPayload)
    await fetchOperationalKpiBreakdown({
      coordinationId: breakdownPayload.scope.coordinationId,
      metric: 'created',
      from: '2026-01-01',
      to: '2026-01-31',
    })
    const path = String(mockedApi.mock.calls[0]?.[0])
    expect(path).toContain('/operational-kpis/breakdown?')
    expect(path).toContain('dimension=category')
    expect(path).toContain('metric=created')
  })
})

describe('fetchOperationalKpiPeriod', () => {
  const periodPayload = {
    scope: {
      type: 'coordination',
      coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    granularity: 'week',
    period: {
      from: '2026-09-29',
      to: '2026-10-05',
      calendarEnd: '2026-10-05',
      label: 'Semana actual · 29 sep – 5 oct',
      incomplete: true,
    },
    timezone: 'America/Bogota',
    severity: { low: 1, medium: 3, high: 2, critical: 0 },
    attention: { open: 4, inProgress: 2 },
    relations: { dependencies: 1, commitments: 0 },
    registeredCount: 6,
    severitySemantics: 'current-severity-of-period-registrations',
  }

  it('parsea composición del periodo', () => {
    const parsed = parseOperationalKpiPeriodResponse(periodPayload)
    expect(parsed.severity.medium).toBe(3)
    expect(parsed.attention.open).toBe(4)
    expect(parsed.relations.dependencies).toBe(1)
    expect(parsed.period.incomplete).toBe(true)
  })

  it('pide GET /operational-kpis/period con from/to', async () => {
    mockedApi.mockResolvedValue(periodPayload)
    await fetchOperationalKpiPeriod({
      coordinationId: periodPayload.scope.coordinationId,
      from: '2026-09-29',
      to: '2026-10-05',
    })
    const path = String(mockedApi.mock.calls[0]?.[0])
    expect(path).toContain('/operational-kpis/period?')
    expect(path).toContain('from=2026-09-29')
    expect(path).toContain('to=2026-10-05')
    expect(path).toContain('scope=coordination')
  })
})

function agingItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f0000000-0000-4000-8000-000000000001',
    title: 'Falla en matrícula de nuevos ingresos',
    createdAt: '2026-08-17T15:00:00.000Z',
    ageDays: 43,
    severity: 'CRITICAL',
    reportKind: 'INTERNAL',
    categoryName: 'Admisiones',
    affectedCoordinationName: null,
    status: null,
    slaOverdue: null,
    closedAfterCutAt: '2026-11-12T15:00:00.000Z',
    ...overrides,
  }
}

function historicalAging(overrides: Record<string, unknown> = {}) {
  return {
    semantics: 'active-at-cut-age-since-created',
    at: '2026-09-29',
    isNow: false,
    reliability: { status: 'unavailable', sla: 'unavailable' },
    severitySemantics: 'current-severity',
    activeCount: 3,
    medianAgeDays: 12.5,
    bands: [
      { key: '0-7', count: 1 },
      { key: '8-14', count: 1 },
      { key: '15-30', count: 0 },
      { key: '31+', count: 1 },
    ],
    oldest: [agingItem()],
    ...overrides,
  }
}

/** Snapshot coherente con un aging crudo (misma población y corte). */
function snapshotFor(aging: unknown) {
  if (typeof aging !== 'object' || aging === null) return undefined
  const a = aging as { at?: unknown; isNow?: unknown; activeCount?: unknown }
  const n = typeof a.activeCount === 'number' ? a.activeCount : 0
  return {
    semantics: 'active-at-cut',
    at: a.at,
    isNow: a.isNow,
    activeCount: n,
    severity: { low: 0, medium: n, high: 0, critical: 0 },
    attention: { open: n, inProgress: 0, closedAfterCut: 0, unclassified: 0 },
    reliability: a.isNow
      ? { severity: 'exact', attention: 'exact' }
      : { severity: 'current-value', attention: 'current-value' },
  }
}

/** /state con un aging crudo y el snapshot de la MISMA población y corte. */
function stateWithAging(aging: unknown, period: Record<string, unknown> = {}) {
  const a = (aging ?? {}) as { at?: string; isNow?: boolean; activeCount?: number }
  return {
    scope: { type: 'coordination', coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    timezone: 'America/Bogota',
    period: {
      kind: 'month',
      from: '2026-09-01',
      to: '2026-09-29',
      calendarEnd: '2026-09-30',
      label: 'x',
      isCurrent: false,
      isPartial: false,
      dataTo: '2026-09-29',
      ...period,
    },
    relations: { dependencies: 0, commitments: 0 },
    evolution: { bucket: 'week', backlog: [], created: [], closed: [], buckets: [] },
    activeAtPeriodEnd: { count: 0, at: '2026-09-29', isNow: false },
    aging,
    snapshot: snapshotFor({ at: a.at, isNow: a.isNow, activeCount: a.activeCount ?? 0 }),
    resolution: resolutionFixture([]),
  }
}

const CURRENT = { isCurrent: true, isPartial: true }

describe('parseOperationalKpiStateResponse · aging (scope coordinación)', () => {
  it('acepta un corte HOY con status y SLA vigentes', () => {
    const parsed = parseOperationalKpiStateResponse(
      stateWithAging(
        historicalAging({
          isNow: true,
          reliability: { status: 'current', sla: 'current' },
          oldest: [agingItem({ status: 'IN_PROGRESS', slaOverdue: true, closedAfterCutAt: null })],
        }),
        CURRENT,
      ),
    )
    expect(parsed.aging).toMatchObject({ isNow: true, activeCount: 3, medianAgeDays: 12.5 })
    expect(parsed.aging.oldest[0]).toMatchObject({ status: 'IN_PROGRESS', slaOverdue: true })
    expect(parsed.aging.oldest[0]).not.toHaveProperty('responsibleCoordination')
  })

  it('rechaza aging ausente o que no describe la misma población/corte que el snapshot', () => {
    expect(() => parseOperationalKpiStateResponse(stateWithAging(undefined))).toThrow(
      OperationalKpiContractError,
    )
    const aging = historicalAging()
    expect(() =>
      parseOperationalKpiStateResponse({
        ...stateWithAging(aging),
        snapshot: snapshotFor({ at: '2026-09-29', isNow: false, activeCount: 4 }),
      }),
    ).toThrow(/misma población/)
  })

  it('rechaza un corte histórico que afirma status o SLA', () => {
    expect(() =>
      parseOperationalKpiStateResponse(
        stateWithAging(historicalAging({ reliability: { status: 'current', sla: 'unavailable' } })),
      ),
    ).toThrow(/histórico/)
    expect(() =>
      parseOperationalKpiStateResponse(
        stateWithAging(historicalAging({ oldest: [agingItem({ slaOverdue: false })] })),
      ),
    ).toThrow(/slaOverdue/)
    expect(() =>
      parseOperationalKpiStateResponse(
        stateWithAging(historicalAging({ oldest: [agingItem({ status: 'OPEN' })] })),
      ),
    ).toThrow(/status/)
  })

  it('rechaza más de 5 ítems, edades no enteras y enumerados desconocidos', () => {
    const six = Array.from({ length: 6 }, (_, i) => agingItem({ id: `id-${i}` }))
    const bad = (aging: unknown) => () => parseOperationalKpiStateResponse(stateWithAging(aging))
    expect(bad(historicalAging({ activeCount: 9, oldest: six }))).toThrow(/top 5/)
    expect(bad(historicalAging({ oldest: [agingItem({ ageDays: 4.5 })] }))).toThrow(
      OperationalKpiContractError,
    )
    expect(bad(historicalAging({ oldest: [agingItem({ severity: 'URGENT' })] }))).toThrow(/severity/)
    expect(bad(historicalAging({ semantics: 'avg-age' }))).toThrow(/semantics/)
  })
})

describe('fetchOperationalKpiState', () => {
  it('pide GET /operational-kpis/state', async () => {
    const statePayload = {
      scope: {
        type: 'coordination',
        coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      timezone: 'America/Bogota',
      period: {
        kind: 'week',
        from: '2026-09-29',
        to: '2026-10-05',
        calendarEnd: '2026-10-05',
        label: '2026-09-29 – 2026-10-05',
        isCurrent: true,
        isPartial: true,
        dataTo: '2026-10-05',
      },
      relations: { dependencies: 1, commitments: 0 },
      evolution: {
        bucket: 'day',
        backlog: [
          {
            start: '2026-09-29',
            end: '2026-09-29',
            label: 'Lun 29',
            value: 2,
          },
        ],
        created: [],
        closed: [],
        buckets: [
          {
            start: '2026-09-29',
            end: '2026-09-29',
            dataEnd: '2026-09-29',
            calendarStart: '2026-09-29',
            calendarEnd: '2026-09-29',
            label: 'Lun 29',
            current: false,
            future: false,
            created: 1,
            closed: 0,
            backlog: 2,
            active: {
              total: 3,
              internal: 2,
              external: 1,
              internalBreakdown: [
                {
                  categoryId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                  categoryCode: 'internet',
                  categoryName: 'Internet',
                  selectable: true,
                  count: 2,
                },
              ],
              externalBreakdown: [
                {
                  coordinationId: null,
                  coordinationCode: null,
                  coordinationName: 'Sin coordinación afectada',
                  count: 1,
                },
              ],
            },
            solved: { total: 0 },
          },
          {
            start: '2026-09-30',
            end: '2026-09-30',
            dataEnd: null,
            calendarStart: '2026-09-30',
            calendarEnd: '2026-09-30',
            label: 'Mar 30',
            current: false,
            future: true,
            created: null,
            closed: null,
            backlog: null,
            active: null,
            solved: null,
          },
        ],
      },
      activeAtPeriodEnd: { count: 2, at: '2026-09-29', isNow: false },
      aging: historicalAging({
        at: '2026-10-05',
        isNow: true,
        reliability: { status: 'current', sla: 'current' },
        oldest: [agingItem({ status: 'OPEN', slaOverdue: true, closedAfterCutAt: null })],
      }),
      snapshot: snapshotFor({ at: '2026-10-05', isNow: true, activeCount: 3 }),
    }
    const parsedState = parseOperationalKpiStateResponse({
      ...statePayload,
      resolution: resolutionFixture(statePayload.evolution.buckets),
    })
    expect(parsedState.aging).toMatchObject({ at: '2026-10-05', activeCount: 3 })
    expect(parsedState.snapshot).toMatchObject({ at: '2026-10-05', activeCount: 3 })
    expect(parsedState.evolution.bucket).toBe('day')
    // Futuro: null, no 0.
    expect(parsedState.evolution.buckets[1]).toMatchObject({
      future: true,
      created: null,
      backlog: null,
    })
    expect(parsedState.evolution.buckets[0].active).toMatchObject({
      total: 3,
      internal: 2,
      external: 1,
    })
    expect(parsedState.evolution.buckets[0].active?.externalBreakdown[0].coordinationId).toBeNull()
    expect(parsedState.evolution.buckets[1]).toMatchObject({ active: null, solved: null })
    expect(parsedState.activeAtPeriodEnd).toEqual({
      count: 2,
      at: '2026-09-29',
      isNow: false,
    })
    expect(() =>
      parseOperationalKpiStateResponse({ ...statePayload, activeAtPeriodEnd: undefined }),
    ).toThrow(OperationalKpiContractError)
    mockedApi.mockResolvedValue({
      ...statePayload,
      resolution: resolutionFixture(statePayload.evolution.buckets),
    })
    await fetchOperationalKpiState({
      coordinationId: statePayload.scope.coordinationId,
      from: '2026-09-29',
      to: '2026-10-05',
      kind: 'week',
      calendarEnd: '2026-10-05',
    })
    const path = String(mockedApi.mock.calls[0]?.[0])
    expect(path).toContain('/operational-kpis/state?')
    expect(path).toContain('kind=week')
  })
})

/* ── RESOLUCIÓN: parser estricto (mismos cierres que «Solucionados») ── */
function flowRaw(start: string, solved: number | null) {
  const future = solved === null
  return {
    start,
    end: start,
    dataEnd: future ? null : start,
    calendarStart: start,
    calendarEnd: start,
    label: start,
    current: false,
    future,
    created: future ? null : 1,
    closed: solved,
    backlog: future ? null : 3,
    active: future
      ? null
      : { total: 3, internal: 3, external: 0, internalBreakdown: [], externalBreakdown: [] },
    solved: future ? null : { total: solved },
  }
}

const RES_FLOW = [
  flowRaw('2026-09-01', 2),
  flowRaw('2026-09-07', 0),
  flowRaw('2026-09-14', 4),
  flowRaw('2026-09-21', null),
]

function resolutionRaw(overrides: Record<string, unknown> = {}) {
  return {
    semantics: 'closed-in-period-duration-since-created',
    closedCount: 6,
    medianDays: 5.5,
    p75Days: 12,
    buckets: [
      { start: '2026-09-01', closedCount: 2, medianDays: 0.17, p75Days: 1.2 },
      { start: '2026-09-07', closedCount: 0, medianDays: null, p75Days: null },
      { start: '2026-09-14', closedCount: 4, medianDays: 9, p75Days: 14 },
      { start: '2026-09-21', closedCount: null, medianDays: null, p75Days: null },
    ],
    distribution: [
      { key: 'lt-1d', fromHours: 0, toHours: 24, count: 1 },
      { key: '1-3d', fromHours: 24, toHours: 72, count: 1 },
      { key: '3-7d', fromHours: 72, toHours: 168, count: 0 },
      { key: '7-14d', fromHours: 168, toHours: 336, count: 3 },
      { key: '14-30d', fromHours: 336, toHours: 720, count: 1 },
      { key: '30d+', fromHours: 720, toHours: null, count: 0 },
    ],
    ...overrides,
  }
}

function stateWithResolution(resolution: unknown) {
  return {
    ...stateWithAging(historicalAging()),
    evolution: { bucket: 'week', backlog: [], created: [], closed: [], buckets: RES_FLOW },
    resolution,
  }
}

describe('parseOperationalKpiStateResponse · resolution', () => {
  const parse = (resolution: unknown) => () =>
    parseOperationalKpiStateResponse(stateWithResolution(resolution))

  it('acepta una resolución que cuadra con Solucionados; futuro null, sin cierres sin mediana', () => {
    const { resolution } = parseOperationalKpiStateResponse(stateWithResolution(resolutionRaw()))
    expect(resolution.closedCount).toBe(6)
    expect(resolution.buckets.map((b) => b.closedCount)).toEqual([2, 0, 4, null])
    expect(resolution.buckets[1]).toMatchObject({ medianDays: null, p75Days: null })
    expect(resolution.distribution.map((b) => b.key)).toEqual([
      'lt-1d',
      '1-3d',
      '3-7d',
      '7-14d',
      '14-30d',
      '30d+',
    ])
  })

  it('rechaza resolución ausente o con otra semántica', () => {
    expect(parse(undefined)).toThrow(/resolution/)
    expect(parse(resolutionRaw({ semantics: 'closed-by-created-cohort' }))).toThrow(/semantics/)
  })

  it('INVARIANTE: closedCount por bucket = Solucionados (también null en futuro)', () => {
    const buckets: Array<Record<string, unknown>> = resolutionRaw().buckets.map((b) => ({ ...b }))
    buckets[2] = { ...buckets[2], closedCount: 3 }
    expect(parse(resolutionRaw({ buckets }))).toThrow(/Solucionados/)
    const future: Array<Record<string, unknown>> = resolutionRaw().buckets.map((b) => ({ ...b }))
    future[3] = { start: '2026-09-21', closedCount: 0, medianDays: null, p75Days: null }
    expect(parse(resolutionRaw({ buckets: future }))).toThrow(/Solucionados/)
  })

  it('rechaza otra geometría (cantidad u orden de buckets)', () => {
    const buckets = resolutionRaw().buckets
    expect(parse(resolutionRaw({ buckets: buckets.slice(0, 3) }))).toThrow(/geometría/)
    expect(parse(resolutionRaw({ buckets: [buckets[1], buckets[0], buckets[2], buckets[3]] }))).toThrow(
      /start/,
    )
  })

  it('rechaza mediana 0 sin cierres, mediana sin cierres y P75 < mediana', () => {
    const zero: Array<Record<string, unknown>> = resolutionRaw().buckets.map((b) => ({ ...b }))
    zero[1] = { ...zero[1], medianDays: 0, p75Days: 0 }
    expect(parse(resolutionRaw({ buckets: zero }))).toThrow(/solo cuando hay cierres/)
    expect(parse(resolutionRaw({ p75Days: 2 }))).toThrow(/P75/)
    expect(parse(resolutionRaw({ medianDays: -1 }))).toThrow(OperationalKpiContractError)
  })

  it('rechaza rangos fuera de orden, incompletos o que no suman closedCount', () => {
    const dist = resolutionRaw().distribution
    expect(parse(resolutionRaw({ distribution: dist.slice(0, 5) }))).toThrow(/seis rangos/)
    expect(parse(resolutionRaw({ distribution: [dist[1], dist[0], ...dist.slice(2)] }))).toThrow(
      /en orden/,
    )
    const wrongSum = dist.map((b, i) => (i === 0 ? { ...b, count: 2 } : b))
    expect(parse(resolutionRaw({ distribution: wrongSum }))).toThrow(/distribution no suma/)
    expect(parse(resolutionRaw({ closedCount: 7 }))).toThrow(/no suma/)
  })
})
