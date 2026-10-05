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
      severity: { low: 1, medium: 3, high: 2, critical: 0 },
      attention: { open: 4, inProgress: 2 },
      relations: { dependencies: 1, commitments: 0 },
      registeredCount: 6,
      severitySemantics: 'current-severity-of-period-registrations',
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
      },
    }
    expect(parseOperationalKpiStateResponse(statePayload).evolution.bucket).toBe(
      'day',
    )
    mockedApi.mockResolvedValue(statePayload)
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
