// Capa: motor auxiliar — indicadores consolidados del tablero.
// Combina KPIs del motor con sugerencias IA deduplicadas por código.

import type {
  ConsolidatedIndicator,
  OperationalEvent,
  OperationalTrend,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  isActiveEvent,
  withInterpretation,
} from '@/modules/operational-events/engine/aggregations'

const TREND_VALUE: Record<OperationalTrend, number> = {
  improving: 1,
  stable: 0,
  deteriorating: -1,
  insufficient_data: 0,
}

/**
 * Construye la lista de indicadores listos para el dashboard.
 * Primero los del motor (fuente de verdad agregada); luego sugerencias IA
 * no duplicadas por `code`.
 */
export function buildConsolidatedIndicators(input: {
  events: OperationalEvent[]
  openCount: number
  criticalCount: number
  averageRiskScore: number
  averageImpactInternal: number
  averageImpactExternal: number
  averageImpactStudents: number
  operationalRiskLevel: RiskLevel
  trend: OperationalTrend
}): ConsolidatedIndicator[] {
  const engineIndicators: ConsolidatedIndicator[] = [
    {
      code: 'EVT_TOTAL',
      label: 'Situaciones registradas',
      value: input.events.length,
      unit: 'count',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'EVT_OPEN',
      label: 'Situaciones abiertas',
      value: input.openCount,
      unit: 'count',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'EVT_CRITICAL',
      label: 'Situaciones críticas',
      value: input.criticalCount,
      unit: 'count',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'RISK_SCORE_AVG',
      label: 'Riesgo operacional promedio',
      value: input.averageRiskScore,
      unit: '%',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'IMPACT_INTERNAL_AVG',
      label: 'Impacto interno promedio',
      value: input.averageImpactInternal,
      unit: '%',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'IMPACT_EXTERNAL_AVG',
      label: 'Impacto externo promedio',
      value: input.averageImpactExternal,
      unit: '%',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'IMPACT_STUDENTS_AVG',
      label: 'Impacto estudiantes promedio',
      value: input.averageImpactStudents,
      unit: '%',
      direction: 'higher_is_worse',
      source: 'engine',
    },
    {
      code: 'TREND_SIGNAL',
      label: 'Señal de tendencia',
      value: TREND_VALUE[input.trend],
      unit: 'signal',
      direction: 'higher_is_better',
      source: 'engine',
    },
  ]

  const seen = new Set(engineIndicators.map((indicator) => indicator.code))
  const aiIndicators: ConsolidatedIndicator[] = []

  for (const event of withInterpretation(input.events)) {
    if (!isActiveEvent(event)) continue
    for (const suggested of event.interpretation.suggestedIndicators) {
      if (seen.has(suggested.code)) continue
      seen.add(suggested.code)
      aiIndicators.push({
        code: suggested.code,
        label: suggested.label,
        value: suggested.value,
        unit: suggested.unit,
        direction: suggested.direction,
        source: 'ai_suggested',
      })
    }
  }

  return [...engineIndicators, ...aiIndicators]
}
