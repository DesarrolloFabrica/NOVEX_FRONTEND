import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSituations } from '@/modules/api/situations.api'
import { loadImpactNetworkSituations } from '@/modules/impact-network/services/impact-network-situations.service'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

vi.mock('@/modules/api/situations.api', () => ({
  fetchSituations: vi.fn(),
}))

const fetchSituationsMock = vi.mocked(fetchSituations)

function situation(id: string): SituationResponse {
  return {
    id,
    title: `Situación ${id}`,
    description: 'Contexto operacional de prueba.',
    coordinationId: 'coord-uno',
    coordinationCode: 'coord-uno',
    coordinationName: 'Coordinación Uno',
    createdByUserId: 'user-1',
    createdByUserName: 'Usuario',
    categoryId: 'category-1',
    categoryCode: 'PLATFORM',
    categoryName: 'Plataformas',
    severity: 'HIGH',
    status: 'OPEN',
    occurredAt: '2026-08-18T11:00:00.000Z',
    createdAt: '2026-08-18T11:00:00.000Z',
    updatedAt: '2026-08-18T11:00:00.000Z',
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('loadImpactNetworkSituations', () => {
  it('carga todas las páginas antes de construir el inventario institucional', async () => {
    fetchSituationsMock
      .mockResolvedValueOnce({
        items: [situation('page-1')],
        total: 201,
        page: 1,
        limit: 100,
      })
      .mockResolvedValueOnce({
        items: [situation('page-2')],
        total: 201,
        page: 2,
        limit: 100,
      })
      .mockResolvedValueOnce({
        items: [situation('page-3')],
        total: 201,
        page: 3,
        limit: 100,
      })

    const result = await loadImpactNetworkSituations()

    expect(fetchSituationsMock).toHaveBeenNthCalledWith(1, {
      limit: 100,
      page: 1,
    })
    expect(fetchSituationsMock).toHaveBeenNthCalledWith(2, {
      limit: 100,
      page: 2,
    })
    expect(fetchSituationsMock).toHaveBeenNthCalledWith(3, {
      limit: 100,
      page: 3,
    })
    expect(result.situations.map((item) => item.id)).toEqual([
      'page-1',
      'page-2',
      'page-3',
    ])
    expect(result.events).toHaveLength(3)
  })
})
