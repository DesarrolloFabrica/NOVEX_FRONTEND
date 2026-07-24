// Capa: motor auxiliar — tendencia operacional determinista.
// Compara el riesgo promedio de la mitad más reciente vs la más antigua.

import {
  TREND_MIN_EVENTS,
  TREND_RISK_DELTA,
} from '@/modules/operational-events/constants/thresholds'
import type {
  OperationalEvent,
  OperationalTrend,
} from '@/modules/operational-events/types/operational-event.types'
import {
  averageOf,
  withInterpretation,
} from '@/modules/operational-events/engine/aggregations'

/**
 * Estima la tendencia general del periodo.
 *
 * Reglas:
 * 1. Menos de TREND_MIN_EVENTS interpretados => insufficient_data
 * 2. Ordena por reportedAt; divide en mitad antigua / reciente
 * 3. Compara average riskScore:
 *    - reciente - antigua >= TREND_RISK_DELTA => deteriorating
 *    - antigua - reciente >= TREND_RISK_DELTA => improving
 *    - en otro caso => stable
 */
export function resolveOperationalTrend(
  events: OperationalEvent[],
): OperationalTrend {
  const interpreted = withInterpretation(events)
  if (interpreted.length < TREND_MIN_EVENTS) return 'insufficient_data'

  const ordered = [...interpreted].sort((a, b) =>
    a.reportedAt.localeCompare(b.reportedAt),
  )
  const mid = Math.floor(ordered.length / 2)
  const older = ordered.slice(0, mid)
  const recent = ordered.slice(mid)

  if (older.length === 0 || recent.length === 0) return 'insufficient_data'

  const olderRisk = averageOf(
    older.map((event) => event.interpretation.riskScore),
  )
  const recentRisk = averageOf(
    recent.map((event) => event.interpretation.riskScore),
  )
  const delta = recentRisk - olderRisk

  if (delta >= TREND_RISK_DELTA) return 'deteriorating'
  if (delta <= -TREND_RISK_DELTA) return 'improving'
  return 'stable'
}
