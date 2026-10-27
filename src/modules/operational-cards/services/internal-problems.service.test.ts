import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchInternalProblems,
  fetchInternalRecurrence,
  parseInternalProblemsResponse,
  parseInternalRecurrenceResponse,
} from '@/modules/operational-cards/services/internal-problems.service'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import { apiRequest } from '@/shared/api/http'

vi.mock('@/shared/api/http', () => ({
  apiRequest: vi.fn(),
}))

const mockedApi = vi.mocked(apiRequest)

const period = {
  kind: 'cycle',
  from: '2026-07-01',
  to: '2026-10-07',
  calendarEnd: '2026-12-31',
  dataTo: '2026-10-07',
  isCurrent: true,
  isPartial: true,
  cutAt: '2026-10-08T05:00:00.000Z',
}

const problemsPayload = {
  scope: { type: 'coordination', coordinationId: 'coord-1' },
  timezone: 'America/Bogota',
  period,
  total: 1,
  truncated: false,
  items: [
    {
      id: 'sit-a',
      title: 'Intermitencia prolongada de internet en el estudio',
      category: { id: 'cat', code: 'INTERNET', name: 'Internet' },
      createdAt: '2026-09-29T14:10:00.000Z',
      createdByName: 'Johan Daza',
      ageDays: 8,
      statusAtCut: 'IN_PROGRESS',
      reportedSeverity: 'MEDIUM',
      severityAtCut: 'CRITICAL',
      consequenceCountAtCut: 5,
      latestConsequence: {
        occurredAt: '2026-10-06T21:30:00.000Z',
        createdAt: '2026-10-06T21:50:00.000Z',
        preview: 'Se reprogramó la entrega.',
        truncated: false,
      },
      dueAt: '2026-10-06T14:10:00.000Z',
      slaAtCut: 'overdue',
      historyReliable: true,
      consequenceTimeline: [
        {
          id: 'c1',
          occurredAt: '2026-10-06T21:30:00+00:00',
          createdAt: '2026-10-06T21:50:00+00:00',
          preview: 'Se reprogramó la entrega.',
          truncated: false,
          severityAtOccurrence: 'CRITICAL',
        },
      ],
    },
  ],
}

const bucket = (start: string, end: string, total: number | null) => ({
  start,
  end,
  calendarStart: start,
  calendarEnd: end,
  dataEnd: total === null ? null : end,
  label: start,
  current: false,
  future: total === null,
  total,
})

const recurrencePayload = {
  scope: { type: 'coordination', coordinationId: 'coord-1' },
  timezone: 'America/Bogota',
  period,
  bucket: 'month',
  buckets: [bucket('2026-09-01', '2026-09-30', 4), bucket('2026-11-01', '2026-11-30', null)],
  eligibleBuckets: 1,
  total: 4,
  categories: [
    { id: 'i', code: 'INTERNET', name: 'Internet', selectable: true, totalCreated: 4, bucketsWithOccurrences: 1, values: [4, null] },
  ],
}

beforeEach(() => {
  mockedApi.mockReset()
})

describe('internal-problems.service', () => {
  it('parsea afectaciones activas (sin historiales ni vista de cerrados)', () => {
    const parsed = parseInternalProblemsResponse(problemsPayload)
    expect(parsed.total).toBe(1)
    expect(parsed.items[0]).toMatchObject({ severityAtCut: 'CRITICAL', consequenceCountAtCut: 5, ageDays: 8 })
    expect(parsed.items[0].consequenceTimeline).toEqual([
      expect.objectContaining({ id: 'c1', severityAtOccurrence: 'CRITICAL' }),
    ])
    expect(parsed.items[0]).not.toHaveProperty('severityHistory')
    expect(parsed.items[0]).not.toHaveProperty('consequences')
    expect(parsed).not.toHaveProperty('view')
  })

  it('rechaza afectaciones rotas', () => {
    const bad = structuredClone(problemsPayload)
    bad.items[0].slaAtCut = 'closed_on_time'
    expect(() => parseInternalProblemsResponse(bad)).toThrow(OperationalKpiContractError)
    expect(() => parseInternalProblemsResponse({ ...problemsPayload, total: 3 })).toThrow(OperationalKpiContractError)
  })

  it('parsea recurrencia: buckets, futuros null, categorías alineadas', () => {
    const parsed = parseInternalRecurrenceResponse(recurrencePayload)
    expect(parsed.bucket).toBe('month')
    expect(parsed.buckets[1]).toMatchObject({ future: true, total: null })
    expect(parsed.categories[0].values).toEqual([4, null])
  })

  it('rechaza recurrencia incoherente (0 falso en futuro, total ≠ Σ, desalineada)', () => {
    const fakeZero = structuredClone(recurrencePayload)
    fakeZero.categories[0].values = [4, 0]
    expect(() => parseInternalRecurrenceResponse(fakeZero)).toThrow(OperationalKpiContractError)
    expect(() => parseInternalRecurrenceResponse({ ...recurrencePayload, total: 9 })).toThrow(OperationalKpiContractError)
    const misaligned = structuredClone(recurrencePayload)
    misaligned.categories[0].values = [4]
    expect(() => parseInternalRecurrenceResponse(misaligned)).toThrow(OperationalKpiContractError)
  })

  it('piden el periodo común (from · to · kind · calendarEnd) a cada endpoint', async () => {
    mockedApi.mockResolvedValueOnce(problemsPayload).mockResolvedValueOnce(recurrencePayload)
    const query = {
      coordinationId: 'coord-1',
      period: { kind: 'month' as const, from: '2026-09-01', to: '2026-09-30', calendarEnd: '2026-09-30' },
    }
    await fetchInternalProblems(query)
    await fetchInternalRecurrence(query)
    const [first, second] = mockedApi.mock.calls.map(([path]) => String(path))
    expect(first).toMatch(/^\/operational-kpis\/internal-problems\?/)
    expect(second).toMatch(/^\/operational-kpis\/internal-recurrence\?/)
    expect(Object.fromEntries(new URLSearchParams(second.split('?')[1]))).toEqual({
      scope: 'coordination',
      coordinationId: 'coord-1',
      from: '2026-09-01',
      to: '2026-09-30',
      kind: 'month',
      calendarEnd: '2026-09-30',
    })
  })
})
