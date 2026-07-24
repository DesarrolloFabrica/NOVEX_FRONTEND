// Capa: motor auxiliar — agregaciones puras sobre OperationalEvent.
// Sin React, sin IO. Solo transformaciones de colecciones.

import { CRITICAL_IMPACT_SEVERITY } from '@/modules/operational-events/constants/thresholds'
import type {
  AIInterpretation,
  AreaMetricBreakdown,
  CategoryMetricBreakdown,
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import { RISK_LEVEL_THRESHOLDS } from '@/modules/operational-events/constants/thresholds'

/** Eventos que pesan en el tablero vivo. */
export function isActiveEvent(event: OperationalEvent): boolean {
  return event.status === 'open' || event.status === 'monitoring'
}

/** Evento activo cuya interpretación es crítica. */
export function isCriticalInterpretedEvent(event: OperationalEvent): boolean {
  const interpretation = event.interpretation
  if (!interpretation || !isActiveEvent(event)) return false
  return (
    interpretation.impactSeverity === CRITICAL_IMPACT_SEVERITY ||
    interpretation.riskLevel === 'critical'
  )
}

/** Eventos con interpretación vigente. */
export function withInterpretation(
  events: OperationalEvent[],
): Array<OperationalEvent & { interpretation: AIInterpretation }> {
  return events.filter(
    (event): event is OperationalEvent & { interpretation: AIInterpretation } =>
      event.interpretation !== null,
  )
}

/** Promedio entero redondeado; 0 si la lista está vacía. */
export function averageOf(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / values.length)
}

/** Mapea un puntaje de riesgo 0..100 a RiskLevel. */
export function mapRiskScoreToLevel(score: number): RiskLevel {
  if (score >= RISK_LEVEL_THRESHOLDS.critical) return 'critical'
  if (score >= RISK_LEVEL_THRESHOLDS.high) return 'high'
  if (score >= RISK_LEVEL_THRESHOLDS.moderate) return 'moderate'
  return 'low'
}

/** Dimensión de impacto predominante por promedio. */
export type DominantImpactDimension =
  | 'internal'
  | 'external'
  | 'students'
  | 'balanced'

export function resolveDominantImpactDimension(input: {
  averageImpactInternal: number
  averageImpactExternal: number
  averageImpactStudents: number
}): DominantImpactDimension {
  const entries: Array<{ key: DominantImpactDimension; value: number }> = [
    { key: 'internal', value: input.averageImpactInternal },
    { key: 'external', value: input.averageImpactExternal },
    { key: 'students', value: input.averageImpactStudents },
  ]
  entries.sort((a, b) => b.value - a.value)

  const [first, second] = entries
  if (!first || first.value === 0) return 'balanced'
  if (second && first.value - second.value < 5) return 'balanced'
  return first.key
}

/** Distribución por categoría (todos los interpretados + activos/críticos). */
export function aggregateByCategory(
  events: OperationalEvent[],
): CategoryMetricBreakdown[] {
  const map = new Map<string, CategoryMetricBreakdown>()

  for (const event of withInterpretation(events)) {
    const interpretation = event.interpretation
    const current = map.get(interpretation.categoryId) ?? {
      categoryId: interpretation.categoryId,
      categoryName: interpretation.categoryName,
      count: 0,
      activeCount: 0,
      criticalCount: 0,
    }
    current.count += 1
    if (isActiveEvent(event)) current.activeCount += 1
    if (isCriticalInterpretedEvent(event)) current.criticalCount += 1
    map.set(interpretation.categoryId, current)
  }

  return [...map.values()].sort((a, b) => b.count - a.count)
}

/** Distribución por área afectada (o área origen si no hay interpretación). */
export function aggregateByArea(events: OperationalEvent[]): AreaMetricBreakdown[] {
  const map = new Map<
    string,
    {
      areaName: string
      openCount: number
      eventCount: number
      criticalCount: number
      riskTotal: number
      riskSamples: number
    }
  >()

  for (const event of events) {
    const interpretation = event.interpretation
    const areaIds =
      interpretation && interpretation.affectedAreaIds.length > 0
        ? interpretation.affectedAreaIds
        : [event.sourceAreaId]
    const areaNames =
      interpretation && interpretation.affectedAreaNames.length > 0
        ? interpretation.affectedAreaNames
        : [event.sourceAreaName]

    areaIds.forEach((areaId, index) => {
      const areaName = areaNames[index] ?? event.sourceAreaName
      const current = map.get(areaId) ?? {
        areaName,
        openCount: 0,
        eventCount: 0,
        criticalCount: 0,
        riskTotal: 0,
        riskSamples: 0,
      }
      current.eventCount += 1
      if (isActiveEvent(event)) current.openCount += 1
      if (isCriticalInterpretedEvent(event)) current.criticalCount += 1
      if (interpretation) {
        current.riskTotal += interpretation.riskScore
        current.riskSamples += 1
      }
      map.set(areaId, current)
    })
  }

  return [...map.entries()]
    .map(([areaId, value]) => ({
      areaId,
      areaName: value.areaName,
      openCount: value.openCount,
      eventCount: value.eventCount,
      criticalCount: value.criticalCount,
      averageRiskScore:
        value.riskSamples === 0
          ? 0
          : Math.round(value.riskTotal / value.riskSamples),
    }))
    .sort((a, b) => b.openCount - a.openCount || b.eventCount - a.eventCount)
}

/** Nombre del área dominante por eventos activos; null si no hay. */
export function pickDominantAreaName(
  byArea: AreaMetricBreakdown[],
): string | null {
  const dominant = byArea.find((entry) => entry.openCount > 0) ?? byArea[0]
  return dominant?.areaName ?? null
}

/** Nombre de la categoría dominante por volumen; null si no hay. */
export function pickDominantCategoryName(
  byCategory: CategoryMetricBreakdown[],
): string | null {
  return byCategory[0]?.categoryName ?? null
}
