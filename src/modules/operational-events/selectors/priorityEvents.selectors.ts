// Capa: selectores — eventos que requieren atención inmediata.
// Ranking de presentación a partir del dominio; no recalcula DashboardMetrics.

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { CRITICAL_IMPACT_SEVERITY } from '@/modules/operational-events/constants/thresholds'

function isActive(event: OperationalEvent): boolean {
  return event.status === 'open' || event.status === 'monitoring'
}

/** Puntaje de prioridad para atención inmediata (mayor = más urgente). */
function priorityScore(event: OperationalEvent): number {
  const interpretation = event.interpretation
  if (!interpretation) return -1

  let score = interpretation.riskScore
  if (
    interpretation.riskLevel === 'critical' ||
    interpretation.impactSeverity === CRITICAL_IMPACT_SEVERITY
  ) {
    score += 100
  } else if (interpretation.riskLevel === 'high') {
    score += 40
  } else if (interpretation.riskLevel === 'moderate') {
    score += 10
  }
  return score
}

/**
 * Eventos activos priorizados para el tablero ejecutivo.
 * El dashboard resume; el Centro de Eventos profundiza.
 */
export function selectPriorityEvents(
  events: OperationalEvent[],
  limit = 5,
): OperationalEvent[] {
  return [...events]
    .filter(isActive)
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, limit)
}
