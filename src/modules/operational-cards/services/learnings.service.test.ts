import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchLearningItems,
  fetchLearningsSummary,
  parseLearningItemsPage,
  parseLearningsSummary,
} from '@/modules/operational-cards/services/learnings.service'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import { LEARNINGS_UNCATEGORIZED_ID } from '@/modules/operational-cards/types/learnings.types'
import { apiRequest } from '@/shared/api/http'

vi.mock('@/shared/api/http', () => ({
  apiRequest: vi.fn(),
}))

const mockedApi = vi.mocked(apiRequest)

const period = {
  kind: 'week',
  from: '2026-09-28',
  to: '2026-10-04',
  calendarEnd: '2026-10-04',
  dataTo: '2026-10-04',
  isCurrent: false,
  isPartial: false,
  cutAt: '2026-10-05T05:00:00.000Z',
}

const summaryPayload = (over: Record<string, unknown> = {}) => ({
  scope: { type: 'coordination', coordinationId: 'coord-1' },
  timezone: 'America/Bogota',
  period,
  closedCount: 5,
  learningCount: 4,
  withoutLearningCount: 1,
  coverage: 80,
  categories: [
    { id: 'cat-net', code: 'internet', name: 'Internet', selectable: true, count: 3 },
    { id: LEARNINGS_UNCATEGORIZED_ID, code: 'UNCATEGORIZED', name: 'Sin categoría', selectable: false, count: 1 },
  ],
  ...over,
})

const item = (over: Record<string, unknown> = {}) => ({
  situationId: 'p-1',
  title: 'Caída de notas',
  reportKind: 'INTERNAL',
  category: { id: 'cat-net', code: 'internet', name: 'Internet', selectable: true },
  closedAt: '2026-10-02T19:00:00.000Z',
  resolvedAt: '2026-10-02T19:00:00.000Z',
  recordedAt: '2026-10-02T19:00:00.100Z',
  resolvedByName: 'Coordinadora',
  learningExcerpt: 'Se documentó el rollback.',
  learningTruncated: false,
  learningLength: 25,
  ...over,
})

const weekQuery = { kind: 'week' as const, from: '2026-09-28', to: '2026-10-04', calendarEnd: '2026-10-04' }

describe('learnings.service', () => {
  beforeEach(() => mockedApi.mockReset())

  it('resumen: pide la coordinación y el periodo exactos del AnalysisPeriod', async () => {
    mockedApi.mockResolvedValue(summaryPayload())
    const summary = await fetchLearningsSummary({ coordinationId: 'coord-1', period: weekQuery })
    const url = new URL(`http://x${mockedApi.mock.calls[0][0] as string}`)
    expect(url.pathname).toBe('/operational-kpis/learnings')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      scope: 'coordination',
      coordinationId: 'coord-1',
      from: '2026-09-28',
      to: '2026-10-04',
      kind: 'week',
      calendarEnd: '2026-10-04',
    })
    expect(summary).toMatchObject({ closedCount: 5, learningCount: 4, coverage: 80 })
  })

  it('fichas: página, límite y categoría (incluido «Sin categoría») viajan al servidor', async () => {
    mockedApi.mockResolvedValue({
      scope: { type: 'coordination', coordinationId: 'coord-1' },
      period,
      categoryId: LEARNINGS_UNCATEGORIZED_ID,
      total: 1,
      page: 2,
      limit: 20,
      items: [item()],
    })
    await fetchLearningItems({
      coordinationId: 'coord-1',
      period: weekQuery,
      categoryId: LEARNINGS_UNCATEGORIZED_ID,
      page: 2,
    })
    const url = new URL(`http://x${mockedApi.mock.calls[0][0] as string}`)
    expect(url.pathname).toBe('/operational-kpis/learnings/items')
    expect(url.searchParams.get('categoryId')).toBe(LEARNINGS_UNCATEGORIZED_ID)
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('limit')).toBe('20')
  })

  it('sin categoría no envía categoryId', async () => {
    mockedApi.mockResolvedValue({
      scope: { type: 'coordination', coordinationId: 'coord-1' },
      period,
      categoryId: null,
      total: 0,
      page: 1,
      limit: 20,
      items: [],
    })
    await fetchLearningItems({ coordinationId: 'coord-1', period: weekQuery, categoryId: null, page: 1 })
    const url = new URL(`http://x${mockedApi.mock.calls[0][0] as string}`)
    expect(url.searchParams.has('categoryId')).toBe(false)
  })

  it('sin cierres: cobertura null es válida; un porcentaje inventado no', () => {
    const empty = { closedCount: 0, learningCount: 0, withoutLearningCount: 0, categories: [] }
    expect(parseLearningsSummary(summaryPayload({ ...empty, coverage: null })).coverage).toBeNull()
    expect(() => parseLearningsSummary(summaryPayload({ ...empty, coverage: 0 }))).toThrow(
      OperationalKpiContractError,
    )
  })

  it('rechaza cifras que no cuadran (categorías, cierres, aprendizajes > cierres)', () => {
    expect(() =>
      parseLearningsSummary(summaryPayload({ categories: [] })),
    ).toThrow(/no suman/)
    expect(() =>
      parseLearningsSummary(summaryPayload({ withoutLearningCount: 3 })),
    ).toThrow(/no cuadra/)
    expect(() =>
      parseLearningsSummary(
        summaryPayload({ closedCount: 3, learningCount: 4, withoutLearningCount: 0 }),
      ),
    ).toThrow(/supera/)
  })

  it('una ficha sin aprendizaje no se acepta como ficha', () => {
    expect(() =>
      parseLearningItemsPage({
        scope: { type: 'coordination', coordinationId: 'coord-1' },
        period,
        categoryId: null,
        total: 1,
        page: 1,
        limit: 20,
        items: [item({ learningExcerpt: '  ' })],
      }),
    ).toThrow(/vacío/)
  })

  it('conserva closedAt, resolvedAt y recordedAt por separado', () => {
    const page = parseLearningItemsPage({
      scope: { type: 'coordination', coordinationId: 'coord-1' },
      period,
      categoryId: null,
      total: 1,
      page: 1,
      limit: 20,
      items: [item({ resolvedAt: '2026-09-30T12:00:00.000Z', reportKind: 'INTER_COORDINATION' })],
    })
    expect(page.items[0]).toMatchObject({
      closedAt: '2026-10-02T19:00:00.000Z',
      resolvedAt: '2026-09-30T12:00:00.000Z',
      recordedAt: '2026-10-02T19:00:00.100Z',
      reportKind: 'INTER_COORDINATION',
    })
  })
})
