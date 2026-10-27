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

/** /history en modo AnalysisPeriod: mismo contrato temporal que /state. */
export interface OperationalKpiPeriodHistoryQuery {
  coordinationId: string
  metric: OperationalKpiHistoryMetric
  kind: OperationalKpiEstadoPeriodKind
  from: string
  to: string
  calendarEnd: string
  categoryId?: string
  partnerCoordinationId?: string
  dependencySide?: OperationalKpiDependencySide
}

export interface OperationalKpiPeriodHistoryResponse {
  scope: { type: 'coordination'; coordinationId: string }
  metric: OperationalKpiHistoryMetric
  period: {
    kind: OperationalKpiEstadoPeriodKind
    from: string
    dataTo: string
    calendarEnd: string
    bucket: 'day' | 'week' | 'month'
  }
  timezone: 'America/Bogota'
  series: OperationalKpiHistoryPoint[]
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

/**
 * Casilla del FLUJO DE PROBLEMAS (cubre el periodo calendario completo).
 * created = REPORTADOS (evento), closed = SOLUCIONADOS (evento),
 * backlog = PENDIENTES al cierre de dataEnd (stock). Futuras: null.
 */
export interface OperationalKpiActiveCategory {
  categoryId: string
  categoryCode: string
  categoryName: string
  selectable: boolean
  count: number
}

/** Coordinación AFECTADA (no implica autoría de quien registró el caso). */
export interface OperationalKpiActiveCoordination {
  coordinationId: string | null
  coordinationCode: string | null
  coordinationName: string
  count: number
}

/** Stock al cierre del bucket de la coordinación responsable. */
export interface OperationalKpiActiveLoad {
  total: number
  internal: number
  external: number
  internalBreakdown: OperationalKpiActiveCategory[]
  externalBreakdown: OperationalKpiActiveCoordination[]
}

export interface OperationalKpiFlowBucket {
  /** Ventana del bucket dentro del periodo (1–4 oct en octubre). */
  start: string
  end: string
  /** Fin realmente contado (recortado a hoy). null si futura. */
  dataEnd: string | null
  /** Unidad completa para el drill-down (semana 28 sep – 4 oct). */
  calendarStart: string
  calendarEnd: string
  label: string
  current: boolean
  future: boolean
  created: number | null
  closed: number | null
  backlog: number | null
  /** Carga activa al cierre (stock). null si futura. */
  active: OperationalKpiActiveLoad | null
  /** Solucionados dentro del bucket (evento). null si futura. */
  solved: { total: number } | null
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
  relations: { dependencies: number; commitments: number }
  evolution: {
    bucket: 'day' | 'week' | 'month'
    backlog: OperationalKpiHistoryPoint[]
    created: OperationalKpiHistoryPoint[]
    closed: OperationalKpiHistoryPoint[]
    buckets: OperationalKpiFlowBucket[]
  }
  /** Pendientes al cierre del periodo (o ahora si está en curso). */
  activeAtPeriodEnd: { count: number; at: string; isNow: boolean }
  /** ANTIGÜEDAD · SNAPSHOT AT CUT · scope COORDINATION (misma población que Carga). */
  aging: OperationalKpiAging
  /** SNAPSHOT AT CUT · scope COORDINATION: Severidad + Atención de la población de Carga. */
  snapshot: OperationalKpiStateSnapshot
  /** RESOLUCIÓN · FLOW OUTCOME / TIME SERIES · scope COORDINATION (mismos cierres que Solucionados). */
  resolution: OperationalKpiResolution
}


/**
 * Atención de la población al corte, por status ACTUAL.
 * open + inProgress + closedAfterCut + unclassified = activeCount.
 */
export interface OperationalKpiSnapshotAttention {
  open: number
  inProgress: number
  /** Activos al corte que hoy ya están cerrados (solo en cortes históricos). */
  closedAfterCut: number
  /** Dato inconsistente: visible, nunca perdido. */
  unclassified: number
}

export interface OperationalKpiStateSnapshot {
  semantics: 'active-at-cut'
  /** Corte = period.dataTo (hoy si el periodo está en curso). */
  at: string
  isNow: boolean
  activeCount: number
  severity: OperationalKpiSeverityCounts
  attention: OperationalKpiSnapshotAttention
  /** exact: corte hoy · current-value: valor ACTUAL aplicado a la población histórica. */
  reliability: {
    severity: 'exact' | 'current-value'
    attention: 'exact' | 'current-value'
  }
}

export type OperationalKpiAgingBandKey = '0-7' | '8-14' | '15-30' | '31+'

/**
 * Problema activo al corte, en el ranking de ANTIGÜEDAD.
 * `ageDays` lo calcula el backend (Bogotá); la UI nunca lo recalcula.
 * `status` y `slaOverdue` son null cuando el corte es histórico.
 */
export interface OperationalKpiAgingItem {
  id: string
  title: string
  createdAt: string
  ageDays: number
  /** Severidad ACTUAL: información secundaria, no controla la barra. */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reportKind: 'INTERNAL' | 'INTER_COORDINATION'
  categoryName: string | null
  affectedCoordinationName: string | null
  status: 'OPEN' | 'IN_PROGRESS' | null
  slaOverdue: boolean | null
  closedAfterCutAt: string | null
}

/** Activos al corte (mismo universo que Carga), edad desde el registro. */
export interface OperationalKpiAging {
  semantics: 'active-at-cut-age-since-created'
  /** refDate = period.dataTo */
  at: string
  isNow: boolean
  reliability: {
    status: 'current' | 'unavailable'
    sla: 'current' | 'unavailable'
  }
  severitySemantics: 'current-severity'
  activeCount: number
  medianAgeDays: number | null
  /** Preparado para la futura distribución; aún no se renderiza. */
  bands: Array<{ key: OperationalKpiAgingBandKey; count: number }>
  /** Top 5 más antiguos: created_at ASC, id ASC. */
  oldest: OperationalKpiAgingItem[]
}

/**
 * Fuente del badge de integridad en ESTADO.
 * Hoy solo 'live' (evaluateCoordinationIntegrity).
 * Futuro: 'period-close' vía integritySnapshotAt(date) o snapshots persistidos.
 */
export type IntegritySnapshotSource = 'live' | 'period-close'

/** Rangos de TIEMPO HASTA SOLUCIÓN (semiabiertos, en horas exactas). */
export type OperationalKpiResolutionBandKey =
  | 'lt-1d'
  | '1-3d'
  | '3-7d'
  | '7-14d'
  | '14-30d'
  | '30d+'

/** Un bucket de Resolución: 1:1 con evolution.buckets (misma posición y start). */
export interface OperationalKpiResolutionBucket {
  start: string
  /** null solo si el bucket es futuro. */
  closedCount: number | null
  /** Días decimales (closed_at − created_at). null sin cierres o futuro. */
  medianDays: number | null
  p75Days: number | null
}

export interface OperationalKpiResolutionBand {
  key: OperationalKpiResolutionBandKey
  fromHours: number
  toHours: number | null
  count: number
}

/**
 * RESOLUCIÓN: duración EXACTA desde el registro hasta la solución de los
 * problemas atribuidos HOY a la coordinación y cerrados en el periodo.
 * Invariantes (validadas en el parser):
 *   buckets[i].closedCount = evolution.buckets[i].solved.total
 *   closedCount = Σ buckets.closedCount = Σ distribution.count
 * El frontend NO recalcula duraciones: solo las presenta.
 */
export interface OperationalKpiResolution {
  semantics: 'closed-in-period-duration-since-created'
  closedCount: number
  medianDays: number | null
  p75Days: number | null
  buckets: OperationalKpiResolutionBucket[]
  distribution: OperationalKpiResolutionBand[]
}
