import type { SituationRegistryRow } from '@/modules/api/types/situation-registry.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export type RegistryStatusFilter = 'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type RegistrySeverityFilter = 'all' | SituationSeverity
export type RegistryDateFilter = 'all' | 'today' | '7d' | '30d'
export type RegistrySortOrder =
  | 'date-desc'
  | 'date-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'risk-desc'
  | 'risk-asc'
  | 'severity-desc'
  | 'severity-asc'
  | 'title-asc'

export interface SituationRegistryQuery {
  search: string
  status: RegistryStatusFilter
  coordinationId: string
  categoryId: string
  severity: RegistrySeverityFilter
  date: RegistryDateFilter
  sort: RegistrySortOrder
}

export const DEFAULT_SITUATION_REGISTRY_QUERY: SituationRegistryQuery = {
  search: '',
  status: 'all',
  coordinationId: 'all',
  categoryId: 'all',
  severity: 'all',
  date: 'all',
  sort: 'date-desc',
}

const SEVERITY_WEIGHT: Record<SituationSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function matchesSearch(row: SituationRegistryRow, search: string): boolean {
  const query = normalize(search.trim())
  if (!query) return true

  const haystack = normalize(
    [
      row.code,
      row.title,
      row.coordinationName,
      row.coordinationCode,
      row.categoryName,
      row.categoryCode,
      row.createdByUserName,
      row.status,
      row.severity,
    ].join(' '),
  )

  return haystack.includes(query)
}

function matchesDate(row: SituationRegistryRow, dateFilter: RegistryDateFilter): boolean {
  if (dateFilter === 'all') return true

  const occurred = new Date(row.occurredAt).getTime()
  if (Number.isNaN(occurred)) return false

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  if (dateFilter === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return occurred >= start.getTime()
  }

  if (dateFilter === '7d') return now - occurred <= 7 * dayMs
  if (dateFilter === '30d') return now - occurred <= 30 * dayMs

  return true
}

export function filterAndSortSituationRegistry(
  rows: SituationRegistryRow[],
  query: SituationRegistryQuery,
): SituationRegistryRow[] {
  const filtered = rows.filter((row) => {
    if (!matchesSearch(row, query.search)) return false
    if (query.status !== 'all' && row.status !== query.status) return false
    if (
      query.coordinationId !== 'all' &&
      row.coordinationId !== query.coordinationId
    ) {
      return false
    }
    if (query.categoryId !== 'all' && row.categoryId !== query.categoryId) {
      return false
    }
    if (query.severity !== 'all' && row.severity !== query.severity) {
      return false
    }
    if (!matchesDate(row, query.date)) return false
    return true
  })

  return [...filtered].sort((left, right) => {
    switch (query.sort) {
      case 'date-asc':
        return left.occurredAt.localeCompare(right.occurredAt)
      case 'date-desc':
        return right.occurredAt.localeCompare(left.occurredAt)
      case 'updated-asc':
        return left.updatedAt.localeCompare(right.updatedAt)
      case 'updated-desc':
        return right.updatedAt.localeCompare(left.updatedAt)
      case 'risk-asc':
        return (left.riskScore ?? -1) - (right.riskScore ?? -1)
      case 'risk-desc':
        return (right.riskScore ?? -1) - (left.riskScore ?? -1)
      case 'severity-asc':
        return (
          (SEVERITY_WEIGHT[left.severity] ?? 0) -
          (SEVERITY_WEIGHT[right.severity] ?? 0)
        )
      case 'severity-desc':
        return (
          (SEVERITY_WEIGHT[right.severity] ?? 0) -
          (SEVERITY_WEIGHT[left.severity] ?? 0)
        )
      case 'title-asc':
        return left.title.localeCompare(right.title, 'es')
      default:
        return 0
    }
  })
}
