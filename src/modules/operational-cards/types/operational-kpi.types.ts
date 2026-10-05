import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Espejo del DTO backend `operational-kpi.dto.ts`.
 * El frontend no recalcula integridad ni vidas.
 */

export type OperationalKpiScopeType = 'direction' | 'coordination'

export interface OperationalKpiScope {
  type: OperationalKpiScopeType
  coordinationId?: string
}

export interface OperationalKpiUniverse {
  type: 'active-catalog'
  coordinationCount: number
}

export interface OperationalKpiMetricVersions {
  integrity: string
  lifePoints: string
}

export interface OperationalKpiStatusCounts {
  open: number
  inProgress: number
}

export interface OperationalKpiSeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
}

export interface OperationalKpiDependencies {
  incoming: number
  outgoing: number
}

export interface OperationalKpiProblemCounts {
  activeCount: number
  status: OperationalKpiStatusCounts
  severity: OperationalKpiSeverityCounts
}

export interface OperationalKpiCoordinationIdentity {
  id: string
  code: string
  name: string
  shortName: string
}

export interface OperationalKpiCoordinationSnapshot {
  coordination: OperationalKpiCoordinationIdentity
  problems: OperationalKpiProblemCounts
  dependencies: OperationalKpiDependencies
  integrityStatus: OperationalIntegrityStatus
  lifePoints: number | null
}

export interface OperationalKpiCoordinationStatusTotals {
  critical: number
  alert: number
  stable: number
  unknown: number
}

export interface OperationalKpiAnalystRegistry {
  integrityStatus: OperationalIntegrityStatus
  problems: OperationalKpiProblemCounts
}

export interface OperationalKpiDirectionSnapshot {
  directionStatus: OperationalIntegrityStatus
  problems: OperationalKpiProblemCounts
  dependencies: OperationalKpiDependencies
  coordinationStatusTotals: OperationalKpiCoordinationStatusTotals
  analystRegistry: OperationalKpiAnalystRegistry
  coordinations: OperationalKpiCoordinationSnapshot[]
}

export interface OperationalKpiDirectionResponse {
  scope: OperationalKpiScope
  generatedAt: string
  universe: OperationalKpiUniverse
  metricVersions: OperationalKpiMetricVersions
  direction: OperationalKpiDirectionSnapshot
}

export interface OperationalKpiCoordinationResponse {
  scope: OperationalKpiScope
  generatedAt: string
  universe: OperationalKpiUniverse
  metricVersions: OperationalKpiMetricVersions
  coordination: OperationalKpiCoordinationSnapshot
}

export type OperationalKpiHistoryMetric = 'backlog' | 'created' | 'closed'

export type OperationalKpiHistoryGranularity = 'week' | 'month' | 'cycle'

export interface OperationalKpiHistoryPoint {
  start: string
  end: string
  label: string
  value: number
}

export interface OperationalKpiHistoryResponse {
  scope: { type: 'coordination'; coordinationId: string }
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  range: { from: string; to: string }
  timezone: 'America/Bogota'
  series: OperationalKpiHistoryPoint[]
}

export type OperationalKpiDependencySide = 'commitment' | 'dependency'

export interface OperationalKpiHistoryQuery {
  coordinationId: string
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  from: string
  to: string
  categoryId?: string
  partnerCoordinationId?: string
  dependencySide?: OperationalKpiDependencySide
}

export interface OperationalKpiBreakdownCategory {
  id: string
  code: string
  name: string
  selectable: boolean
}

export interface OperationalKpiBreakdownItem {
  category: OperationalKpiBreakdownCategory
  value: number
}

export interface OperationalKpiBreakdownResponse {
  scope: { type: 'coordination'; coordinationId: string }
  dimension: 'category'
  metric: OperationalKpiHistoryMetric
  range: { from: string; to: string }
  timezone: 'America/Bogota'
  items: OperationalKpiBreakdownItem[]
}

export interface OperationalKpiBreakdownQuery {
  coordinationId: string
  metric: OperationalKpiHistoryMetric
  from: string
  to: string
}

export interface OperationalKpiRelationPartner {
  id: string
  code: string
  name: string
  shortName: string
}

export interface OperationalKpiRelationItem {
  coordination: OperationalKpiRelationPartner
  value: number
}

export interface OperationalKpiRelationsResponse {
  scope: { type: 'coordination'; coordinationId: string }
  metric: OperationalKpiHistoryMetric
  range: { from: string; to: string }
  timezone: 'America/Bogota'
  commitments: OperationalKpiRelationItem[]
  dependencies: OperationalKpiRelationItem[]
}

export interface OperationalKpiRelationsQuery {
  coordinationId: string
  metric: OperationalKpiHistoryMetric
  from: string
  to: string
}

/** @deprecated Preferir AnalysisPeriod con from/to. */
export type OperationalKpiAnalysisGranularity = OperationalKpiHistoryGranularity

export interface OperationalKpiPeriodRange {
  from: string
  to: string
  calendarEnd: string
  label: string
  incomplete: boolean
}

export interface OperationalKpiPeriodResponse {
  scope: { type: 'coordination'; coordinationId: string }
  granularity: string
  period: OperationalKpiPeriodRange
  timezone: 'America/Bogota'
  severity: OperationalKpiSeverityCounts
  attention: OperationalKpiStatusCounts
  relations: { dependencies: number; commitments: number }
  registeredCount: number
  severitySemantics: 'current-severity-of-period-registrations'
}

export interface OperationalKpiPeriodQuery {
  coordinationId: string
  from: string
  to: string
}

export type OperationalKpiEstadoPeriodKind = 'week' | 'month' | 'cycle'

export interface OperationalKpiStateQuery {
  coordinationId: string
  from: string
  to: string
  kind: OperationalKpiEstadoPeriodKind
  calendarEnd?: string
}

export interface OperationalKpiStateResponse {
  scope: { type: 'coordination'; coordinationId: string }
  timezone: 'America/Bogota'
  period: {
    kind: OperationalKpiEstadoPeriodKind
    from: string
    to: string
    calendarEnd: string
    label: string
    isCurrent: boolean
    isPartial: boolean
    dataTo: string
  }
  severity: OperationalKpiSeverityCounts
  attention: OperationalKpiStatusCounts
  relations: { dependencies: number; commitments: number }
  registeredCount: number
  severitySemantics: 'current-severity-of-period-registrations'
  evolution: {
    bucket: 'day' | 'week' | 'month'
    backlog: OperationalKpiHistoryPoint[]
    created: OperationalKpiHistoryPoint[]
    closed: OperationalKpiHistoryPoint[]
  }
}

/**
 * Fuente del badge de integridad en ESTADO.
 * Hoy solo 'live' (evaluateCoordinationIntegrity).
 * Futuro: 'period-close' vía integritySnapshotAt(date) o snapshots persistidos.
 */
export type IntegritySnapshotSource = 'live' | 'period-close'
