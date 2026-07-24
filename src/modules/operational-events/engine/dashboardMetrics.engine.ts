// Capa: motor (engine) — compatibilidad con el cálculo inicial de métricas.
// Delegación al Motor de Inteligencia Operacional (Sprint 3).
// Conserva los nombres exportados usados por selectores previos.

import {
  buildOperationalIntelligence,
  resolveRoomEnvironment,
} from '@/modules/operational-events/engine/operational-intelligence.engine'
import type {
  DashboardMetrics,
  OperationalEvent,
} from '@/modules/operational-events/types/operational-event.types'

/**
 * @deprecated Preferir resolveRoomEnvironment del motor de inteligencia.
 * Se mantiene como alias estable para consumidores existentes.
 */
export function resolveOperationalEnvironment(
  metrics: Pick<
    DashboardMetrics,
    'openCount' | 'monitoringCount' | 'averageRiskScore' | 'criticalCount'
  >,
): DashboardMetrics['environment'] {
  return resolveRoomEnvironment(metrics)
}

/**
 * Calcula DashboardMetrics para un conjunto de eventos.
 * Delega íntegramente en buildOperationalIntelligence.
 */
export function calculateDashboardMetrics(
  events: OperationalEvent[],
  generatedAt: string = new Date().toISOString(),
): DashboardMetrics {
  return buildOperationalIntelligence(events, generatedAt)
}
