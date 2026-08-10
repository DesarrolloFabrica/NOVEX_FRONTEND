import { describe, expect, it } from 'vitest'
import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import {
  DEFAULT_SITUATION_QUEUE_QUERY,
  filterSituationsForQueue,
  paginateSituations,
} from './situation-queue-query'

function item(
  partial: Partial<SituationListItem> & Pick<SituationListItem, 'id' | 'title'>,
): SituationListItem {
  return {
    coordinationName: 'Servicios',
    coordinationCode: 'SRV',
    categoryName: 'Operación',
    severity: 'MEDIUM',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    occurredAt: '2026-01-01T00:00:00.000Z',
    createdByUserName: 'Ana',
    assignedUserName: null,
    ...partial,
  }
}

const sample: SituationListItem[] = [
  item({ id: '1', title: 'Falla eléctrica', status: 'OPEN', severity: 'CRITICAL' }),
  item({
    id: '2',
    title: 'Retraso académico',
    status: 'IN_PROGRESS',
    severity: 'HIGH',
    coordinationName: 'Académicas',
  }),
  item({
    id: '3',
    title: 'Caso legado resuelto',
    status: 'RESOLVED',
    severity: 'LOW',
  }),
  item({ id: '4', title: 'Caso cerrado', status: 'CLOSED', severity: 'MEDIUM' }),
]

describe('filterSituationsForQueue', () => {
  it('por defecto muestra sin cerrar (incluye RESOLVED legado)', () => {
    const filtered = filterSituationsForQueue(sample, DEFAULT_SITUATION_QUEUE_QUERY)
    expect(filtered.map((row) => row.id)).toEqual(['1', '2', '3'])
  })

  it('filtra por búsqueda textual', () => {
    const filtered = filterSituationsForQueue(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      status: 'ALL',
      search: 'académicas',
    })
    expect(filtered.map((row) => row.id)).toEqual(['2'])
  })

  it('filtra atención prioritaria (crítica/alta) sin cerrar', () => {
    const filtered = filterSituationsForQueue(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      severity: 'PRIORITY',
    })
    expect(filtered.map((row) => row.id)).toEqual(['1', '2'])
  })

  it('filtra En atención incluyendo RESOLVED legado', () => {
    const filtered = filterSituationsForQueue(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      status: 'IN_PROGRESS',
      severity: 'ALL',
    })
    expect(filtered.map((row) => row.id)).toEqual(['2', '3'])
  })

  it('filtra solo cerradas', () => {
    const filtered = filterSituationsForQueue(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      status: 'CLOSED',
      severity: 'ALL',
    })
    expect(filtered.map((row) => row.id)).toEqual(['4'])
  })
})

describe('paginateSituations', () => {
  it('pagina y reporta totales', () => {
    const page = paginateSituations(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      status: 'ALL',
      page: 2,
      pageSize: 2,
    })

    expect(page.totalFiltered).toBe(4)
    expect(page.totalPages).toBe(2)
    expect(page.page).toBe(2)
    expect(page.items.map((row) => row.id)).toEqual(['3', '4'])
  })

  it('corrige página fuera de rango', () => {
    const page = paginateSituations(sample, {
      ...DEFAULT_SITUATION_QUEUE_QUERY,
      status: 'ALL',
      page: 99,
      pageSize: 10,
    })
    expect(page.page).toBe(1)
    expect(page.items).toHaveLength(4)
  })
})
