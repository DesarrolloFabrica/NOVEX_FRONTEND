// Capa: selectores del Motor de Inteligencia Operacional.
// Responsabilidad: exponer DashboardMetrics y proyecciones derivadas
// para que la UI futura consuma sin recalcular.
//
// Patrón: events → engine → selectors → UI

import { OPERATIONAL_AREAS_CATALOG } from '@/modules/operational-events/data/operational-areas.mock'
import { buildOperationalIntelligence } from '@/modules/operational-events/engine/operational-intelligence.engine'
import type {
  AreaMetricBreakdown,
  CategoryMetricBreakdown,
  ConsolidatedIndicator,
  DashboardMetrics,
  OperationalArea,
  OperationalEvent,
  OperationalTrend,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

/** IDs de áreas globales — no generan eventos propios. */
const GLOBAL_AREA_IDS = new Set(
  OPERATIONAL_AREAS_CATALOG.filter((area) => area.isGlobal).map(
    (area) => area.id,
  ),
)

/** Eventos de origen operativo (excluye área global). */
export function selectOperationalSourceEvents(
  events: OperationalEvent[],
): OperationalEvent[] {
  return events.filter((event) => !GLOBAL_AREA_IDS.has(event.sourceAreaId))
}

/**
 * Eventos visibles según el área enfocada.
 * - Global: todos los de origen operativo.
 * - Operativa: origen o afectación incluye el área.
 */
export function selectFocusedAreaEvents(
  events: OperationalEvent[],
  selectedArea: OperationalArea | undefined,
): OperationalEvent[] {
  if (!selectedArea) return []
  if (selectedArea.isGlobal) {
    return selectOperationalSourceEvents(events)
  }

  return events.filter((event) => {
    if (event.sourceAreaId === selectedArea.id) return true
    return (
      event.interpretation?.affectedAreaIds.includes(selectedArea.id) === true
    )
  })
}

/** Localiza un evento por id. */
export function selectEventById(
  events: OperationalEvent[],
  eventId: string | null,
): OperationalEvent | null {
  if (!eventId) return null
  return events.find((event) => event.id === eventId) ?? null
}

/** Fotografía completa del tablero para el conjunto recibido. */
export function selectDashboardMetrics(
  events: OperationalEvent[],
  generatedAt?: string,
): DashboardMetrics {
  return buildOperationalIntelligence(events, generatedAt)
}

/** Métricas globales (todas las áreas operativas). */
export function selectGlobalDashboardMetrics(
  events: OperationalEvent[],
  generatedAt?: string,
): DashboardMetrics {
  return selectDashboardMetrics(
    selectOperationalSourceEvents(events),
    generatedAt,
  )
}

/** Métricas del área enfocada (o global). */
export function selectFocusedDashboardMetrics(
  events: OperationalEvent[],
  selectedArea: OperationalArea | undefined,
  generatedAt?: string,
): DashboardMetrics {
  return selectDashboardMetrics(
    selectFocusedAreaEvents(events, selectedArea),
    generatedAt,
  )
}

/** Resultado emparejado de un área con sus métricas. */
export interface AreaDashboardEntry {
  area: OperationalArea
  metrics: DashboardMetrics
}

/** Métricas por cada área del catálogo recibido. */
export function selectAllAreasDashboardMetrics(
  events: OperationalEvent[],
  areas: OperationalArea[],
  generatedAt?: string,
): AreaDashboardEntry[] {
  return areas.map((area) => ({
    area,
    metrics: selectFocusedDashboardMetrics(events, area, generatedAt),
  }))
}

// --- Proyecciones sobre DashboardMetrics (sin recalcular el motor) -----------

/** Narrativa ejecutiva ya materializada. */
export function selectExecutiveNarrative(metrics: DashboardMetrics): string {
  return metrics.executiveNarrative
}

/** Estado de sala listo para OmegaRoom. */
export function selectRoomEnvironment(
  metrics: DashboardMetrics,
): DashboardMetrics['environment'] {
  return metrics.environment
}

/** Nivel de riesgo operacional cualitativo. */
export function selectOperationalRiskLevel(
  metrics: DashboardMetrics,
): RiskLevel {
  return metrics.operationalRiskLevel
}

/** Tendencia general. */
export function selectOperationalTrend(
  metrics: DashboardMetrics,
): OperationalTrend {
  return metrics.trend
}

/** Indicadores consolidados. */
export function selectConsolidatedIndicators(
  metrics: DashboardMetrics,
): ConsolidatedIndicator[] {
  return metrics.consolidatedIndicators
}

/** Solo indicadores producidos por el motor (no sugerencias IA). */
export function selectEngineIndicators(
  metrics: DashboardMetrics,
): ConsolidatedIndicator[] {
  return metrics.consolidatedIndicators.filter(
    (indicator) => indicator.source === 'engine',
  )
}

/** Distribución por categoría. */
export function selectCategoryDistribution(
  metrics: DashboardMetrics,
): CategoryMetricBreakdown[] {
  return metrics.byCategory
}

/** Distribución por área. */
export function selectAreaDistribution(
  metrics: DashboardMetrics,
): AreaMetricBreakdown[] {
  return metrics.byArea
}

/** Resumen numérico mínimo para cabeceras / KPIs primarios. */
export function selectDashboardHeadline(metrics: DashboardMetrics): {
  totalEvents: number
  openCount: number
  criticalCount: number
  averageRiskScore: number
  averageImpactInternal: number
  averageImpactExternal: number
  averageImpactStudents: number
  environment: DashboardMetrics['environment']
  trend: OperationalTrend
  operationalRiskLevel: RiskLevel
  executiveNarrative: string
} {
  return {
    totalEvents: metrics.totalEvents,
    openCount: metrics.openCount,
    criticalCount: metrics.criticalCount,
    averageRiskScore: metrics.averageRiskScore,
    averageImpactInternal: metrics.averageImpactInternal,
    averageImpactExternal: metrics.averageImpactExternal,
    averageImpactStudents: metrics.averageImpactStudents,
    environment: metrics.environment,
    trend: metrics.trend,
    operationalRiskLevel: metrics.operationalRiskLevel,
    executiveNarrative: metrics.executiveNarrative,
  }
}
