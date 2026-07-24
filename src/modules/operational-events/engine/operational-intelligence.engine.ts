// Capa: Motor de Inteligencia Operacional (engine).
// Responsabilidad: transformar OperationalEvent + AIInterpretation en
// DashboardMetrics — conocimiento ejecutivo listo para el tablero.
//
// Principios:
// - Funciones puras: mismas entradas => mismas salidas.
// - Sin React, sin IO, sin Gemini.
// - La narrativa ejecutiva es determinista (reglas), no generativa.

import {
  CRITICAL_IMPACT_SEVERITY,
  RISK_SCORE_THRESHOLDS,
} from '@/modules/operational-events/constants/thresholds'
import {
  aggregateByArea,
  aggregateByCategory,
  averageOf,
  isActiveEvent,
  isCriticalInterpretedEvent,
  mapRiskScoreToLevel,
  pickDominantAreaName,
  pickDominantCategoryName,
  withInterpretation,
} from '@/modules/operational-events/engine/aggregations'
import { buildConsolidatedIndicators } from '@/modules/operational-events/engine/consolidatedIndicators'
import { buildExecutiveNarrative } from '@/modules/operational-events/engine/executiveNarrative'
import { resolveOperationalTrend } from '@/modules/operational-events/engine/operationalTrend'
import type {
  DashboardMetrics,
  OperationalEnvironmentStatus,
  OperationalEvent,
} from '@/modules/operational-events/types/operational-event.types'

/**
 * Resuelve el estado general de la sala a partir de métricas parciales.
 *
 * Reglas (prioridad):
 * 1. Sin eventos activos => pending
 * 2. Existe evento crítico activo => critical
 * 3. Riesgo promedio >= umbral critical => critical
 * 4. Riesgo promedio >= umbral attention => attention
 * 5. En otro caso => healthy
 */
export function resolveRoomEnvironment(input: {
  openCount: number
  monitoringCount: number
  averageRiskScore: number
  criticalCount: number
}): OperationalEnvironmentStatus {
  const activeCount = input.openCount + input.monitoringCount
  if (activeCount === 0) return 'pending'
  if (input.criticalCount > 0) return 'critical'
  if (input.averageRiskScore >= RISK_SCORE_THRESHOLDS.critical) {
    return 'critical'
  }
  if (input.averageRiskScore >= RISK_SCORE_THRESHOLDS.attention) {
    return 'attention'
  }
  return 'healthy'
}

/**
 * Punto de entrada del Motor de Inteligencia Operacional.
 * Recibe eventos (con interpretaciones) y produce DashboardMetrics.
 */
export function buildOperationalIntelligence(
  events: OperationalEvent[],
  generatedAt: string = new Date().toISOString(),
): DashboardMetrics {
  const openCount = events.filter((event) => event.status === 'open').length
  const monitoringCount = events.filter(
    (event) => event.status === 'monitoring',
  ).length
  const resolvedCount = events.filter(
    (event) => event.status === 'resolved',
  ).length
  const archivedCount = events.filter(
    (event) => event.status === 'archived',
  ).length

  const interpreted = withInterpretation(events)
  const activeInterpreted = interpreted.filter(isActiveEvent)

  const averageAffectationPercentage = averageOf(
    activeInterpreted.map(
      (event) => event.interpretation.affectationPercentage,
    ),
  )
  const averageRiskScore = averageOf(
    activeInterpreted.map((event) => event.interpretation.riskScore),
  )
  const averageImpactInternal = averageOf(
    activeInterpreted.map((event) => event.interpretation.impactInternal),
  )
  const averageImpactExternal = averageOf(
    activeInterpreted.map((event) => event.interpretation.impactExternal),
  )
  const averageImpactStudents = averageOf(
    activeInterpreted.map((event) => event.interpretation.impactStudents),
  )

  const criticalCount = events.filter(isCriticalInterpretedEvent).length
  const highRiskCount = activeInterpreted.filter(
    (event) =>
      event.interpretation.riskLevel === 'high' ||
      event.interpretation.riskLevel === 'critical' ||
      event.interpretation.impactSeverity === CRITICAL_IMPACT_SEVERITY,
  ).length

  const byCategory = aggregateByCategory(events)
  const byArea = aggregateByArea(events)
  const dominantAreaName = pickDominantAreaName(byArea)
  const dominantCategoryName = pickDominantCategoryName(byCategory)
  const trend = resolveOperationalTrend(events)
  const operationalRiskLevel = mapRiskScoreToLevel(averageRiskScore)

  const environment = resolveRoomEnvironment({
    openCount,
    monitoringCount,
    averageRiskScore,
    criticalCount,
  })

  const consolidatedIndicators = buildConsolidatedIndicators({
    events,
    openCount,
    criticalCount,
    averageRiskScore,
    averageImpactInternal,
    averageImpactExternal,
    averageImpactStudents,
    operationalRiskLevel,
    trend,
  })

  const partial: Omit<
    DashboardMetrics,
    'executiveNarrative' | 'consolidatedIndicators' | 'environment'
  > & {
    consolidatedIndicators: DashboardMetrics['consolidatedIndicators']
    environment: OperationalEnvironmentStatus
  } = {
    totalEvents: events.length,
    openCount,
    monitoringCount,
    resolvedCount,
    archivedCount,
    averageAffectationPercentage,
    averageRiskScore,
    criticalCount,
    highRiskCount,
    averageImpactInternal,
    averageImpactExternal,
    averageImpactStudents,
    operationalRiskLevel,
    trend,
    byCategory,
    byArea,
    dominantAreaName,
    dominantCategoryName,
    consolidatedIndicators,
    environment,
    generatedAt,
  }

  const executiveNarrative = buildExecutiveNarrative(partial)

  return {
    ...partial,
    executiveNarrative,
  }
}

/**
 * Alias semántico: el contrato público del motor hacia el tablero.
 * Equivale a buildOperationalIntelligence.
 */
export function calculateOperationalDashboardMetrics(
  events: OperationalEvent[],
  generatedAt?: string,
): DashboardMetrics {
  return buildOperationalIntelligence(events, generatedAt)
}
