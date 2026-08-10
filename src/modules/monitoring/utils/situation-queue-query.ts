import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export type SituationQueueStatusFilter =
  | 'ACTIVE'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'ALL'

export type SituationQueueSeverityFilter = SituationSeverity | 'ALL' | 'PRIORITY'

export interface SituationQueueQuery {
  search: string
  status: SituationQueueStatusFilter
  severity: SituationQueueSeverityFilter
  page: number
  pageSize: number
}

export const DEFAULT_SITUATION_QUEUE_QUERY: SituationQueueQuery = {
  search: '',
  status: 'ACTIVE',
  severity: 'ALL',
  page: 1,
  pageSize: 15,
}

export const SITUATION_QUEUE_PAGE_SIZES = [8, 15, 25] as const

function matchesStatusFilter(
  situation: SituationListItem,
  status: SituationQueueStatusFilter,
): boolean {
  if (status === 'ALL') return true
  if (status === 'ACTIVE') return situation.status !== 'CLOSED'
  if (status === 'IN_PROGRESS') {
    return situation.status === 'IN_PROGRESS' || situation.status === 'RESOLVED'
  }
  return situation.status === status
}

export function filterSituationsForQueue(
  situations: readonly SituationListItem[],
  query: SituationQueueQuery,
): SituationListItem[] {
  const needle = query.search.trim().toLocaleLowerCase('es-CO')

  return situations.filter((situation) => {
    if (!matchesStatusFilter(situation, query.status)) {
      return false
    }

    if (query.severity === 'PRIORITY') {
      if (situation.severity !== 'CRITICAL' && situation.severity !== 'HIGH') {
        return false
      }
    } else if (query.severity !== 'ALL' && situation.severity !== query.severity) {
      return false
    }

    if (!needle) return true

    return (
      situation.title.toLocaleLowerCase('es-CO').includes(needle) ||
      situation.coordinationName.toLocaleLowerCase('es-CO').includes(needle) ||
      situation.categoryName.toLocaleLowerCase('es-CO').includes(needle)
    )
  })
}

export function paginateSituations(
  situations: readonly SituationListItem[],
  query: SituationQueueQuery,
): {
  items: SituationListItem[]
  totalFiltered: number
  totalPages: number
  page: number
} {
  const totalFiltered = situations.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / query.pageSize))
  const page = Math.min(Math.max(1, query.page), totalPages)
  const start = (page - 1) * query.pageSize

  return {
    items: situations.slice(start, start + query.pageSize),
    totalFiltered,
    totalPages,
    page,
  }
}
