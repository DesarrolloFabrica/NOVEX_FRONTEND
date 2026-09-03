import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

const fetchSituations = vi.fn()

vi.mock('@/modules/api/situations.api', () => ({
  fetchSituations: (...args: unknown[]) => fetchSituations(...args),
}))

const {
  buildCoordinationSummary,
  fetchCoordinationProblems,
} = await import(
  '@/modules/operational-cards/services/coordination-problems.service'
)

const COORDINATION_UUID = '00000000-0000-4000-8000-000000000007'

function situation(overrides: Partial<SituationResponse>): SituationResponse {
  return {
    id: 'sit-1',
    title: 'Situación',
    description: '',
    coordinationId: COORDINATION_UUID,
    coordinationCode: 'coord-ingenierias',
    coordinationName: 'Ingenierías',
    createdByUserId: 'user',
    createdByUserName: 'User',
    categoryId: 'cat',
    categoryCode: 'CAT',
    categoryName: 'Categoría',
    severity: 'MEDIUM',
    status: 'OPEN',
    occurredAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  } as SituationResponse
}

function page(items: SituationResponse[]) {
  return { items, total: items.length, page: 1, limit: 100 }
}

beforeEach(() => {
  fetchSituations.mockReset()
})

describe('fetchCoordinationProblems · peticiones', () => {
  it('hace exactamente 2 peticiones: OPEN e IN_PROGRESS', async () => {
    fetchSituations.mockResolvedValue(page([]))

    await fetchCoordinationProblems(COORDINATION_UUID)

    expect(fetchSituations).toHaveBeenCalledTimes(2)
    const statuses = fetchSituations.mock.calls.map(
      (call) => (call[0] as { status: string }).status,
    )
    expect(statuses.sort()).toEqual(['IN_PROGRESS', 'OPEN'])
  })

  it('filtra por el UUID de la coordinación, nunca por el code', async () => {
    fetchSituations.mockResolvedValue(page([]))

    await fetchCoordinationProblems(COORDINATION_UUID)

    for (const call of fetchSituations.mock.calls) {
      const query = call[0] as { coordinationId: string }
      expect(query.coordinationId).toBe(COORDINATION_UUID)
      expect(query.coordinationId).not.toMatch(/^coord-/)
    }
  })

  it('nunca pide CLOSED ni RESOLVED', async () => {
    fetchSituations.mockResolvedValue(page([]))

    await fetchCoordinationProblems(COORDINATION_UUID)

    const statuses = fetchSituations.mock.calls.map(
      (call) => (call[0] as { status: string }).status,
    )
    expect(statuses).not.toContain('CLOSED')
    expect(statuses).not.toContain('RESOLVED')
  })

  it('nunca pide la lista global sin filtro', async () => {
    fetchSituations.mockResolvedValue(page([]))

    await fetchCoordinationProblems(COORDINATION_UUID)

    for (const call of fetchSituations.mock.calls) {
      const query = call[0] as Record<string, unknown>
      expect(query.coordinationId).toBeTruthy()
      expect(query.status).toBeTruthy()
    }
  })
})

describe('fetchCoordinationProblems · resultado', () => {
  it('combina las dos páginas y ordena por prioridad', async () => {
    fetchSituations.mockImplementation((query: { status: string }) =>
      Promise.resolve(
        query.status === 'OPEN'
          ? page([
              situation({ id: 'baja', severity: 'LOW', status: 'OPEN' }),
              situation({ id: 'critica', severity: 'CRITICAL', status: 'OPEN' }),
            ])
          : page([
              situation({
                id: 'alta',
                severity: 'HIGH',
                status: 'IN_PROGRESS',
              }),
            ]),
      ),
    )

    const problems = await fetchCoordinationProblems(COORDINATION_UUID)

    expect(problems.map((item) => item.id)).toEqual(['critica', 'alta', 'baja'])
  })

  it('descarta cualquier estado no activo que llegara del servidor', async () => {
    fetchSituations.mockImplementation((query: { status: string }) =>
      Promise.resolve(
        query.status === 'OPEN'
          ? page([
              situation({ id: 'activa', status: 'OPEN' }),
              situation({ id: 'cerrada', status: 'CLOSED' }),
              situation({ id: 'resuelta', status: 'RESOLVED' }),
            ])
          : page([]),
      ),
    )

    const problems = await fetchCoordinationProblems(COORDINATION_UUID)

    expect(problems.map((item) => item.id)).toEqual(['activa'])
  })

  it('conserva solo los campos que la carta necesita', async () => {
    fetchSituations.mockImplementation((query: { status: string }) =>
      Promise.resolve(
        query.status === 'OPEN'
          ? page([
              situation({
                id: 'sit',
                severity: 'HIGH',
                slaHealth: 'overdue',
                relatedCoordinations: [
                  { id: 'r1', coordinationId: 'x', coordinationCode: 'X', coordinationName: 'X' },
                ] as never,
              }),
            ])
          : page([]),
      ),
    )

    const [problem] = await fetchCoordinationProblems(COORDINATION_UUID)

    expect(Object.keys(problem).sort()).toEqual([
      'affectedCoordinationCount',
      'createdAt',
      'id',
      'severity',
      'slaHealth',
      'status',
      'title',
    ])
    expect(problem.affectedCoordinationCount).toBe(1)
  })

  it('una coordinación sin problemas activos devuelve lista vacía', async () => {
    fetchSituations.mockResolvedValue(page([]))
    await expect(fetchCoordinationProblems(COORDINATION_UUID)).resolves.toEqual(
      [],
    )
  })
})

describe('buildCoordinationSummary', () => {
  it('sin problemas activos no emite frase: la carta ya dice Todo bajo control', () => {
    expect(
      buildCoordinationSummary({
        activeProblemsCount: 0,
        criticalCount: 0,
        affectedCoordinationCount: 0,
      }),
    ).toBeNull()
  })

  it('compone la frase con conteos, críticos e impacto', () => {
    expect(
      buildCoordinationSummary({
        activeProblemsCount: 3,
        criticalCount: 1,
        affectedCoordinationCount: 2,
      }),
    ).toBe('3 problemas activos · 1 crítico · afecta 2 áreas')
  })

  it('omite lo que no aplica y usa singular cuando toca', () => {
    expect(
      buildCoordinationSummary({
        activeProblemsCount: 1,
        criticalCount: 0,
        affectedCoordinationCount: 1,
      }),
    ).toBe('1 problema activo · afecta 1 área')
  })

  it('sin impacto no menciona áreas', () => {
    expect(
      buildCoordinationSummary({
        activeProblemsCount: 4,
        criticalCount: 2,
        affectedCoordinationCount: 0,
      }),
    ).toBe('4 problemas activos · 2 críticos')
  })
})
