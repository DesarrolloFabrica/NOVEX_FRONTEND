// Capa: utilidades — filtrado, búsqueda y ordenamiento del Centro de Eventos.
// Funciones puras; sin React.

import type {
  OperationalEvent,
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export type EventStatusFilter = 'all' | OperationalEventStatus
export type EventRiskFilter = 'all' | RiskLevel
export type EventSortOrder =
  | 'date-desc'
  | 'date-asc'
  | 'risk-desc'
  | 'risk-asc'
  | 'impact-desc'
  | 'impact-asc'
  | 'title-asc'

/** Criterios de consulta de la consola del Centro de Eventos. */
export interface EventListQuery {
  search: string
  status: EventStatusFilter
  risk: EventRiskFilter
  categoryId: string
  areaId: string
  sort: EventSortOrder
}

export const DEFAULT_EVENT_LIST_QUERY: EventListQuery = {
  search: '',
  status: 'all',
  risk: 'all',
  categoryId: 'all',
  areaId: 'all',
  sort: 'date-desc',
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function matchesSearch(event: OperationalEvent, search: string): boolean {
  const q = normalize(search.trim())
  if (!q) return true
  const haystack = normalize(
    [
      event.title,
      event.description,
      event.sourceAreaName,
      event.observations ?? '',
      event.interpretation?.categoryName ?? '',
      event.interpretation?.executiveSummary ?? '',
      ...(event.interpretation?.affectedAreaNames ?? []),
    ].join(' '),
  )
  return haystack.includes(q)
}

function matchesArea(event: OperationalEvent, areaId: string): boolean {
  if (areaId === 'all') return true
  if (event.sourceAreaId === areaId) return true
  return event.interpretation?.affectedAreaIds.includes(areaId) === true
}

function riskScore(event: OperationalEvent): number {
  return event.interpretation?.riskScore ?? -1
}

function impactSeverity(event: OperationalEvent): number {
  return event.interpretation?.impactSeverity ?? -1
}

/**
 * Filtra y ordena eventos según la consulta de la consola.
 * No muta la colección original.
 */
export function filterAndSortEvents(
  events: OperationalEvent[],
  query: EventListQuery,
): OperationalEvent[] {
  const filtered = events.filter((event) => {
    if (!matchesSearch(event, query.search)) return false
    if (query.status !== 'all' && event.status !== query.status) return false
    if (
      query.risk !== 'all' &&
      event.interpretation?.riskLevel !== query.risk
    ) {
      return false
    }
    if (
      query.categoryId !== 'all' &&
      event.interpretation?.categoryId !== query.categoryId
    ) {
      return false
    }
    if (!matchesArea(event, query.areaId)) return false
    return true
  })

  return [...filtered].sort((a, b) => {
    switch (query.sort) {
      case 'date-asc':
        return a.reportedAt.localeCompare(b.reportedAt)
      case 'date-desc':
        return b.reportedAt.localeCompare(a.reportedAt)
      case 'risk-asc':
        return riskScore(a) - riskScore(b)
      case 'risk-desc':
        return riskScore(b) - riskScore(a)
      case 'impact-asc':
        return impactSeverity(a) - impactSeverity(b)
      case 'impact-desc':
        return impactSeverity(b) - impactSeverity(a)
      case 'title-asc':
        return a.title.localeCompare(b.title, 'es')
      default:
        return 0
    }
  })
}
