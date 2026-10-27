import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Prioridad NOVEX de los problemas de una coordinación. Determinística, sin
 * IA y sin `riskScore`: cinco comparaciones en orden fijo.
 *
 * OJO con la frontera de política: el SLA SÍ ordena problemas, y NO decide la
 * integridad de una coordinación —esa la calcula el backend con severidad,
 * acumulación y propagación—. Son dos reglas distintas y no se mezclan.
 */

const SEVERITY_WEIGHT = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
} as const

/** Cuanto mayor, más urgente. `closed` no debería llegar aquí. */
const SLA_WEIGHT = {
  overdue: 3,
  at_risk: 2,
  on_track: 1,
  closed: 0,
} as const

export function severityWeight(severity: CoordinationProblem['severity']): number {
  return SEVERITY_WEIGHT[severity] ?? 0
}

export function slaWeight(slaHealth: CoordinationProblem['slaHealth']): number {
  return slaHealth ? SLA_WEIGHT[slaHealth] : 0
}

/**
 * Orden: severidad, urgencia de SLA, impacto, antigüedad y, por último, id
 * para que el resultado sea estable entre cargas.
 */
export function compareProblemPriority(
  left: CoordinationProblem,
  right: CoordinationProblem,
): number {
  const bySeverity = severityWeight(right.severity) - severityWeight(left.severity)
  if (bySeverity !== 0) return bySeverity

  const bySla = slaWeight(right.slaHealth) - slaWeight(left.slaHealth)
  if (bySla !== 0) return bySla

  const byImpact =
    (right.affectedCoordinationCount ?? 0) - (left.affectedCoordinationCount ?? 0)
  if (byImpact !== 0) return byImpact

  // Lo más antiguo primero: lleva más tiempo sin resolverse.
  const byAge = Date.parse(left.createdAt) - Date.parse(right.createdAt)
  if (!Number.isNaN(byAge) && byAge !== 0) return byAge

  return left.id.localeCompare(right.id)
}

export function sortProblemsByPriority(
  problems: readonly CoordinationProblem[],
): CoordinationProblem[] {
  return [...problems].sort(compareProblemPriority)
}
